import mongoose from "mongoose";
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  WASTE_CATEGORIES,
  MAX_STOPS_PER_ROUTE,
  MAX_ROUTE_NAME_LENGTH,
  MAX_ROUTE_DESCRIPTION_LENGTH,
  MAX_STOP_LABEL_LENGTH,
  ROUTE_SORT_FIELDS,
  DEFAULT_ROUTE_SORT,
} from "../config/routeConfig.js";

// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT : VALIDATION
//
// Returns the project's standard { isValid, errors } shape. The list
// validator additionally returns a normalised `filters` object, so no
// controller ever hands raw req.query to a database query.
// ============================================================================

// Validate a stop array shared by the create, update and reorder paths.
// `errors` is mutated in place with dotted keys, matching how
// pickupRequest.validation.js reports per-item problems.
const validateStops = (stops, errors) => {
  if (stops === undefined) return;

  if (!Array.isArray(stops)) {
    errors.stops = "Stops must be an array";
    return;
  }

  if (stops.length > MAX_STOPS_PER_ROUTE) {
    errors.stops = `A route cannot have more than ${MAX_STOPS_PER_ROUTE} stops`;
    return;
  }

  const seenLabels = new Set();

  stops.forEach((stop, index) => {
    const label = String(stop?.label || "").trim();

    if (!label) {
      errors[`stops[${index}].label`] = "Stop label is required";
    } else if (label.length > MAX_STOP_LABEL_LENGTH) {
      errors[`stops[${index}].label`] =
        `Stop label cannot exceed ${MAX_STOP_LABEL_LENGTH} characters`;
    } else {
      // Duplicate labels make a driver's stop list ambiguous.
      const key = label.toLowerCase();

      if (seenLabels.has(key)) {
        errors[`stops[${index}].label`] =
          "Duplicate stop labels are not allowed on one route";
      } else {
        seenLabels.add(key);
      }
    }

    // `sequence` is optional on input: the service renumbers stops densely
    // from their array order. When supplied it must still be a sane number.
    if (stop?.sequence !== undefined) {
      const sequence = Number(stop.sequence);

      if (!Number.isInteger(sequence) || sequence < 1) {
        errors[`stops[${index}].sequence`] =
          "Stop sequence must be a positive whole number";
      }
    }
  });
};

const validateCategories = (wasteCategories, errors) => {
  if (wasteCategories === undefined) return;

  if (!Array.isArray(wasteCategories)) {
    errors.wasteCategories = "wasteCategories must be an array";
    return;
  }

  const invalid = wasteCategories.filter(
    (category) => !WASTE_CATEGORIES.includes(category)
  );

  if (invalid.length > 0) {
    errors.wasteCategories = `Invalid categories: ${invalid.join(", ")}`;
  }
};

const validateDescription = (routeDescription, errors) => {
  if (routeDescription === undefined) return;

  if (String(routeDescription).trim().length > MAX_ROUTE_DESCRIPTION_LENGTH) {
    errors.routeDescription =
      `Route description cannot exceed ${MAX_ROUTE_DESCRIPTION_LENGTH} characters`;
  }
};

/**
 * Validate the body of POST /api/routes.
 */
export const validateCreateRoute = (body = {}) => {
  const errors = {};

  const {
    name,
    serviceArea,
    dayOfWeek,
    timeSlot,
    wasteCategories,
    stops,
    routeDescription,
    notes,
  } = body;

  if (!name || !String(name).trim()) {
    errors.name = "Route name is required";
  } else if (String(name).trim().length > MAX_ROUTE_NAME_LENGTH) {
    errors.name = `Route name cannot exceed ${MAX_ROUTE_NAME_LENGTH} characters`;
  }

  if (!serviceArea || !mongoose.Types.ObjectId.isValid(serviceArea)) {
    errors.serviceArea = "A valid service area is required";
  }

  if (!dayOfWeek || !DAYS_OF_WEEK.includes(dayOfWeek)) {
    errors.dayOfWeek = `Day of week must be one of: ${DAYS_OF_WEEK.join(", ")}`;
  }

  if (timeSlot !== undefined && !TIME_SLOTS.includes(timeSlot)) {
    errors.timeSlot = `Time slot must be one of: ${TIME_SLOTS.join(", ")}`;
  }

  validateCategories(wasteCategories, errors);
  validateStops(stops, errors);
  validateDescription(routeDescription, errors);

  if (notes !== undefined && String(notes).trim().length > 500) {
    errors.notes = "Notes cannot exceed 500 characters";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate the body of PUT /api/routes/:id. Every field is optional, but any
 * field that is present must still be valid.
 */
export const validateUpdateRoute = (body = {}) => {
  const errors = {};

  const {
    name,
    dayOfWeek,
    timeSlot,
    wasteCategories,
    stops,
    routeDescription,
    notes,
    isActive,
  } = body;

  if (name !== undefined) {
    if (!String(name).trim()) {
      errors.name = "Route name cannot be empty";
    } else if (String(name).trim().length > MAX_ROUTE_NAME_LENGTH) {
      errors.name = `Route name cannot exceed ${MAX_ROUTE_NAME_LENGTH} characters`;
    }
  }

  if (dayOfWeek !== undefined && !DAYS_OF_WEEK.includes(dayOfWeek)) {
    errors.dayOfWeek = `Day of week must be one of: ${DAYS_OF_WEEK.join(", ")}`;
  }

  if (timeSlot !== undefined && !TIME_SLOTS.includes(timeSlot)) {
    errors.timeSlot = `Time slot must be one of: ${TIME_SLOTS.join(", ")}`;
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    errors.isActive = "isActive must be true or false";
  }

  validateCategories(wasteCategories, errors);
  validateStops(stops, errors);
  validateDescription(routeDescription, errors);

  if (notes !== undefined && String(notes).trim().length > 500) {
    errors.notes = "Notes cannot exceed 500 characters";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate PATCH /api/routes/:id/stops, which replaces the whole stop list.
 */
export const validateStopList = (body = {}) => {
  const errors = {};

  if (!Array.isArray(body.stops)) {
    errors.stops = "Stops must be an array";
    return { isValid: false, errors };
  }

  validateStops(body.stops, errors);

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate PATCH /api/routes/:id/assign.
 *
 * `collectorId: null` is meaningful — it unassigns the route and hands it back
 * to the coverage report as a gap.
 */
export const validateAssignRoute = (body = {}) => {
  const errors = {};

  const { collectorId } = body;

  if (
    collectorId !== null &&
    (!collectorId || !mongoose.Types.ObjectId.isValid(collectorId))
  ) {
    errors.collectorId =
      "A valid collector ID is required, or null to unassign the route";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

/**
 * Validate and normalise the query string of GET /api/routes.
 */
export const validateRouteQuery = (query = {}) => {
  const errors = {};

  const {
    serviceArea,
    collector,
    dayOfWeek,
    timeSlot,
    isActive,
    assigned,
    search,
    page = 1,
    limit = 20,
    sortBy = DEFAULT_ROUTE_SORT,
    sortOrder = "desc",
  } = query;

  if (serviceArea && !mongoose.Types.ObjectId.isValid(serviceArea)) {
    errors.serviceArea = "Invalid service area ID";
  }

  if (collector && !mongoose.Types.ObjectId.isValid(collector)) {
    errors.collector = "Invalid collector ID";
  }

  if (dayOfWeek && !DAYS_OF_WEEK.includes(dayOfWeek)) {
    errors.dayOfWeek = `Day of week must be one of: ${DAYS_OF_WEEK.join(", ")}`;
  }

  if (timeSlot && !TIME_SLOTS.includes(timeSlot)) {
    errors.timeSlot = `Time slot must be one of: ${TIME_SLOTS.join(", ")}`;
  }

  if (!Object.keys(ROUTE_SORT_FIELDS).includes(sortBy)) {
    errors.sortBy = `sortBy must be one of: ${Object.keys(ROUTE_SORT_FIELDS).join(
      ", "
    )}`;
  }

  if (!["asc", "desc"].includes(sortOrder)) {
    errors.sortOrder = "sortOrder must be 'asc' or 'desc'";
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    filters: {
      serviceArea: serviceArea || null,
      collector: collector || null,
      dayOfWeek: dayOfWeek || null,
      timeSlot: timeSlot || null,
      // Tri-state: undefined means "either".
      isActive: isActive === "true" ? true : isActive === "false" ? false : null,
      assigned: assigned === "true" ? true : assigned === "false" ? false : null,
      search: search?.trim() || null,
      sortBy,
      sortOrder,
      pageNumber,
      limitNumber,
      skip: (pageNumber - 1) * limitNumber,
    },
  };
};

/**
 * Shared ObjectId guard for :id / :routeId path parameters.
 */
export const validateRouteId = (routeId) => {
  const errors = {};

  if (!routeId || !mongoose.Types.ObjectId.isValid(routeId)) {
    errors.routeId = "Invalid route ID";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
