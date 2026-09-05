import ServiceArea from "../models/ServiceArea.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  validateAnalyticsQuery,
  validateAreaId,
} from "../validations/analytics.validation.js";
import {
  buildAreaReport,
  buildCategoryBreakdown,
  buildMonthlyTrend,
  buildAreaCollectorBreakdown,
  buildAreaComplaintBreakdown,
  buildAreaScheduleSummary,
  describePeriod,
} from "../services/analytics.service.js";
import { EFFICIENCY_WEIGHTS } from "../config/analyticsConfig.js";

// ============================================================================
// FEATURE 16 — AREA-WISE WASTE ANALYTICS (admin)
//
// Three read-only reports for municipal planning:
//
//   GET /api/analytics/overview        platform totals + trend + category mix
//   GET /api/analytics/areas           one metric row per service area
//   GET /api/analytics/areas/:areaId   drill-down into a single area
//
// Every endpoint accepts the same reporting-window filters (from, to,
// category, serviceArea, city) so a filter set chosen on one screen can be
// carried to the next unchanged.
//
// This controller performs no database work of its own — it validates input,
// delegates to analytics.service.js, and shapes the HTTP response.
// ============================================================================

// Metadata attached to every response so the numbers can be interpreted
// without reading the source. Notably it states, in-band, that quantities are
// resident estimates rather than weighed measurements.
const buildReportMeta = (filters) => ({
  period: describePeriod(filters),
  filters: {
    category: filters.category,
    serviceArea: filters.serviceArea,
    city: filters.city,
  },
  quantityBasis: "resident-estimated",
  quantityUnit: "kg",
  efficiencyWeights: EFFICIENCY_WEIGHTS,
  generatedAt: new Date(),
});

// @route  GET /api/analytics/overview
// @access admin
//
// Headline numbers for the whole platform (or for the filtered subset of
// areas): total waste handled, recycling rate, service efficiency, the waste
// mix by category, a monthly trend line, and the best / worst performing areas.
export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const { isValid, errors, filters } = validateAnalyticsQuery(req.query);

  if (!isValid) {
    return sendError(res, 400, "Invalid analytics filters", errors);
  }

  const { areaDocs, areas, totals } = await buildAreaReport(filters);

  const areaIds = areaDocs.map((area) => area._id);

  // The two extra series are independent of each other, so they run together.
  const [categoryBreakdown, monthlyTrend] = await Promise.all([
    buildCategoryBreakdown(areaIds, filters),
    buildMonthlyTrend(areaIds, filters),
  ]);

  // `areas` is already sorted by the requested key (waste generated, by
  // default), so the leaders are simply the head of the list. Ranking the
  // laggards only makes sense among areas that actually saw requests —
  // an idle area scores zero for want of data, not for want of service.
  const activeAreas = areas.filter((area) => area.actionableRequests > 0);

  return sendSuccess(res, 200, "Analytics overview generated", {
    meta: buildReportMeta(filters),

    totals,

    coverage: {
      totalAreas: areaDocs.length,
      activeAreas: activeAreas.length,
      idleAreas: areaDocs.length - activeAreas.length,
    },

    topAreasByWaste: areas.slice(0, 5),

    lowestEfficiencyAreas: [...activeAreas]
      .sort((a, b) => a.efficiencyScore - b.efficiencyScore)
      .slice(0, 5),

    categoryBreakdown,

    monthlyTrend,
  });
});

// @route  GET /api/analytics/areas
// @access admin
//
// The area comparison table: every service area with its waste generation,
// recycling rate, collection frequency and efficiency score side by side.
export const getAreaAnalytics = asyncHandler(async (req, res) => {
  const { isValid, errors, filters } = validateAnalyticsQuery(req.query);

  if (!isValid) {
    return sendError(res, 400, "Invalid analytics filters", errors);
  }

  const { areas, totals } = await buildAreaReport(filters);

  return sendSuccess(res, 200, "Area analytics generated", {
    meta: {
      ...buildReportMeta(filters),
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
    areas,
    totals,
  });
});

// @route  GET /api/analytics/areas/:areaId
// @access admin
//
// Everything the overview shows, narrowed to one area, plus the detail that
// only makes sense at area level: which collectors worked it, what residents
// complained about, and the weekly calendar behind the observed frequency.
export const getAreaAnalyticsById = asyncHandler(async (req, res) => {
  const { areaId } = req.params;

  const idCheck = validateAreaId(areaId);

  if (!idCheck.isValid) {
    return sendError(res, 400, "Invalid service area ID", idCheck.errors);
  }

  const { isValid, errors, filters } = validateAnalyticsQuery(req.query);

  if (!isValid) {
    return sendError(res, 400, "Invalid analytics filters", errors);
  }

  const area = await ServiceArea.findById(areaId)
    .select("name city district description isActive createdAt")
    .lean();

  if (!area) {
    return sendError(res, 404, "Service area not found");
  }

  // Force the report down to this one area, whatever the query string said,
  // so the path parameter is always authoritative.
  const areaFilters = { ...filters, serviceArea: areaId, city: null };

  const [report, categoryBreakdown, monthlyTrend, collectors, complaints, schedule] =
    await Promise.all([
      buildAreaReport(areaFilters),
      buildCategoryBreakdown([area._id], areaFilters),
      buildMonthlyTrend([area._id], areaFilters),
      buildAreaCollectorBreakdown(area._id, areaFilters),
      buildAreaComplaintBreakdown(area._id, areaFilters),
      buildAreaScheduleSummary(area._id),
    ]);

  // resolveServiceAreas() always returns exactly this area, so the report has
  // exactly one row — but guard anyway rather than index blindly.
  const metrics = report.areas[0] || report.totals;

  return sendSuccess(res, 200, "Service area analytics generated", {
    meta: buildReportMeta(areaFilters),
    area,
    metrics,
    categoryBreakdown,
    monthlyTrend,
    collectors,
    complaints,
    schedule,
  });
});
