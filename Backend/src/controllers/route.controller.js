import CollectionRoute from "../models/CollectionRoute.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import ServiceArea from "../models/ServiceArea.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  validateCreateRoute,
  validateUpdateRoute,
  validateStopList,
  validateAssignRoute,
  validateRouteQuery,
  validateRouteId,
} from "../validations/route.validation.js";
import {
  normaliseStops,
  checkCollectorEligibility,
  findCollectorConflict,
  decorateRoute,
  populateRoute,
  buildCoverageReport,
  dispatchRoute,
  previewDispatch,
} from "../services/route.service.js";
import { ROUTE_SORT_FIELDS } from "../config/routeConfig.js";

// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT
//
//   POST   /api/routes                 create a route
//   GET    /api/routes                 list routes (filtered, paginated)
//   GET    /api/routes/coverage        area coverage report
//   GET    /api/routes/my              a collector's own routes
//   GET    /api/routes/:id             one route
//   PUT    /api/routes/:id             update a route
//   PATCH  /api/routes/:id/stops       replace / reorder the stop list
//   PATCH  /api/routes/:id/assign      assign, reassign or unassign a collector
//   PATCH  /api/routes/:id/toggle      activate / deactivate
//   DELETE /api/routes/:id             deactivate (soft delete)
//   POST   /api/routes/:id/dispatch    claim unassigned requests on this slot
// ============================================================================

// Load a route by id, or send the appropriate error. Returns null when a
// response has already been sent, so callers just check for null.
const loadRoute = async (req, res) => {
  const idCheck = validateRouteId(req.params.id);

  if (!idCheck.isValid) {
    sendError(res, 400, "Invalid route ID", idCheck.errors);
    return null;
  }

  const route = await CollectionRoute.findById(req.params.id);

  if (!route) {
    sendError(res, 404, "Route not found");
    return null;
  }

  return route;
};

// Return the saved route in its fully populated, decorated form. Every write
// endpoint ends this way so the client always receives the same shape.
const respondWithRoute = async (res, routeId, statusCode, message) => {
  const populated = await populateRoute(CollectionRoute.findById(routeId));

  return sendSuccess(res, statusCode, message, {
    route: decorateRoute(populated),
  });
};

// Route names are the label a driver is given, so they must be unambiguous
// within an area. Enforced here rather than as a unique index so the conflict
// can be reported as a readable 409 instead of a duplicate-key error.
const findDuplicateName = async (name, serviceAreaId, excludeRouteId = null) => {
  const filter = {
    serviceArea: serviceAreaId,
    name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  };

  if (excludeRouteId) {
    filter._id = { $ne: excludeRouteId };
  }

  return CollectionRoute.findOne(filter).select("_id name").lean();
};

// @route  POST /api/routes
// @access admin
export const createRoute = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateCreateRoute(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const {
    name,
    serviceArea,
    dayOfWeek,
    timeSlot = "morning",
    wasteCategories = [],
    stops = [],
    routeDescription = "",
    notes = "",
    collectorId = null,
  } = req.body;

  // The area must exist and still be served — planning a route into a retired
  // area would produce work nobody can accept.
  const area = await ServiceArea.findById(serviceArea);

  if (!area) {
    return sendError(res, 404, "Service area not found");
  }

  if (!area.isActive) {
    return sendError(
      res,
      400,
      "Cannot create a route for an inactive service area"
    );
  }

  const trimmedName = String(name).trim();

  if (await findDuplicateName(trimmedName, area._id)) {
    return sendError(
      res,
      409,
      "A route with this name already exists in this service area"
    );
  }

  const routeData = {
    name: trimmedName,
    serviceArea: area._id,
    dayOfWeek,
    timeSlot,
    wasteCategories,
    stops: normaliseStops(stops),
    routeDescription: String(routeDescription).trim(),
    notes: String(notes).trim(),
    createdBy: req.user._id,
  };

  // A collector may be attached at creation time; the same eligibility and
  // conflict rules apply as on the dedicated assign endpoint.
  if (collectorId) {
    const eligibility = await checkCollectorEligibility(collectorId, area._id);

    if (!eligibility.ok) {
      return sendError(res, eligibility.status, eligibility.message);
    }

    const conflict = await findCollectorConflict({
      collectorId,
      dayOfWeek,
      timeSlot,
    });

    if (conflict) {
      return sendError(
        res,
        409,
        `This collector already drives "${conflict.name}" on ${dayOfWeek} ${timeSlot}`
      );
    }

    routeData.assignedCollector = collectorId;
    routeData.assignedBy = req.user._id;
    routeData.assignedAt = new Date();
  }

  const created = await CollectionRoute.create(routeData);

  return respondWithRoute(res, created._id, 201, "Route created successfully");
});

// @route  GET /api/routes
// @access admin
export const getRoutes = asyncHandler(async (req, res) => {
  const { isValid, errors, filters } = validateRouteQuery(req.query);

  if (!isValid) {
    return sendError(res, 400, "Invalid route filters", errors);
  }

  const query = {};

  if (filters.serviceArea) query.serviceArea = filters.serviceArea;
  if (filters.collector) query.assignedCollector = filters.collector;
  if (filters.dayOfWeek) query.dayOfWeek = filters.dayOfWeek;
  if (filters.timeSlot) query.timeSlot = filters.timeSlot;
  if (filters.isActive !== null) query.isActive = filters.isActive;

  if (filters.assigned === true) {
    query.assignedCollector = { $ne: null };
  } else if (filters.assigned === false) {
    query.assignedCollector = null;
  }

  if (filters.search) {
    // Escaped so a search term cannot act as a regular expression.
    const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.name = new RegExp(escaped, "i");
  }

  // Every whitelisted sort key maps to a real stored field, so sorting and
  // paging both happen in the database and stay consistent across pages.
  const sortField = ROUTE_SORT_FIELDS[filters.sortBy];
  const direction = filters.sortOrder === "asc" ? 1 : -1;

  const [routes, total] = await Promise.all([
    populateRoute(
      CollectionRoute.find(query)
        .sort({ [sortField]: direction })
        .skip(filters.skip)
        .limit(filters.limitNumber)
    ),
    CollectionRoute.countDocuments(query),
  ]);

  return sendSuccess(res, 200, "Routes fetched successfully", {
    routes: routes.map(decorateRoute),
    pagination: {
      total,
      page: filters.pageNumber,
      limit: filters.limitNumber,
      pages: Math.ceil(total / filters.limitNumber) || 1,
    },
  });
});

// @route  GET /api/routes/coverage
// @access admin
export const getCoverage = asyncHandler(async (req, res) => {
  const { serviceArea } = req.query;

  if (serviceArea) {
    const idCheck = validateRouteId(serviceArea);

    if (!idCheck.isValid) {
      return sendError(res, 400, "Invalid service area ID");
    }
  }

  const coverage = await buildCoverageReport({
    serviceArea: serviceArea || null,
  });

  return sendSuccess(res, 200, "Coverage report generated", coverage);
});

// @route  GET /api/routes/my
// @access collector
//
// Lives on this router rather than under /api/collectors so Feature 5 does not
// have to edit Feature 2's route file.
export const getMyRoutes = asyncHandler(async (req, res) => {
  const profile = await CollectorProfile.findOne({ user: req.user._id }).select(
    "_id"
  );

  if (!profile) {
    return sendError(res, 404, "Collector profile not found");
  }

  const routes = await populateRoute(
    CollectionRoute.find({
      assignedCollector: profile._id,
      isActive: true,
    }).sort({ dayOfWeek: 1, timeSlot: 1 })
  );

  return sendSuccess(res, 200, "Your routes fetched successfully", {
    routes: routes.map(decorateRoute),
  });
});

// @route  GET /api/routes/:id
// @access admin
export const getRouteById = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  const populated = await populateRoute(CollectionRoute.findById(route._id));
  const decorated = decorateRoute(populated);

  // How much unclaimed work is waiting on this route's slot right now. Shown
  // whether or not a collector is attached, because an unstaffed route with a
  // queue behind it is precisely what the admin needs to notice.
  const pendingRequests = await previewDispatch(populated);

  return sendSuccess(res, 200, "Route fetched successfully", {
    route: decorated,
    pendingRequests,
  });
});

// @route  PUT /api/routes/:id
// @access admin
export const updateRoute = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  const { isValid, errors } = validateUpdateRoute(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const {
    name,
    dayOfWeek,
    timeSlot,
    wasteCategories,
    stops,
    routeDescription,
    notes,
    isActive,
  } = req.body;

  if (name !== undefined) {
    const trimmedName = String(name).trim();

    if (await findDuplicateName(trimmedName, route.serviceArea, route._id)) {
      return sendError(
        res,
        409,
        "A route with this name already exists in this service area"
      );
    }

    route.name = trimmedName;
  }

  // Moving a route to a different slot can double-book its driver, so the
  // conflict check runs again against the *new* slot.
  const nextDay = dayOfWeek ?? route.dayOfWeek;
  const nextSlot = timeSlot ?? route.timeSlot;

  const slotChanged =
    nextDay !== route.dayOfWeek || nextSlot !== route.timeSlot;

  if (slotChanged && route.assignedCollector) {
    const conflict = await findCollectorConflict({
      collectorId: route.assignedCollector,
      dayOfWeek: nextDay,
      timeSlot: nextSlot,
      excludeRouteId: route._id,
    });

    if (conflict) {
      return sendError(
        res,
        409,
        `The assigned collector already drives "${conflict.name}" on ${nextDay} ${nextSlot}`
      );
    }
  }

  route.dayOfWeek = nextDay;
  route.timeSlot = nextSlot;

  if (wasteCategories !== undefined) route.wasteCategories = wasteCategories;
  if (stops !== undefined) route.stops = normaliseStops(stops);

  if (routeDescription !== undefined) {
    route.routeDescription = String(routeDescription).trim();
  }

  if (notes !== undefined) route.notes = String(notes).trim();
  if (isActive !== undefined) route.isActive = isActive;

  route.updatedBy = req.user._id;

  await route.save();

  return respondWithRoute(res, route._id, 200, "Route updated successfully");
});

// @route  PATCH /api/routes/:id/stops
// @access admin
//
// Replaces the whole stop list. The array order sent by the client is the
// driving order; sequence numbers are recomputed from it.
export const updateRouteStops = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  const { isValid, errors } = validateStopList(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  route.stops = normaliseStops(req.body.stops);
  route.updatedBy = req.user._id;

  await route.save();

  return respondWithRoute(res, route._id, 200, "Route stops updated");
});

// @route  PATCH /api/routes/:id/assign
// @access admin
export const assignRoute = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  const { isValid, errors } = validateAssignRoute(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const { collectorId } = req.body;

  // Explicit null unassigns, handing the slot back to the coverage report.
  if (collectorId === null) {
    route.assignedCollector = null;
    route.assignedBy = null;
    route.assignedAt = null;
    route.updatedBy = req.user._id;

    await route.save();

    return respondWithRoute(res, route._id, 200, "Route unassigned");
  }

  const eligibility = await checkCollectorEligibility(
    collectorId,
    route.serviceArea
  );

  if (!eligibility.ok) {
    return sendError(res, eligibility.status, eligibility.message);
  }

  const conflict = await findCollectorConflict({
    collectorId,
    dayOfWeek: route.dayOfWeek,
    timeSlot: route.timeSlot,
    excludeRouteId: route._id,
  });

  if (conflict) {
    return sendError(
      res,
      409,
      `This collector already drives "${conflict.name}" on ${route.dayOfWeek} ${route.timeSlot}`
    );
  }

  const isReassignment =
    route.assignedCollector &&
    route.assignedCollector.toString() !== collectorId.toString();

  route.assignedCollector = collectorId;
  route.assignedBy = req.user._id;
  route.assignedAt = new Date();
  route.updatedBy = req.user._id;

  await route.save();

  return respondWithRoute(
    res,
    route._id,
    200,
    isReassignment
      ? "Route reassigned successfully"
      : "Route assigned successfully"
  );
});

// @route  PATCH /api/routes/:id/toggle
// @access admin
export const toggleRoute = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  // Reactivating can collide with a route created in the meantime.
  if (!route.isActive && route.assignedCollector) {
    const conflict = await findCollectorConflict({
      collectorId: route.assignedCollector,
      dayOfWeek: route.dayOfWeek,
      timeSlot: route.timeSlot,
      excludeRouteId: route._id,
    });

    if (conflict) {
      return sendError(
        res,
        409,
        `Cannot reactivate: the assigned collector now drives "${conflict.name}" on ${route.dayOfWeek} ${route.timeSlot}`
      );
    }
  }

  route.isActive = !route.isActive;
  route.updatedBy = req.user._id;

  await route.save();

  return respondWithRoute(
    res,
    route._id,
    200,
    `Route ${route.isActive ? "activated" : "deactivated"} successfully`
  );
});

// @route  DELETE /api/routes/:id
// @access admin
//
// Soft delete, matching how ServiceArea is retired: planning history stays
// intact and past coverage reports do not change retroactively.
export const deleteRoute = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  route.isActive = false;
  route.updatedBy = req.user._id;

  await route.save();

  return respondWithRoute(res, route._id, 200, "Route deactivated successfully");
});

// @route  POST /api/routes/:id/dispatch
// @access admin
export const dispatchRouteRequests = asyncHandler(async (req, res) => {
  const route = await loadRoute(req, res);

  if (!route) return undefined;

  if (!route.isActive) {
    return sendError(res, 400, "Cannot dispatch an inactive route");
  }

  if (!route.assignedCollector) {
    return sendError(
      res,
      400,
      "Assign a collector to this route before dispatching it"
    );
  }

  // The collector may have been deactivated since the route was assigned.
  const eligibility = await checkCollectorEligibility(
    route.assignedCollector,
    route.serviceArea
  );

  if (!eligibility.ok) {
    return sendError(res, eligibility.status, eligibility.message);
  }

  const { matched, assigned } = await dispatchRoute(route, req.user._id);

  return sendSuccess(
    res,
    200,
    assigned === 0
      ? "No unassigned pickup requests matched this route"
      : `${assigned} pickup request(s) assigned to this route`,
    { matched, assigned }
  );
});
