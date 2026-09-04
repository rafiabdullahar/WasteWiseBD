import mongoose from "mongoose";

const scheduleSchema = new mongoose.Schema(
  {
    serviceArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: [true, "Service area is required"],
    },
    dayOfWeek: {
      type: String,
      required: [true, "Day of week is required"],
      enum: [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
    },
    wasteCategories: [
      {
        type: String,
        enum: [
          "organic",
          "plastic",
          "paper",
          "glass",
          "metal",
          "electronic",
          "hazardous",
        ],
      },
    ],
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Compound index: prevent duplicate schedules for the same area + day + time.
scheduleSchema.index(
  { serviceArea: 1, dayOfWeek: 1, timeSlot: 1 },
  { unique: true }
);

const Schedule = mongoose.model("Schedule", scheduleSchema);

export default Schedule;
