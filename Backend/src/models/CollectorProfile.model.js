import mongoose from "mongoose";

const collectorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    employeeId: {
      type: String,
      trim: true,
      default: "",
    },
    serviceAreas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceArea",
      },
    ],
    vehicleType: {
      type: String,
      enum: ["truck", "van", "rickshaw", "motorcycle", "other"],
      default: "truck",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: "",
    },
    workSchedule: {
      // e.g. "Mon-Fri, 8am-4pm"
      type: String,
      trim: true,
      default: "",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    // Aggregated performance snapshot — kept in sync by the performance module.
    totalCompleted: {
      type: Number,
      default: 0,
    },
    totalFailed: {
      type: Number,
      default: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { timestamps: true }
);

// An employee ID identifies a collector on rosters and paperwork, so no two
// collectors may share one.
//
// It cannot be a plain `unique: true`, because the field is optional and
// defaults to "": every profile starts life with an empty employee ID, and a
// plain unique index would reject the second such profile ever created. The
// partial filter restricts the constraint to profiles that actually carry an
// ID, leaving any number of blank ones legal.
//
// This is the database-level guarantee. The readable, case-insensitive check
// lives in collector.controller.js — this index is what holds under a race.
collectorProfileSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $gt: "" } },
  }
);

const CollectorProfile = mongoose.model(
  "CollectorProfile",
  collectorProfileSchema
);

export default CollectorProfile;
