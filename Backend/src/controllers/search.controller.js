import mongoose from "mongoose";
import User from "../models/User.model.js";
import WastePickupRequest, {
  PICKUP_STATUSES,
} from "../models/WastePickupRequest.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import Complaint from "../models/Complaint.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import RecyclingPartner from "../models/RecyclingPartner.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// ============================================================================
// FEATURE 19 — ADVANCED SEARCH & FILTERING (admin)
//
// A single controller giving administrators multi-criteria search across the
// platform's main record types: pickup requests, recycling requests,
// complaints, collectors and recycling partners. Each endpoint supports its
// own relevant mix of date / location / status / category / text filters and
// returns paginated results in the project's standard shape.
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

const RECYCLING_STATUSES = [
  "pending",
  "assigned",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
];

const COMPLAINT_STATUSES = ["Open", "Investigating", "Resolved", "Closed"];

const COMPLAINT_CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
  "Bin Overflow",
  "Other",
];

// Resolve page/limit query params into safe, clamped numbers + a skip offset.
const resolvePaging = (page, limit, defaultLimit = 20) => {
  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number(limit) || defaultLimit, 1),
    100
  );
  return {
    pageNumber,
    limitNumber,
    skip: (pageNumber - 1) * limitNumber,
  };
};

const buildPagination = (total, pageNumber, limitNumber) => ({
  total,
  page: pageNumber,
  limit: limitNumber,
  pages: Math.ceil(total / limitNumber) || 1,
});

// Inclusive { $gte, $lte } range on a date field. Returns null when neither
// bound parses to a valid date.
const buildDateRange = (from, to) => {
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
      toDate.setHours(23, 59, 59, 999);
      range.$lte = toDate;
    }
  }

  return Object.keys(range).length ? range : null;
};

// Escape user text before using it inside a RegExp so filter input can't act
// as a regex injection.
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @route  GET /api/admin/search/pickup-requests
// @access admin
//
// Filters: status, serviceArea (id), category, assigned (true/false),
// from/to (on preferredDate), search (matches resident name/email/phone).
export const searchPickupRequests = asyncHandler(async (req, res) => {
  const {
    status,
    serviceArea,
    category,
    assigned,
    from,
    to,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (status) {
    if (!PICKUP_STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid pickup request status");
    }
    filter.status = status;
  }

  if (serviceArea) {
    if (!mongoose.Types.ObjectId.isValid(serviceArea)) {
      return sendError(res, 400, "Invalid service area ID");
    }
    filter.serviceArea = serviceArea;
  }

  if (category) {
    if (!WASTE_CATEGORIES.includes(category)) {
      return sendError(res, 400, "Invalid waste category");
    }
    filter["wasteItems.category"] = category;
  }

  if (assigned === "true") {
    filter.assignedCollector = { $ne: null };
  } else if (assigned === "false") {
    filter.assignedCollector = null;
  }

  const dateRange = buildDateRange(from, to);
  if (dateRange) {
    filter.preferredDate = dateRange;
  }

  // Free-text search matches the linked resident. Resolve matching users
  // first, then constrain the request query by their ids.
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const residents = await User.find({
      role: "resident",
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).select("_id");

    filter.resident = { $in: residents.map((user) => user._id) };
  }

  const { pageNumber, limitNumber, skip } = resolvePaging(page, limit);

  const [requests, total] = await Promise.all([
    WastePickupRequest.find(filter)
      .populate("resident", "name email phone")
      .populate("serviceArea", "name city district")
      .populate({
        path: "assignedCollector",
        select: "user vehicleType",
        populate: { path: "user", select: "name email" },
      })
      .sort({ preferredDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    WastePickupRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Pickup requests fetched", {
    requests,
    pagination: buildPagination(total, pageNumber, limitNumber),
  });
});

// @route  GET /api/admin/search/recycling-requests
// @access admin
//
// Filters: status, serviceArea (id), partner (id), category,
// from/to (on preferredDate), search (resident name/email/phone).
export const searchRecyclingRequests = asyncHandler(async (req, res) => {
  const {
    status,
    serviceArea,
    partner,
    category,
    from,
    to,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (status) {
    if (!RECYCLING_STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid recycling request status");
    }
    filter.status = status;
  }

  if (serviceArea) {
    if (!mongoose.Types.ObjectId.isValid(serviceArea)) {
      return sendError(res, 400, "Invalid service area ID");
    }
    filter.serviceArea = serviceArea;
  }

  if (partner) {
    if (!mongoose.Types.ObjectId.isValid(partner)) {
      return sendError(res, 400, "Invalid partner ID");
    }
    filter.partner = partner;
  }

  if (category) {
    if (!WASTE_CATEGORIES.includes(category)) {
      return sendError(res, 400, "Invalid waste category");
    }
    filter["materials.category"] = category;
  }

  const dateRange = buildDateRange(from, to);
  if (dateRange) {
    filter.preferredDate = dateRange;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const residents = await User.find({
      role: "resident",
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).select("_id");

    filter.resident = { $in: residents.map((user) => user._id) };
  }

  const { pageNumber, limitNumber, skip } = resolvePaging(page, limit);

  const [requests, total] = await Promise.all([
    RecyclingRequest.find(filter)
      .populate("resident", "name email phone")
      .populate("serviceArea", "name city district")
      .populate("partner", "organizationName")
      .sort({ preferredDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    RecyclingRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Recycling requests fetched", {
    requests,
    pagination: buildPagination(total, pageNumber, limitNumber),
  });
});

// @route  GET /api/admin/search/complaints
// @access admin
//
// Filters: status, category, area (text), from/to (on missedDate),
// search (resident name/email/phone).
export const searchComplaints = asyncHandler(async (req, res) => {
  const {
    status,
    category,
    area,
    from,
    to,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (status) {
    if (!COMPLAINT_STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid complaint status");
    }
    filter.status = status;
  }

  if (category) {
    if (!COMPLAINT_CATEGORIES.includes(category)) {
      return sendError(res, 400, "Invalid complaint category");
    }
    filter.category = category;
  }

  if (area) {
    filter.area = new RegExp(escapeRegex(area), "i");
  }

  const dateRange = buildDateRange(from, to);
  if (dateRange) {
    filter.missedDate = dateRange;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const residents = await User.find({
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).select("_id");

    filter.resident = { $in: residents.map((user) => user._id) };
  }

  const { pageNumber, limitNumber, skip } = resolvePaging(page, limit);

  const [complaints, total] = await Promise.all([
    Complaint.find(filter)
      .populate("resident", "name email phone")
      .sort({ missedDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    Complaint.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Complaints fetched", {
    complaints,
    pagination: buildPagination(total, pageNumber, limitNumber),
  });
});

// @route  GET /api/admin/search/collectors
// @access admin
//
// Filters: serviceArea (id), vehicleType, isAvailable (true/false),
// search (collector name/email/phone). Because the searchable text lives on
// the linked User, text search is resolved against User first.
export const searchCollectors = asyncHandler(async (req, res) => {
  const {
    serviceArea,
    vehicleType,
    isAvailable,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (serviceArea) {
    if (!mongoose.Types.ObjectId.isValid(serviceArea)) {
      return sendError(res, 400, "Invalid service area ID");
    }
    filter.serviceAreas = serviceArea;
  }

  if (vehicleType) {
    filter.vehicleType = vehicleType;
  }

  if (isAvailable === "true") {
    filter.isAvailable = true;
  } else if (isAvailable === "false") {
    filter.isAvailable = false;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    const users = await User.find({
      role: "collector",
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).select("_id");

    filter.user = { $in: users.map((user) => user._id) };
  }

  const { pageNumber, limitNumber, skip } = resolvePaging(page, limit);

  const [collectors, total] = await Promise.all([
    CollectorProfile.find(filter)
      .populate("user", "name email phone isActive")
      .populate("serviceAreas", "name city district")
      .sort({ totalCompleted: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    CollectorProfile.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Collectors fetched", {
    collectors,
    pagination: buildPagination(total, pageNumber, limitNumber),
  });
});

// @route  GET /api/admin/search/partners
// @access admin
//
// Filters: serviceArea (id), organizationType, material (accepted material),
// isVerified (true/false), search (org name / contact email).
export const searchPartners = asyncHandler(async (req, res) => {
  const {
    serviceArea,
    organizationType,
    material,
    isVerified,
    search,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (serviceArea) {
    if (!mongoose.Types.ObjectId.isValid(serviceArea)) {
      return sendError(res, 400, "Invalid service area ID");
    }
    filter.serviceAreas = serviceArea;
  }

  if (organizationType) {
    filter.organizationType = organizationType;
  }

  if (material) {
    if (!WASTE_CATEGORIES.includes(material)) {
      return sendError(res, 400, "Invalid material");
    }
    filter.acceptedMaterials = material;
  }

  if (isVerified === "true") {
    filter.isVerified = true;
  } else if (isVerified === "false") {
    filter.isVerified = false;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ organizationName: regex }, { contactEmail: regex }];
  }

  const { pageNumber, limitNumber, skip } = resolvePaging(page, limit);

  const [partners, total] = await Promise.all([
    RecyclingPartner.find(filter)
      .populate("user", "name email phone isActive")
      .populate("serviceAreas", "name city district")
      .sort({ totalRequestsHandled: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(),

    RecyclingPartner.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Partners fetched", {
    partners,
    pagination: buildPagination(total, pageNumber, limitNumber),
  });
});
