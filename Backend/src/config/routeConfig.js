// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT : CONFIGURATION
//
// Enums and limits for collection routes, kept out of the logic so the project
// stays free of hardcoded values.
//
// Note on scope: this module does no route optimisation. The admin orders the
// stops and writes the directions in their own words. There is deliberately no
// distance, travel-time or fuel model here, because the platform stores no
// coordinates and inventing those numbers would be worse than omitting them.
// ============================================================================

// Must stay identical to the enums on Schedule.model.js, so a route and the
// collection calendar can be talked about in the same vocabulary.
export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// MongoDB's $dayOfWeek returns 1 for Sunday … 7 for Saturday. This maps a
// stored day name onto that numbering for the dispatch query.
export const DAY_NUMBERS = DAYS_OF_WEEK.reduce((map, day, index) => {
  map[day] = index + 1;
  return map;
}, {});

export const TIME_SLOTS = ["morning", "afternoon", "evening"];

export const WASTE_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

// A route is a single vehicle's shift, so the stop list is bounded.
export const MAX_STOPS_PER_ROUTE = 60;

export const MAX_STOP_LABEL_LENGTH = 120;
export const MAX_ROUTE_NAME_LENGTH = 120;

// The admin's own written directions for driving the route.
export const MAX_ROUTE_DESCRIPTION_LENGTH = 2000;

// Pickup statuses a route may take over when the admin dispatches it.
// Only unassigned work is claimed — a request already given to a collector is
// left alone so a route can never silently steal another collector's task.
export const DISPATCH_ELIGIBLE_STATUSES = ["pending"];

// Sortable columns of the route list, mapped to the field they sort on.
// A whitelist: user input never reaches the sort object directly. Every entry
// is a real stored field, so all sorting happens in the database.
export const ROUTE_SORT_FIELDS = {
  name: "name",
  created: "createdAt",
  updated: "updatedAt",
  day: "dayOfWeek",
};

export const DEFAULT_ROUTE_SORT = "created";
