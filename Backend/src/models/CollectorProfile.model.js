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

const CollectorProfile = mongoose.model(
  "CollectorProfile",
  collectorProfileSchema
);

export default CollectorProfile;
