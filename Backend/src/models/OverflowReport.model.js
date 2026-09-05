// Backend/src/models/OverflowReport.model.js

import mongoose from "mongoose";

const overflowReportSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Resident is required"],
    },
    area: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: [true, "Area is required"],
    },
    locationDescription: {
      type: String,
      required: [true, "Location description is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    photoUrl: {
      type: String,
      required: [true, "Photo is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    assignedCollector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const OverflowReport = mongoose.model("OverflowReport", overflowReportSchema);

export default OverflowReport;