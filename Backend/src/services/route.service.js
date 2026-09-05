import CollectionRoute from "../models/CollectionRoute.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import ServiceArea from "../models/ServiceArea.model.js";
import Schedule from "../models/Schedule.model.js";
import WastePickupRequest from "../models/WastePickupRequest.model.js";
import {
  DISPATCH_ELIGIBLE_STATUSES,
  DAY_NUMBERS,
} from "../config/routeConfig.js";

// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT : SERVICE LAYER
//
// Collector eligibility and conflict rules, the coverage report, and dispatch.
// The controller does HTTP only.
//
// There is no routing or optimisation logic here by design. The platform
// stores no coordinates, so the admin — who knows the area — orders the stops
// and writes the directions. This module does not compute distance, travel
// time or fuel, and does not pretend to.
// ============================================================================

const round = (value, digits = 1) => Number(Number(value || 0).toFixed(digits));

const percentage = (part, whole, digits = 1) =>
  whole > 0 ? round((part / whole) * 100, digits) : 0;

// ─── Stops ────────────────────────────────────────────────────────────────────

/**
 * Trim a stop list and renumber it densely from its array order.
 *
 * The array order is authoritative: the admin arranges the stops in the order
 * they want them driven, and renumbering here means a deleted stop can never
 * leave a gap (1, 2, 4, 5) behind.
 */
export const normaliseStops = (stops = []) =>
  stops.map((stop, index) => ({
    sequence: index + 1,
    label: String(stop.label || "").trim(),
    street: String(stop.street || "").trim(),
    area: String(stop.area || "").trim(),
    postalCode: String(stop.postalCode || "").trim(),
    landmark: String(stop.landmark || "").trim(),
    notes: String(stop.notes || "").trim(),
  }));

// ─── Collector eligibility and conflicts ──────────────────────────────────────

/**
 * Check whether a collector may take a route, applying the same rules Feature
 * 10 applies to a single pickup assignment so the two paths cannot disagree.
 *
 * @returns {Promise<{ ok: boolean, status?: number, message?: string,
 *                     collector?: object }>}
 */
export const checkCollectorEligibility = async (collectorId, serviceAreaId) => {
  const collector = await CollectorProfile.findById(collectorId).populate(
    "user",
    "name email phone role isActive"
  );

  if (!collector) {
    return { ok: false, status: 404, message: "Collector not found" };
  }

  if (!collector.user || collector.user.role !== "collector") {
    return {
      ok: false,
      status: 400,
      message: "Selected profile does not belong to a collector",
    };
  }

  if (!collector.user.isActive) {
    return {
      ok: false,
      status: 400,
      message: "Selected collector account is inactive",
    };
  }

  if (!collector.isAvailable) {
    return {
      ok: false,
      status: 400,
      message: "Selected collector is currently unavailable",
    };
  }

  const coversArea = (collector.serviceAreas || []).some(
    (areaId) => areaId.toString() === serviceAreaId.toString()
  );

  if (!coversArea) {
    return {
      ok: false,
      status: 400,
      message: "Selected collector does not cover this service area",
    };
  }

  return { ok: true, collector };
};

/**
 * Find an active route that would double-book this collector.
 *
 * The rule is deliberately narrow: one collector, one active route, per
 * day-and-slot. CollectorProfile.workSchedule is a free-text string
 * ("Mon-Fri, 8am-4pm") and cannot be parsed, so a genuine working-hours check
 * is impossible — this slot-level rule is the strongest guarantee the existing
 * data supports.
 *
 * @returns {Promise<object|null>} the conflicting route, or null
 */
export const findCollectorConflict = async ({
  collectorId,
  dayOfWeek,
  timeSlot,
  excludeRouteId = null,
}) => {
  const filter = {
    assignedCollector: collectorId,
    dayOfWeek,
    timeSlot,
    isActive: true,
  };

  if (excludeRouteId) {
    filter._id = { $ne: excludeRouteId };
  }

  return CollectionRoute.findOne(filter)
    .populate("serviceArea", "name city")
    .select("name serviceArea dayOfWeek timeSlot")
    .lean();
};

// ─── Route shaping ────────────────────────────────────────────────────────────

// Normalise a route document on the way out so every endpoint returns the
// same shape, whether the document came back lean or hydrated.
export const decorateRoute = (route) => {
  if (!route) return route;

  const plain = typeof route.toObject === "function" ? route.toObject() : route;

  return {
    ...plain,
    stopCount: plain.stops?.length || 0,
  };
};

export const populateRoute = (query) =>
  query
    .populate("serviceArea", "name city district isActive")
    .populate({
      path: "assignedCollector",
      select: "user employeeId vehicleType vehicleNumber isAvailable",
      populate: { path: "user", select: "name email phone isActive" },
    })
    .populate("createdBy", "name email")
    .populate("assignedBy", "name email");

// ─── Coverage ─────────────────────────────────────────────────────────────────

const slotKey = (dayOfWeek, timeSlot) => `${dayOfWeek}|${timeSlot}`;

/**
 * The "complete area coverage" half of the feature.
 *
 * For every service area it answers three questions an operations manager
 * actually asks:
 *
 *   1. Does the published collection calendar have a staffed route behind it?
 *      A Schedule entry with no route — or a route with nobody driving it — is
 *      a promise to residents that nothing is backing.
 *   2. Are any routes sitting unassigned?
 *   3. Is unclaimed pickup work piling up in the area?
 *
 * Coverage is measured against Schedule because that is what residents are
 * shown on the calendar (Feature 4). An area with no schedule has no promise
 * to keep, so its coverage is reported as null rather than 0% — absence of a
 * plan is not a failure to execute one.
 */
export const buildCoverageReport = async ({ serviceArea = null } = {}) => {
  const areaFilter = serviceArea ? { _id: serviceArea } : {};

  const areas = await ServiceArea.find(areaFilter)
    .select("name city district isActive")
    .sort({ name: 1 })
    .lean();

  if (areas.length === 0) {
    return { areas: [], totals: emptyCoverageTotals() };
  }

  const areaIds = areas.map((area) => area._id);

  const [routes, schedules, pendingRows] = await Promise.all([
    CollectionRoute.find({ serviceArea: { $in: areaIds }, isActive: true })
      .select("name serviceArea dayOfWeek timeSlot assignedCollector stops")
      .lean(),

    Schedule.find({ serviceArea: { $in: areaIds }, isActive: true })
      .select("serviceArea dayOfWeek timeSlot")
      .lean(),

    WastePickupRequest.aggregate([
      {
        $match: {
          serviceArea: { $in: areaIds },
          status: { $in: DISPATCH_ELIGIBLE_STATUSES },
        },
      },
      { $group: { _id: "$serviceArea", pendingRequests: { $sum: 1 } } },
    ]),
  ]);

  const groupByArea = (rows) =>
    rows.reduce((map, row) => {
      const key = String(row.serviceArea || row._id);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(row);
      return map;
    }, new Map());

  const routesByArea = groupByArea(routes);
  const schedulesByArea = groupByArea(schedules);
  const pendingByArea = new Map(
    pendingRows.map((row) => [String(row._id), row.pendingRequests])
  );

  const totals = emptyCoverageTotals();

  const areaRows = areas.map((area) => {
    const key = String(area._id);
    const areaRoutes = routesByArea.get(key) || [];
    const areaSchedules = schedulesByArea.get(key) || [];
    const pendingRequests = pendingByArea.get(key) || 0;

    // Slots that have a route at all, vs. slots whose route has a driver.
    const plannedSlots = new Set();
    const staffedSlots = new Set();

    areaRoutes.forEach((route) => {
      const key2 = slotKey(route.dayOfWeek, route.timeSlot);
      plannedSlots.add(key2);
      if (route.assignedCollector) staffedSlots.add(key2);
    });

    // A calendar slot is a gap unless a staffed route stands behind it.
    const gaps = areaSchedules
      .filter(
        (schedule) => !staffedSlots.has(slotKey(schedule.dayOfWeek, schedule.timeSlot))
      )
      .map((schedule) => ({
        dayOfWeek: schedule.dayOfWeek,
        timeSlot: schedule.timeSlot,
        // Distinguishes "nobody planned this" from "planned but unstaffed",
        // which need different fixes.
        reason: plannedSlots.has(slotKey(schedule.dayOfWeek, schedule.timeSlot))
          ? "route_unassigned"
          : "no_route",
      }));

    const unassignedRoutes = areaRoutes.filter(
      (route) => !route.assignedCollector
    ).length;

    const coveredSchedules = areaSchedules.length - gaps.length;

    totals.areas += 1;
    totals.routes += areaRoutes.length;
    totals.unassignedRoutes += unassignedRoutes;
    totals.scheduleSlots += areaSchedules.length;
    totals.coveredSlots += coveredSchedules;
    totals.pendingRequests += pendingRequests;
    if (areaRoutes.length === 0) totals.areasWithoutRoutes += 1;

    return {
      areaId: area._id,
      areaName: area.name,
      city: area.city,
      isActive: area.isActive,
      routes: areaRoutes.length,
      assignedRoutes: areaRoutes.length - unassignedRoutes,
      unassignedRoutes,
      totalStops: areaRoutes.reduce(
        (sum, route) => sum + (route.stops?.length || 0),
        0
      ),
      scheduleSlots: areaSchedules.length,
      coveredSlots: coveredSchedules,
      // null, not 0 — see the doc comment above.
      coverageRate: areaSchedules.length
        ? percentage(coveredSchedules, areaSchedules.length)
        : null,
      hasSchedule: areaSchedules.length > 0,
      gaps,
      pendingRequests,
    };
  });

  totals.coverageRate = totals.scheduleSlots
    ? percentage(totals.coveredSlots, totals.scheduleSlots)
    : null;

  return { areas: areaRows, totals };
};

function emptyCoverageTotals() {
  return {
    areas: 0,
    areasWithoutRoutes: 0,
    routes: 0,
    unassignedRoutes: 0,
    scheduleSlots: 0,
    coveredSlots: 0,
    coverageRate: null,
    pendingRequests: 0,
  };
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Build the query that selects the pickup requests a route is responsible for.
 *
 * Matching is by service area + weekday + time slot, and — when the route
 * declares categories — by at least one matching waste category.
 *
 * `$dayOfWeek` evaluates in UTC. That is correct here rather than merely
 * convenient: `preferredDate` originates from a date-only input, so Mongoose
 * stores it as UTC midnight and the UTC weekday is the day the resident chose.
 */
export const buildDispatchFilter = (route) => {
  const filter = {
    serviceArea: route.serviceArea._id || route.serviceArea,
    status: { $in: DISPATCH_ELIGIBLE_STATUSES },
    assignedCollector: null,
    preferredTimeSlot: route.timeSlot,
    $expr: {
      $eq: [{ $dayOfWeek: "$preferredDate" }, DAY_NUMBERS[route.dayOfWeek]],
    },
  };

  if (route.wasteCategories?.length) {
    filter["wasteItems.category"] = { $in: route.wasteCategories };
  }

  return filter;
};

/**
 * Hand every unclaimed request on this route's slot to the route's collector.
 *
 * Only `pending`, genuinely unassigned requests are touched
 * (DISPATCH_ELIGIBLE_STATUSES + `assignedCollector: null`), so dispatching a
 * route can never take work away from another collector. That is the rule that
 * lets routes coexist with the automatic assignment in Feature 3 and the
 * manual assignment in Feature 10 rather than fighting them: the route claims
 * only what nobody else has.
 *
 * Written as a single updateMany — every field is identical across the matched
 * set, so there is no reason to load and save documents one at a time.
 */
export const dispatchRoute = async (route, adminUserId) => {
  const filter = buildDispatchFilter(route);

  const matched = await WastePickupRequest.countDocuments(filter);

  if (matched === 0) {
    return { matched: 0, assigned: 0 };
  }

  const assignedAt = new Date();

  const result = await WastePickupRequest.updateMany(
    filter,
    {
      $set: {
        assignedCollector: route.assignedCollector._id || route.assignedCollector,
        assignedBy: adminUserId,
        assignedAt,
        assignmentMethod: "route",
        assignmentNote: `Dispatched with route "${route.name}"`,
        status: "assigned",
      },
      $push: {
        assignmentHistory: {
          collector: route.assignedCollector._id || route.assignedCollector,
          assignedBy: adminUserId,
          method: "route",
          assignedAt,
          note: `Dispatched with route "${route.name}" (${route.dayOfWeek}, ${route.timeSlot})`,
        },
      },
    },
    { runValidators: true }
  );

  return { matched, assigned: result.modifiedCount || 0 };
};

/**
 * Count what a dispatch would claim, without changing anything. Backs the
 * "N requests waiting" hint in the UI so the admin can see the effect before
 * committing to it.
 */
export const previewDispatch = async (route) =>
  WastePickupRequest.countDocuments(buildDispatchFilter(route));
