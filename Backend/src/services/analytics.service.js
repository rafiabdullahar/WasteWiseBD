import ServiceArea from "../models/ServiceArea.model.js";
import WastePickupRequest from "../models/WastePickupRequest.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import Complaint from "../models/Complaint.model.js";
import Schedule from "../models/Schedule.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import {
  PICKUP_SUCCESS_STATUS,
  PICKUP_EXCLUDED_STATUSES,
  RECYCLING_SUCCESS_STATUS,
  RECYCLING_EXCLUDED_STATUSES,
  COMPLAINT_RESOLVED_STATUSES,
  EFFICIENCY_WEIGHTS,
  AREA_SORT_FIELDS,
  TREND_MONTHS,
  DAYS_PER_WEEK,
} from "../config/analyticsConfig.js";

// ============================================================================
// FEATURE 16 — AREA-WISE WASTE ANALYTICS : SERVICE LAYER
//
// All read-only aggregation lives here; the controller only translates HTTP
// in and out. Nothing in this module writes to the database.
//
// Two conventions hold throughout:
//
//  1. Quantities are the resident-declared `estimatedQuantity` values. The
//     platform never weighs waste, so every kilogram figure this module
//     produces is an ESTIMATE and is labelled as such in the API response.
//
//  2. The reporting window is applied to when work ACTUALLY HAPPENED:
//     `completedAt` for finished requests, `preferredDate` for those still
//     open. See buildWindowMatch() for why — requests can only ever be
//     scheduled forward, so dating finished work by its scheduled date would
//     hide it from a report that ends today.
// ============================================================================

// ─── Small numeric helpers ────────────────────────────────────────────────────

const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

// Safe percentage: a zero denominator yields 0 rather than NaN/Infinity.
const percentage = (part, whole, digits = 1) =>
  whole > 0 ? round((part / whole) * 100, digits) : 0;

// ─── Aggregation expression builders ──────────────────────────────────────────

/**
 * Build an aggregation expression that sums `estimatedQuantity` across an
 * array field, optionally counting only the items of one waste category.
 *
 * Filtering inside the expression (rather than only in $match) matters: a
 * request can hold several categories, and a category-filtered report must
 * count the matching line items only, not the whole request.
 */
const buildQuantityExpression = (arrayPath, category) => {
  const items = category
    ? {
        $filter: {
          input: { $ifNull: [`$${arrayPath}`, []] },
          as: "item",
          cond: { $eq: ["$$item.category", category] },
        },
      }
    : { $ifNull: [`$${arrayPath}`, []] };

  return {
    $sum: {
      $map: {
        input: items,
        as: "item",
        in: { $ifNull: ["$$item.estimatedQuantity", 0] },
      },
    },
  };
};

// A request counts as "completed" for timing purposes only when it reached the
// success status AND carries a completion timestamp.
const COMPLETED_PICKUP_CONDITION = {
  $and: [
    { $eq: ["$status", PICKUP_SUCCESS_STATUS] },
    { $ne: ["$completedAt", null] },
  ],
};

// ─── Match builders ───────────────────────────────────────────────────────────

/**
 * Decide which reporting window a request belongs to, by WHEN IT ACTUALLY
 * HAPPENED rather than when it was scheduled:
 *
 *   - finished work  -> `completedAt`, the moment it was really done
 *   - everything else -> `preferredDate`, the date it is due to happen
 *
 * This distinction is essential, not cosmetic. Features 3 and 7 reject a
 * preferred date in the past, so every request is necessarily scheduled
 * forward. Dating completed work by `preferredDate` would file a pickup
 * finished today under next week — and a report ending today would then hide
 * work that has already been done.
 *
 * Written as an $or of two plain field comparisons (rather than an $addFields
 * computing one "activity date") so each branch can still use an index instead
 * of forcing a collection scan.
 */
const buildWindowMatch = (filters) => {
  const range = { $gte: filters.startDate, $lte: filters.endDate };

  return {
    $or: [
      { completedAt: range },
      { completedAt: null, preferredDate: range },
    ],
  };
};

// Areas are always resolved first, so every aggregation is constrained by an
// explicit id list. That handles the `serviceArea` and `city` filters with one
// code path and keeps requests pointing at deleted areas out of the report.
const buildPickupMatch = (areaIds, filters) => {
  const match = {
    serviceArea: { $in: areaIds },
    ...buildWindowMatch(filters),
  };

  if (filters.category) {
    match["wasteItems.category"] = filters.category;
  }

  return match;
};

const buildRecyclingMatch = (areaIds, filters) => {
  const match = {
    serviceArea: { $in: areaIds },
    ...buildWindowMatch(filters),
  };

  if (filters.category) {
    match["materials.category"] = filters.category;
  }

  return match;
};

// Complaints carry their own date field (`missedDate`) and are not category
// aware, so a category-filtered report leaves the complaint counters alone.
const buildComplaintMatch = (areaIds, filters) => ({
  serviceArea: { $in: areaIds },
  missedDate: { $gte: filters.startDate, $lte: filters.endDate },
});

// ─── Per-area aggregations ────────────────────────────────────────────────────

const aggregatePickupsByArea = (areaIds, filters) =>
  WastePickupRequest.aggregate([
    { $match: buildPickupMatch(areaIds, filters) },

    // Collapse each request's line items into one number before grouping.
    {
      $addFields: {
        itemQuantity: buildQuantityExpression("wasteItems", filters.category),
      },
    },

    {
      $group: {
        _id: "$serviceArea",

        totalRequests: { $sum: 1 },

        excludedRequests: {
          $sum: {
            $cond: [{ $in: ["$status", PICKUP_EXCLUDED_STATUSES] }, 1, 0],
          },
        },

        collectedRequests: {
          $sum: { $cond: [{ $eq: ["$status", PICKUP_SUCCESS_STATUS] }, 1, 0] },
        },

        failedRequests: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },

        pendingRequests: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },

        // "Reached a collector" — used for the assignment component of the
        // efficiency score.
        assignedRequests: {
          $sum: { $cond: [{ $ne: ["$assignedCollector", null] }, 1, 0] },
        },

        requestedQuantityKg: { $sum: "$itemQuantity" },

        collectedQuantityKg: {
          $sum: {
            $cond: [
              { $eq: ["$status", PICKUP_SUCCESS_STATUS] },
              "$itemQuantity",
              0,
            ],
          },
        },

        // Turnaround is accumulated as a total + a sample count so the mean
        // can be recomputed at any level of aggregation.
        completionMillis: {
          $sum: {
            $cond: [
              COMPLETED_PICKUP_CONDITION,
              { $subtract: ["$completedAt", "$createdAt"] },
              0,
            ],
          },
        },

        completionSamples: {
          $sum: { $cond: [COMPLETED_PICKUP_CONDITION, 1, 0] },
        },
      },
    },
  ]);

const aggregateRecyclingByArea = (areaIds, filters) =>
  RecyclingRequest.aggregate([
    { $match: buildRecyclingMatch(areaIds, filters) },

    {
      $addFields: {
        itemQuantity: buildQuantityExpression("materials", filters.category),
      },
    },

    {
      $group: {
        _id: "$serviceArea",

        totalRequests: { $sum: 1 },

        excludedRequests: {
          $sum: {
            $cond: [{ $in: ["$status", RECYCLING_EXCLUDED_STATUSES] }, 1, 0],
          },
        },

        completedRequests: {
          $sum: {
            $cond: [{ $eq: ["$status", RECYCLING_SUCCESS_STATUS] }, 1, 0],
          },
        },

        requestedQuantityKg: { $sum: "$itemQuantity" },

        recycledQuantityKg: {
          $sum: {
            $cond: [
              { $eq: ["$status", RECYCLING_SUCCESS_STATUS] },
              "$itemQuantity",
              0,
            ],
          },
        },
      },
    },
  ]);

const aggregateComplaintsByArea = (areaIds, filters) =>
  Complaint.aggregate([
    { $match: buildComplaintMatch(areaIds, filters) },
    {
      $group: {
        _id: "$serviceArea",
        totalComplaints: { $sum: 1 },
        resolvedComplaints: {
          $sum: {
            $cond: [{ $in: ["$status", COMPLAINT_RESOLVED_STATUSES] }, 1, 0],
          },
        },
      },
    },
  ]);

// The collection calendar is a standing weekly plan, not dated records, so it
// is counted as-is and never filtered by the reporting window.
const aggregateSchedulesByArea = (areaIds) =>
  Schedule.aggregate([
    { $match: { serviceArea: { $in: areaIds }, isActive: true } },
    { $group: { _id: "$serviceArea", weeklyScheduledCollections: { $sum: 1 } } },
  ]);

// Turn an aggregation result into a Map keyed by its stringified _id, so a
// grouped row can be looked up in O(1) while merging. Used for area ids,
// category names and month buckets alike.
const indexRowsById = (rows) =>
  new Map(rows.map((row) => [String(row._id), row]));

// ─── Derived metrics ──────────────────────────────────────────────────────────

/**
 * Combine the three efficiency components into a single 0-100 score using the
 * configured weights.
 *
 * - fulfillmentRate : collected ÷ actionable requests
 * - assignmentRate  : assigned  ÷ actionable requests
 * - complaintRate   : complaints ÷ actionable requests (capped at 100)
 *
 * The complaint component is inverted, so every input rises with better
 * service and the score stays interpretable as "percentage of ideal".
 */
export const computeEfficiencyScore = ({
  fulfillmentRate,
  assignmentRate,
  complaintRate,
}) => {
  const complaintFreeRate = Math.max(0, 100 - Math.min(complaintRate, 100));

  return round(
    EFFICIENCY_WEIGHTS.fulfillment * fulfillmentRate +
      EFFICIENCY_WEIGHTS.assignment * assignmentRate +
      EFFICIENCY_WEIGHTS.complaintFree * complaintFreeRate,
    1
  );
};

// Zero-filled rows so an area with no activity still appears in the report
// instead of vanishing — a silent area is itself a finding for the admin.
const EMPTY_PICKUP_ROW = {
  totalRequests: 0,
  excludedRequests: 0,
  collectedRequests: 0,
  failedRequests: 0,
  pendingRequests: 0,
  assignedRequests: 0,
  requestedQuantityKg: 0,
  collectedQuantityKg: 0,
  completionMillis: 0,
  completionSamples: 0,
};

const EMPTY_RECYCLING_ROW = {
  totalRequests: 0,
  excludedRequests: 0,
  completedRequests: 0,
  requestedQuantityKg: 0,
  recycledQuantityKg: 0,
};

const EMPTY_COMPLAINT_ROW = {
  totalComplaints: 0,
  resolvedComplaints: 0,
};

/**
 * Compute every derived metric for one area (or for the platform total) from
 * the raw counters. Kept separate from the aggregation so the same maths can
 * be reused for a single row and for the summed totals — which is why totals
 * are recomputed from summed counters rather than averaged from row rates.
 */
const deriveMetrics = (raw, periodDays) => {
  const weeks = Math.max(periodDays / DAYS_PER_WEEK, 1);

  // Cancelled requests never reached the operation, so they are excluded from
  // the denominator of every service-quality rate.
  const actionablePickups = Math.max(
    raw.pickupTotalRequests - raw.pickupExcludedRequests,
    0
  );

  const actionableRecycling = Math.max(
    raw.recyclingTotalRequests - raw.recyclingExcludedRequests,
    0
  );

  const totalGeneratedKg = raw.collectedQuantityKg + raw.recycledQuantityKg;

  const fulfillmentRate = percentage(raw.collectedRequests, actionablePickups);
  const assignmentRate = percentage(raw.assignedRequests, actionablePickups);
  const failureRate = percentage(raw.failedRequests, actionablePickups);
  const complaintRate = percentage(raw.totalComplaints, actionablePickups);

  return {
    // ── Waste generation ──
    requestedQuantityKg: round(raw.requestedQuantityKg),
    collectedQuantityKg: round(raw.collectedQuantityKg),
    recycledQuantityKg: round(raw.recycledQuantityKg),
    totalGeneratedKg: round(totalGeneratedKg),

    // ── Recycling ──
    recyclingRate: percentage(raw.recycledQuantityKg, totalGeneratedKg),
    recyclingRequests: raw.recyclingTotalRequests,
    completedRecyclingRequests: raw.completedRecyclingRequests,
    recyclingCompletionRate: percentage(
      raw.completedRecyclingRequests,
      actionableRecycling
    ),

    // ── Collection frequency ──
    // Two independent readings: what the calendar promises, and what actually
    // happened. They are reported side by side, never divided into each other,
    // because on-demand pickups and scheduled routes are different things.
    scheduledCollectionsPerWeek: raw.weeklyScheduledCollections,
    actualCollectionsPerWeek: round(raw.collectedRequests / weeks, 2),

    // ── Service efficiency ──
    totalRequests: raw.pickupTotalRequests,
    actionableRequests: actionablePickups,
    collectedRequests: raw.collectedRequests,
    failedRequests: raw.failedRequests,
    pendingRequests: raw.pendingRequests,
    fulfillmentRate,
    assignmentRate,
    failureRate,
    avgCompletionHours: raw.completionSamples
      ? round(raw.completionMillis / raw.completionSamples / (1000 * 60 * 60), 1)
      : 0,

    // ── Complaints ──
    totalComplaints: raw.totalComplaints,
    resolvedComplaints: raw.resolvedComplaints,
    complaintRate,
    complaintResolutionRate: percentage(
      raw.resolvedComplaints,
      raw.totalComplaints
    ),

    // Flags whether this row has enough data for its rates to mean anything.
    // The UI uses it to render "—" instead of a misleading 0%.
    hasActivity: actionablePickups > 0,

    // An area with no requests has no service quality to measure. Scoring it
    // would hand it 30 points for "having no complaints", ranking a dormant
    // area above a genuinely struggling one — so the score is null instead.
    efficiencyScore:
      actionablePickups > 0
        ? computeEfficiencyScore({
            fulfillmentRate,
            assignmentRate,
            complaintRate,
          })
        : null,
  };
};

// Flatten the four per-area aggregation rows into the single counter bag that
// deriveMetrics() consumes.
const collectRawCounters = ({ pickup, recycling, complaint, schedule }) => ({
  pickupTotalRequests: pickup.totalRequests,
  pickupExcludedRequests: pickup.excludedRequests,
  collectedRequests: pickup.collectedRequests,
  failedRequests: pickup.failedRequests,
  pendingRequests: pickup.pendingRequests,
  assignedRequests: pickup.assignedRequests,
  requestedQuantityKg: pickup.requestedQuantityKg,
  collectedQuantityKg: pickup.collectedQuantityKg,
  completionMillis: pickup.completionMillis,
  completionSamples: pickup.completionSamples,

  recyclingTotalRequests: recycling.totalRequests,
  recyclingExcludedRequests: recycling.excludedRequests,
  completedRecyclingRequests: recycling.completedRequests,
  recycledQuantityKg: recycling.recycledQuantityKg,

  totalComplaints: complaint.totalComplaints,
  resolvedComplaints: complaint.resolvedComplaints,

  weeklyScheduledCollections: schedule,
});

// Element-wise addition of two counter bags, used to build platform totals.
const addCounters = (accumulator, counters) => {
  Object.keys(counters).forEach((key) => {
    accumulator[key] = (accumulator[key] || 0) + counters[key];
  });

  return accumulator;
};

// ─── Service-area resolution ──────────────────────────────────────────────────

/**
 * Resolve the set of service areas a report covers. Inactive (soft-deleted)
 * areas are included on purpose: their historical waste still happened and
 * excluding it would make past periods shrink over time.
 */
export const resolveServiceAreas = async (filters) => {
  const areaFilter = {};

  if (filters.serviceArea) {
    areaFilter._id = filters.serviceArea;
  }

  if (filters.city) {
    // Anchored, case-insensitive exact-ish match on city name.
    areaFilter.city = new RegExp(
      `^${filters.city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );
  }

  return ServiceArea.find(areaFilter)
    .select("name city district isActive")
    .sort({ name: 1 })
    .lean();
};

// ─── Public: the per-area report ──────────────────────────────────────────────

/**
 * The core of Feature 16: one metric row per service area, plus platform
 * totals computed from the same counters.
 *
 * @param {object} filters - normalised output of validateAnalyticsQuery()
 * @returns {Promise<{ areas: object[], totals: object, areaDocs: object[] }>}
 */
export const buildAreaReport = async (filters) => {
  const areaDocs = await resolveServiceAreas(filters);

  // No areas match the filter — return an empty, well-formed report rather
  // than running four pointless aggregations.
  if (areaDocs.length === 0) {
    return {
      areaDocs: [],
      areas: [],
      totals: deriveMetrics(
        collectRawCounters({
          pickup: EMPTY_PICKUP_ROW,
          recycling: EMPTY_RECYCLING_ROW,
          complaint: EMPTY_COMPLAINT_ROW,
          schedule: 0,
        }),
        filters.periodDays
      ),
    };
  }

  const areaIds = areaDocs.map((area) => area._id);

  const [pickupRows, recyclingRows, complaintRows, scheduleRows] =
    await Promise.all([
      aggregatePickupsByArea(areaIds, filters),
      aggregateRecyclingByArea(areaIds, filters),
      aggregateComplaintsByArea(areaIds, filters),
      aggregateSchedulesByArea(areaIds),
    ]);

  const pickupMap = indexRowsById(pickupRows);
  const recyclingMap = indexRowsById(recyclingRows);
  const complaintMap = indexRowsById(complaintRows);
  const scheduleMap = indexRowsById(scheduleRows);

  const totalCounters = {};

  const areas = areaDocs.map((area) => {
    const key = String(area._id);

    const counters = collectRawCounters({
      pickup: pickupMap.get(key) || EMPTY_PICKUP_ROW,
      recycling: recyclingMap.get(key) || EMPTY_RECYCLING_ROW,
      complaint: complaintMap.get(key) || EMPTY_COMPLAINT_ROW,
      schedule: scheduleMap.get(key)?.weeklyScheduledCollections || 0,
    });

    addCounters(totalCounters, counters);

    return {
      areaId: area._id,
      areaName: area.name,
      city: area.city,
      district: area.district,
      isActive: area.isActive,
      ...deriveMetrics(counters, filters.periodDays),
    };
  });

  // Totals are derived from summed counters, not from averaged rates — an
  // average of percentages would weight a 2-request area like a 2000-request
  // one and misreport the platform figure.
  const totals = deriveMetrics(totalCounters, filters.periodDays);

  // Share of the platform's waste attributable to each area.
  const areasWithShare = areas.map((area) => ({
    ...area,
    shareOfTotalWaste: percentage(area.totalGeneratedKg, totals.totalGeneratedKg),
  }));

  return { areaDocs, areas: sortAreas(areasWithShare, filters), totals };
};

// Sort rows by a whitelisted computed field; string fields compare
// alphabetically, numeric fields numerically.
//
// Rows carrying a null metric (an area with no measurable activity) always
// sink to the bottom, in either direction — otherwise "worst efficiency first"
// would be led by areas that simply have no data.
const sortAreas = (areas, filters) => {
  const field = AREA_SORT_FIELDS[filters.sortBy];
  const direction = filters.sortOrder === "asc" ? 1 : -1;

  return [...areas].sort((a, b) => {
    const left = a[field];
    const right = b[field];

    const leftIsNull = left === null || left === undefined;
    const rightIsNull = right === null || right === undefined;

    if (leftIsNull || rightIsNull) {
      if (leftIsNull && rightIsNull) return 0;
      return leftIsNull ? 1 : -1;
    }

    if (typeof left === "string" || typeof right === "string") {
      return String(left).localeCompare(String(right)) * direction;
    }

    return (left - right) * direction;
  });
};

// ─── Public: category breakdown ───────────────────────────────────────────────

/**
 * Waste split by category across the selected areas: how much was collected as
 * general waste, how much was recycled, and the resulting per-category
 * recycling rate.
 */
export const buildCategoryBreakdown = async (areaIds, filters) => {
  if (areaIds.length === 0) return [];

  const [pickupRows, recyclingRows] = await Promise.all([
    WastePickupRequest.aggregate([
      { $match: buildPickupMatch(areaIds, filters) },
      { $unwind: "$wasteItems" },

      // After $unwind each document is a single line item, so a category
      // filter must be re-applied here to drop the sibling items.
      ...(filters.category
        ? [{ $match: { "wasteItems.category": filters.category } }]
        : []),

      {
        $group: {
          _id: "$wasteItems.category",
          requestedQuantityKg: { $sum: "$wasteItems.estimatedQuantity" },
          collectedQuantityKg: {
            $sum: {
              $cond: [
                { $eq: ["$status", PICKUP_SUCCESS_STATUS] },
                "$wasteItems.estimatedQuantity",
                0,
              ],
            },
          },
          lineItems: { $sum: 1 },
        },
      },
    ]),

    RecyclingRequest.aggregate([
      { $match: buildRecyclingMatch(areaIds, filters) },
      { $unwind: "$materials" },

      ...(filters.category
        ? [{ $match: { "materials.category": filters.category } }]
        : []),

      {
        $group: {
          _id: "$materials.category",
          requestedQuantityKg: { $sum: "$materials.estimatedQuantity" },
          recycledQuantityKg: {
            $sum: {
              $cond: [
                { $eq: ["$status", RECYCLING_SUCCESS_STATUS] },
                "$materials.estimatedQuantity",
                0,
              ],
            },
          },
          lineItems: { $sum: 1 },
        },
      },
    ]),
  ]);

  const pickupMap = indexRowsById(pickupRows);
  const recyclingMap = indexRowsById(recyclingRows);

  // Union of the categories that actually appear on either side.
  const categories = [
    ...new Set([...pickupMap.keys(), ...recyclingMap.keys()]),
  ];

  const rows = categories.map((category) => {
    const pickup = pickupMap.get(category);
    const recycling = recyclingMap.get(category);

    const collectedQuantityKg = pickup?.collectedQuantityKg || 0;
    const recycledQuantityKg = recycling?.recycledQuantityKg || 0;
    const totalKg = collectedQuantityKg + recycledQuantityKg;

    return {
      category,
      requestedQuantityKg: round(
        (pickup?.requestedQuantityKg || 0) +
          (recycling?.requestedQuantityKg || 0)
      ),
      collectedQuantityKg: round(collectedQuantityKg),
      recycledQuantityKg: round(recycledQuantityKg),
      totalKg: round(totalKg),
      recyclingRate: percentage(recycledQuantityKg, totalKg),
      lineItems: (pickup?.lineItems || 0) + (recycling?.lineItems || 0),
    };
  });

  const grandTotal = rows.reduce((sum, row) => sum + row.totalKg, 0);

  return rows
    .map((row) => ({
      ...row,
      shareOfTotal: percentage(row.totalKg, grandTotal),
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
};

// ─── Public: monthly trend ────────────────────────────────────────────────────

// Bucket key helper: "YYYY-MM" in UTC, matching $dateToString below.
const monthKey = (date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

/**
 * Month-by-month collected and recycled tonnage. Buckets with no activity are
 * emitted as zeros so the series is continuous and chart-ready.
 */
export const buildMonthlyTrend = async (areaIds, filters) => {
  if (areaIds.length === 0) return [];

  const [pickupRows, recyclingRows] = await Promise.all([
    WastePickupRequest.aggregate([
      {
        $match: {
          ...buildPickupMatch(areaIds, filters),
          status: PICKUP_SUCCESS_STATUS,
        },
      },
      {
        $addFields: {
          itemQuantity: buildQuantityExpression("wasteItems", filters.category),
        },
      },
      {
        $group: {
          _id: {
            // Both trend pipelines are already narrowed to successful
            // records, so they bucket by the date the waste was actually
            // handled. $ifNull keeps any legacy record that never received a
            // completion timestamp from collapsing into a null bucket.
            $dateToString: {
              format: "%Y-%m",
              date: { $ifNull: ["$completedAt", "$preferredDate"] },
            },
          },
          collections: { $sum: 1 },
          collectedQuantityKg: { $sum: "$itemQuantity" },
        },
      },
    ]),

    RecyclingRequest.aggregate([
      {
        $match: {
          ...buildRecyclingMatch(areaIds, filters),
          status: RECYCLING_SUCCESS_STATUS,
        },
      },
      {
        $addFields: {
          itemQuantity: buildQuantityExpression("materials", filters.category),
        },
      },
      {
        $group: {
          _id: {
            // Both trend pipelines are already narrowed to successful
            // records, so they bucket by the date the waste was actually
            // handled. $ifNull keeps any legacy record that never received a
            // completion timestamp from collapsing into a null bucket.
            $dateToString: {
              format: "%Y-%m",
              date: { $ifNull: ["$completedAt", "$preferredDate"] },
            },
          },
          recyclingPickups: { $sum: 1 },
          recycledQuantityKg: { $sum: "$itemQuantity" },
        },
      },
    ]),
  ]);

  const pickupMap = indexRowsById(pickupRows);
  const recyclingMap = indexRowsById(recyclingRows);

  // Walk the reporting window month by month so gaps become explicit zeros.
  const buckets = [];
  const cursor = new Date(
    Date.UTC(
      filters.startDate.getUTCFullYear(),
      filters.startDate.getUTCMonth(),
      1
    )
  );

  while (cursor <= filters.endDate) {
    const key = monthKey(cursor);
    const pickup = pickupMap.get(key);
    const recycling = recyclingMap.get(key);

    const collectedQuantityKg = pickup?.collectedQuantityKg || 0;
    const recycledQuantityKg = recycling?.recycledQuantityKg || 0;
    const totalKg = collectedQuantityKg + recycledQuantityKg;

    buckets.push({
      month: key,
      label: cursor.toLocaleString("en-US", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
      collections: pickup?.collections || 0,
      recyclingPickups: recycling?.recyclingPickups || 0,
      collectedQuantityKg: round(collectedQuantityKg),
      recycledQuantityKg: round(recycledQuantityKg),
      totalKg: round(totalKg),
      recyclingRate: percentage(recycledQuantityKg, totalKg),
    });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  // A long custom window would produce an unreadable series; keep the most
  // recent months only.
  return buckets.slice(-TREND_MONTHS);
};

// ─── Public: per-area drill-down extras ───────────────────────────────────────

/**
 * Collector contribution inside one area: who worked it during the period and
 * how their outcomes compare. Feeds the area drill-down, and complements the
 * platform-wide performance view of Feature 17.
 */
export const buildAreaCollectorBreakdown = async (areaId, filters) => {
  const rows = await WastePickupRequest.aggregate([
    {
      $match: {
        ...buildPickupMatch([areaId], filters),
        assignedCollector: { $ne: null },
      },
    },
    {
      $addFields: {
        itemQuantity: buildQuantityExpression("wasteItems", filters.category),
      },
    },
    {
      $group: {
        _id: "$assignedCollector",
        assignedRequests: { $sum: 1 },
        collectedRequests: {
          $sum: { $cond: [{ $eq: ["$status", PICKUP_SUCCESS_STATUS] }, 1, 0] },
        },
        failedRequests: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
        collectedQuantityKg: {
          $sum: {
            $cond: [
              { $eq: ["$status", PICKUP_SUCCESS_STATUS] },
              "$itemQuantity",
              0,
            ],
          },
        },
      },
    },
    { $sort: { collectedQuantityKg: -1 } },
  ]);

  if (rows.length === 0) return [];

  // Resolve names in one round trip rather than a $lookup, so the collector's
  // User document is populated with the same select rules used elsewhere.
  const profiles = await CollectorProfile.find({
    _id: { $in: rows.map((row) => row._id) },
  })
    .populate("user", "name email phone")
    .select("user employeeId vehicleType")
    .lean();

  const profileMap = new Map(
    profiles.map((profile) => [String(profile._id), profile])
  );

  return rows.map((row) => {
    const profile = profileMap.get(String(row._id));

    return {
      collectorId: row._id,
      name: profile?.user?.name || "Unknown collector",
      employeeId: profile?.employeeId || "",
      vehicleType: profile?.vehicleType || "",
      assignedRequests: row.assignedRequests,
      collectedRequests: row.collectedRequests,
      failedRequests: row.failedRequests,
      collectedQuantityKg: round(row.collectedQuantityKg),
      successRate: percentage(row.collectedRequests, row.assignedRequests),
    };
  });
};

/**
 * Complaint mix inside one area — which kinds of service failure residents
 * report there, which is the qualitative half of "service efficiency".
 */
export const buildAreaComplaintBreakdown = async (areaId, filters) => {
  const rows = await Complaint.aggregate([
    { $match: buildComplaintMatch([areaId], filters) },
    {
      $group: {
        _id: "$category",
        total: { $sum: 1 },
        resolved: {
          $sum: {
            $cond: [{ $in: ["$status", COMPLAINT_RESOLVED_STATUSES] }, 1, 0],
          },
        },
      },
    },
    { $sort: { total: -1 } },
  ]);

  return rows.map((row) => ({
    category: row._id,
    total: row.total,
    resolved: row.resolved,
    resolutionRate: percentage(row.resolved, row.total),
  }));
};

/**
 * The area's standing weekly collection calendar, so the admin can read the
 * observed frequency against the plan that produced it.
 */
export const buildAreaScheduleSummary = async (areaId) => {
  const schedules = await Schedule.find({ serviceArea: areaId, isActive: true })
    .select("dayOfWeek timeSlot wasteCategories")
    .lean();

  return {
    weeklyScheduledCollections: schedules.length,
    schedules,
  };
};

// Average days in a Gregorian month — used only to describe the window length
// in human terms, never in a metric calculation.
const DAYS_PER_MONTH = 30.44;

// Describe the reporting window in the response so a saved or shared report is
// self-explanatory.
export const describePeriod = (filters) => ({
  from: filters.startDate,
  to: filters.endDate,
  days: filters.periodDays,
  weeks: round(filters.periodDays / DAYS_PER_WEEK, 1),
  months: round(filters.periodDays / DAYS_PER_MONTH, 1),
});
