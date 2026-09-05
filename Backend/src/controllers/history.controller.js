import WastePickupRequest from "../models/WastePickupRequest.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// ============================================================================
// FEATURE 14 — COLLECTION HISTORY
// ============================================================================

const WASTE_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

// Terminal / meaningful statuses that belong in a "history" view.
const PICKUP_HISTORY_STATUSES = [
  "collected",
  "failed",
  "cancelled",
];

const RECYCLING_HISTORY_STATUSES = [
  "completed",
  "rejected",
  "cancelled",
];

const paginate = (items, page, limit) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const total = items.length;
  const start = (pageNumber - 1) * limitNumber;
  const pageItems = items.slice(start, start + limitNumber);

  return {
    pageItems,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber) || 1,
    },
  };
};

// Build a { $gte, $lte } date filter (on preferredDate) from optional query
// params. Returns null when neither bound is provided.
const buildDateFilter = (from, to) => {
  const range = {};

  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) {
      range.$gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      // Include the whole "to" day.
      toDate.setHours(23, 59, 59, 999);
      range.$lte = toDate;
    }
  }

  return Object.keys(range).length ? range : null;
};

// @route  GET /api/residents/history
// @access resident
//
// Returns a single, unified collection timeline made of the resident's waste
// pickup requests AND recycling requests. The resident owns a small amount of
// data, so both sets are fetched, normalized to a common shape, merged,
// filtered and paginated in memory — this keeps the two record types perfectly
// sortable against one another by date.
export const getResidentHistory = asyncHandler(async (req, res) => {
  const {
    type, // "pickup" | "recycling" | undefined (both)
    status,
    category,
    from,
    to,
    page = 1,
    limit = 10,
  } = req.query;

  if (type && !["pickup", "recycling"].includes(type)) {
    return sendError(res, 400, "Invalid history type");
  }

  if (category && !WASTE_CATEGORIES.includes(category)) {
    return sendError(res, 400, "Invalid waste category");
  }

  const dateFilter = buildDateFilter(from, to);

  const includePickups = !type || type === "pickup";
  const includeRecycling = !type || type === "recycling";

  const pickupFilter = { resident: req.user._id };
  const recyclingFilter = { resident: req.user._id };

  if (dateFilter) {
    pickupFilter.preferredDate = dateFilter;
    recyclingFilter.preferredDate = dateFilter;
  }

  if (category) {
    pickupFilter["wasteItems.category"] = category;
    recyclingFilter["materials.category"] = category;
  }

  const [pickups, recycling] = await Promise.all([
    includePickups
      ? WastePickupRequest.find(pickupFilter)
          .populate("serviceArea", "name city")
          .populate({
            path: "assignedCollector",
            select: "user vehicleType",
            populate: { path: "user", select: "name" },
          })
          .lean()
      : [],

    includeRecycling
      ? RecyclingRequest.find(recyclingFilter)
          .populate("serviceArea", "name city")
          .populate("partner", "organizationName")
          .lean()
      : [],
  ]);

  // Normalize both record types to a shared history-entry shape.
  const pickupEntries = pickups.map((pickup) => ({
    id: pickup._id,
    type: "pickup",
    status: pickup.status,
    preferredDate: pickup.preferredDate,
    preferredTimeSlot: pickup.preferredTimeSlot,
    categories: (pickup.wasteItems || []).map((item) => item.category),
    items: (pickup.wasteItems || []).map((item) => ({
      category: item.category,
      quantity: item.estimatedQuantity,
    })),
    totalQuantity: (pickup.wasteItems || []).reduce(
      (sum, item) => sum + (item.estimatedQuantity || 0),
      0
    ),
    serviceArea: pickup.serviceArea?.name || null,
    address: pickup.pickupAddress
      ? `${pickup.pickupAddress.street}, ${pickup.pickupAddress.area}, ${pickup.pickupAddress.city}`
      : null,
    handledBy: pickup.assignedCollector?.user?.name || null,
    handledByLabel: "Collector",
    completedAt: pickup.completedAt || null,
    createdAt: pickup.createdAt,
  }));

  const recyclingEntries = recycling.map((request) => ({
    id: request._id,
    type: "recycling",
    status: request.status,
    preferredDate: request.preferredDate,
    preferredTimeSlot: request.preferredTimeSlot,
    categories: (request.materials || []).map((item) => item.category),
    items: (request.materials || []).map((item) => ({
      category: item.category,
      quantity: item.estimatedQuantity,
    })),
    totalQuantity: (request.materials || []).reduce(
      (sum, item) => sum + (item.estimatedQuantity || 0),
      0
    ),
    serviceArea: request.serviceArea?.name || null,
    address: request.pickupAddress
      ? `${request.pickupAddress.street}, ${request.pickupAddress.area}, ${request.pickupAddress.city}`
      : null,
    handledBy: request.partner?.organizationName || null,
    handledByLabel: "Partner",
    rewardPointsEarned: request.rewardPointsEarned || 0,
    completedAt: request.completedAt || null,
    createdAt: request.createdAt,
  }));

  let entries = [...pickupEntries, ...recyclingEntries];

  // Status filter is applied post-merge because the two collections use
  // different status vocabularies.
  if (status) {
    entries = entries.filter((entry) => entry.status === status);
  }

  // Most recent scheduled date first; fall back to creation time.
  entries.sort((a, b) => {
    const dateA = new Date(a.preferredDate || a.createdAt).getTime();
    const dateB = new Date(b.preferredDate || b.createdAt).getTime();
    return dateB - dateA;
  });

  // Summary is computed across the full (filtered) result set, not just the
  // current page, so the header stays accurate while paging.
  const summary = {
    totalRecords: entries.length,
    pickups: entries.filter((entry) => entry.type === "pickup").length,
    recycling: entries.filter((entry) => entry.type === "recycling").length,
    completed: entries.filter((entry) =>
      ["collected", "completed"].includes(entry.status)
    ).length,
    totalQuantityKg: Number(
      entries
        .reduce((sum, entry) => sum + (entry.totalQuantity || 0), 0)
        .toFixed(2)
    ),
    rewardPointsEarned: entries.reduce(
      (sum, entry) => sum + (entry.rewardPointsEarned || 0),
      0
    ),
  };

  const { pageItems, pagination } = paginate(entries, page, limit);

  return sendSuccess(res, 200, "Collection history fetched", {
    history: pageItems,
    summary,
    pagination,
  });
});

// @route  GET /api/collectors/history
// @access collector
//
// A collector's completed work log. Defaults to terminal statuses
// (collected / failed) but a single status can be requested explicitly.
export const getCollectorHistory = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    from,
    to,
    page = 1,
    limit = 10,
  } = req.query;

  const collectorProfile = await CollectorProfile.findOne({
    user: req.user._id,
  });

  if (!collectorProfile) {
    return sendError(res, 404, "Collector profile not found");
  }

  const filter = {
    assignedCollector: collectorProfile._id,
  };

  if (status) {
    if (!PICKUP_HISTORY_STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid history status");
    }
    filter.status = status;
  } else {
    // Default history view: completed + failed tasks.
    filter.status = { $in: ["collected", "failed"] };
  }

  if (category) {
    if (!WASTE_CATEGORIES.includes(category)) {
      return sendError(res, 400, "Invalid waste category");
    }
    filter["wasteItems.category"] = category;
  }

  const dateFilter = buildDateFilter(from, to);
  if (dateFilter) {
    filter.preferredDate = dateFilter;
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const skip = (pageNumber - 1) * limitNumber;

  const [requests, total, collectedCount, failedCount] = await Promise.all([
    WastePickupRequest.find(filter)
      .populate("resident", "name phone")
      .populate("serviceArea", "name city")
      .sort({ completedAt: -1, preferredDate: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    WastePickupRequest.countDocuments(filter),

    WastePickupRequest.countDocuments({
      assignedCollector: collectorProfile._id,
      status: "collected",
    }),

    WastePickupRequest.countDocuments({
      assignedCollector: collectorProfile._id,
      status: "failed",
    }),
  ]);

  const history = requests.map((request) => ({
    id: request._id,
    status: request.status,
    resident: request.resident?.name || "Resident",
    residentPhone: request.resident?.phone || null,
    preferredDate: request.preferredDate,
    preferredTimeSlot: request.preferredTimeSlot,
    serviceArea: request.serviceArea?.name || null,
    address: request.pickupAddress
      ? `${request.pickupAddress.street}, ${request.pickupAddress.area}, ${request.pickupAddress.city}`
      : null,
    items: (request.wasteItems || []).map((item) => ({
      category: item.category,
      quantity: item.estimatedQuantity,
    })),
    totalQuantity: (request.wasteItems || []).reduce(
      (sum, item) => sum + (item.estimatedQuantity || 0),
      0
    ),
    failureReason: request.failureReason || "",
    completedAt: request.completedAt || null,
    createdAt: request.createdAt,
  }));

  return sendSuccess(res, 200, "Collector history fetched", {
    history,
    summary: {
      totalRecords: collectedCount + failedCount,
      collected: collectedCount,
      failed: failedCount,
    },
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber) || 1,
    },
  });
});
