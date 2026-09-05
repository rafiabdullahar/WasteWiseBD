import mongoose from "mongoose";
import {
  WASTE_CATEGORIES,
  DEFAULT_PERIOD_DAYS,
  MAX_PERIOD_DAYS,
  AREA_SORT_FIELDS,
  DEFAULT_AREA_SORT,
  MS_PER_DAY,
} from "../config/analyticsConfig.js";

// ============================================================================
// FEATURE 16 — AREA-WISE WASTE ANALYTICS : QUERY VALIDATION
//
// Analytics endpoints take no request body — everything arrives as query
// string parameters. This module is the single place where that untrusted
// input is validated and normalised into the typed `filters` object the
// service layer consumes, so no controller ever hands raw req.query to a
// database aggregation.
// ============================================================================

// Parse a date-only or ISO string into a Date, or null when unusable.
const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Validate and normalise the shared analytics query parameters.
 *
 * Accepted parameters:
 *   from        - ISO date, start of the reporting window (inclusive)
 *   to          - ISO date, end of the reporting window (inclusive)
 *   category    - one waste category to narrow every metric to
 *   serviceArea - ObjectId, restricts the report to a single area
 *   city        - free text, restricts the report to areas in that city
 *   sortBy      - key of AREA_SORT_FIELDS
 *   sortOrder   - "asc" | "desc"
 *
 * @returns {{ isValid: boolean, errors: object, filters: object }}
 */
export const validateAnalyticsQuery = (query = {}) => {
  const errors = {};

  const {
    from,
    to,
    category,
    serviceArea,
    city,
    sortBy = DEFAULT_AREA_SORT,
    sortOrder = "desc",
  } = query;

  // ─── Reporting window ─────────────────────────────────────────────────────
  // Both bounds are optional. When omitted we fall back to the configured
  // default window ending today, so a bare request still returns a report.
  let endDate = parseDate(to);

  if (to && !endDate) {
    errors.to = "Invalid 'to' date";
  }

  let startDate = parseDate(from);

  if (from && !startDate) {
    errors.from = "Invalid 'from' date";
  }

  if (!endDate) {
    endDate = new Date();
  }

  // Always cover the whole final day, otherwise records timestamped later
  // than 00:00 on the end date would be silently dropped.
  endDate.setHours(23, 59, 59, 999);

  if (!startDate) {
    // DEFAULT_PERIOD_DAYS - 1, because both endpoints are inclusive: a 180-day
    // window ends today and starts 179 days earlier, spanning 180 calendar days.
    startDate = new Date(
      endDate.getTime() - (DEFAULT_PERIOD_DAYS - 1) * MS_PER_DAY
    );
  }

  startDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    errors.from = "'from' date cannot be after the 'to' date";
  }

  const periodDays = Math.ceil((endDate - startDate) / MS_PER_DAY);

  if (periodDays > MAX_PERIOD_DAYS) {
    errors.from = `Reporting window cannot exceed ${MAX_PERIOD_DAYS} days`;
  }

  // ─── Waste category ───────────────────────────────────────────────────────
  if (category && !WASTE_CATEGORIES.includes(category)) {
    errors.category = `Category must be one of: ${WASTE_CATEGORIES.join(", ")}`;
  }

  // ─── Service area ─────────────────────────────────────────────────────────
  if (serviceArea && !mongoose.Types.ObjectId.isValid(serviceArea)) {
    errors.serviceArea = "Invalid service area ID";
  }

  // ─── Sorting ──────────────────────────────────────────────────────────────
  if (!Object.keys(AREA_SORT_FIELDS).includes(sortBy)) {
    errors.sortBy = `sortBy must be one of: ${Object.keys(AREA_SORT_FIELDS).join(
      ", "
    )}`;
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    errors.sortOrder = "sortOrder must be 'asc' or 'desc'";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    filters: {
      startDate,
      endDate,
      periodDays: Math.max(periodDays, 1),
      category: category || null,
      serviceArea: serviceArea || null,
      city: city?.trim() || null,
      sortBy,
      sortOrder,
    },
  };
};

/**
 * Validate the :areaId path parameter of the per-area drill-down endpoint.
 *
 * @returns {{ isValid: boolean, errors: object }}
 */
export const validateAreaId = (areaId) => {
  const errors = {};

  if (!areaId || !mongoose.Types.ObjectId.isValid(areaId)) {
    errors.areaId = "Invalid service area ID";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
