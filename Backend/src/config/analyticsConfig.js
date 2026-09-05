// ============================================================================
// FEATURE 16 — AREA-WISE WASTE ANALYTICS : CONFIGURATION
//
// Every tunable number used by the analytics module lives here so the report
// logic itself stays free of magic values. Changing how "service efficiency"
// is scored, or how far back a report reaches by default, is a one-line edit
// in this file — no controller or service code has to be touched.
// ============================================================================

// Waste categories recognised by the platform. Mirrors the enum declared on
// WastePickupRequest / RecyclingRequest.
export const WASTE_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

// Pickup statuses that represent successfully handled waste.
export const PICKUP_SUCCESS_STATUS = "collected";

// Pickup statuses that never count towards demand, because the resident
// withdrew the request before the operation could act on it.
export const PICKUP_EXCLUDED_STATUSES = ["cancelled"];

// Recycling status that represents successfully recycled material.
export const RECYCLING_SUCCESS_STATUS = "completed";

// Recycling statuses excluded from demand for the same reason as above.
export const RECYCLING_EXCLUDED_STATUSES = ["cancelled"];

// Complaint statuses that count as closed-out work.
export const COMPLAINT_RESOLVED_STATUSES = ["Resolved", "Closed"];

// Reporting window used when the admin does not pass ?from / ?to.
export const DEFAULT_PERIOD_DAYS = 180;

// Upper bound on a custom window, to keep a single aggregation bounded.
export const MAX_PERIOD_DAYS = 1095; // ~3 years

// Number of months returned by the monthly trend series.
export const TREND_MONTHS = 6;

// Weights used to combine the three efficiency components into one score.
// They must add up to 1 — see computeEfficiencyScore() in the service.
export const EFFICIENCY_WEIGHTS = {
  // Share of actionable requests that ended in a successful collection.
  fulfillment: 0.5,
  // Share of actionable requests that reached a collector at all.
  assignment: 0.2,
  // Inverse of the complaint rate: fewer complaints, higher score.
  complaintFree: 0.3,
};

// Sortable columns of the per-area report, mapped to the computed field they
// sort on. Restricting this to a whitelist stops arbitrary user input from
// reaching the sort comparator.
export const AREA_SORT_FIELDS = {
  generated: "totalGeneratedKg",
  recycling: "recyclingRate",
  efficiency: "efficiencyScore",
  requests: "totalRequests",
  complaints: "totalComplaints",
  name: "areaName",
};

export const DEFAULT_AREA_SORT = "generated";

// Time helpers shared by the period maths.
export const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const DAYS_PER_WEEK = 7;
