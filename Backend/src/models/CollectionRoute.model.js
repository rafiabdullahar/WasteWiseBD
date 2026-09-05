import mongoose from "mongoose";
import {
  DAYS_OF_WEEK,
  TIME_SLOTS,
  WASTE_CATEGORIES,
  MAX_STOP_LABEL_LENGTH,
  MAX_ROUTE_NAME_LENGTH,
  MAX_ROUTE_DESCRIPTION_LENGTH,
} from "../config/routeConfig.js";

// ============================================================================
// FEATURE 5 — AREA-BASED ROUTE MANAGEMENT
//
// A CollectionRoute is a repeating weekly plan: "on Tuesday morning, this
// collector works this ordered list of stops inside this service area".
//
// Design notes:
//
//  - The "zone" of the feature description is the existing ServiceArea. No
//    parallel zone hierarchy is introduced; a route is a path *within* an
//    area, and areas remain the single geography the whole platform shares.
//
//  - Stops are admin-defined waypoints, not references to resident addresses.
//    Resident addresses are embedded subdocuments inside ResidentProfile and
//    change whenever a resident edits their profile; a route built from them
//    would silently rewrite itself and would leak private addresses into an
//    operational plan. Waypoints stay stable and are safe to share with a
//    driver.
//
//  - Stop ordering is the route. `sequence` is the driving order, and the
//    admin sets it by arranging the stops. Nothing reorders it automatically.
//
//  - `routeDescription` is the admin's own written directions for driving the
//    route. The platform has no coordinates and no routing engine, so the
//    person who knows the area writes down the feasible path in plain words —
//    which is more useful to a driver than a computed number would be.
// ============================================================================

const stopSchema = new mongoose.Schema(
  {
    // Driving order, 1-based. Normalised to a dense 1..n range on every write
    // so gaps left by a deleted stop cannot accumulate.
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },
    label: {
      type: String,
      required: [true, "Stop label is required"],
      trim: true,
      maxlength: MAX_STOP_LABEL_LENGTH,
    },
    street: {
      type: String,
      trim: true,
      default: "",
    },
    // Locality name. Doubles as the clustering key for the sequencing
    // heuristic when no postal code is supplied.
    area: {
      type: String,
      trim: true,
      default: "",
    },
    postalCode: {
      type: String,
      trim: true,
      default: "",
    },
    landmark: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { _id: true }
);

const collectionRouteSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Route name is required"],
      trim: true,
      maxlength: MAX_ROUTE_NAME_LENGTH,
    },

    serviceArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: [true, "Service area is required"],
      index: true,
    },

    // Nullable on purpose: a route can be planned before anyone is free to
    // drive it. An unassigned route is a visible gap in coverage, which is
    // exactly what the coverage report is for.
    assignedCollector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectorProfile",
      default: null,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedAt: {
      type: Date,
      default: null,
    },

    // Same vocabulary as Schedule, so a route and a calendar entry describe
    // the same slot in the same words.
    dayOfWeek: {
      type: String,
      required: [true, "Day of week is required"],
      enum: DAYS_OF_WEEK,
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      enum: TIME_SLOTS,
      default: "morning",
    },

    // Optional narrowing. An empty array means the route handles every
    // category, which is the common case.
    wasteCategories: [
      {
        type: String,
        enum: WASTE_CATEGORIES,
      },
    ],

    stops: {
      type: [stopSchema],
      default: [],
    },

    // Free-text directions written by the admin: which roads to take, in what
    // order, and anything a driver needs to know to follow the route.
    routeDescription: {
      type: String,
      trim: true,
      maxlength: MAX_ROUTE_DESCRIPTION_LENGTH,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    // Soft deletion, matching how ServiceArea is retired: an inactive route
    // keeps its history instead of vanishing from past planning records.
    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Listing a day's plan for an area is the most common query.
collectionRouteSchema.index({ serviceArea: 1, dayOfWeek: 1, timeSlot: 1 });

// Backs the double-booking check: one collector cannot hold two active routes
// in the same weekly slot.
collectionRouteSchema.index({ assignedCollector: 1, dayOfWeek: 1, timeSlot: 1 });

// Convenience for the UI and for sorting by size without loading every stop.
collectionRouteSchema.virtual("stopCount").get(function getStopCount() {
  return this.stops?.length || 0;
});

collectionRouteSchema.set("toJSON", { virtuals: true });
collectionRouteSchema.set("toObject", { virtuals: true });

const CollectionRoute = mongoose.model(
  "CollectionRoute",
  collectionRouteSchema
);

export default CollectionRoute;
