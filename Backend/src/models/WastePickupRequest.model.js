import mongoose from "mongoose";

export const PICKUP_STATUSES = [
  "pending",
  "assigned",
  "on_the_way",
  "collected",
  "failed",
  "cancelled",
];

const WASTE_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

const assignmentHistorySchema = new mongoose.Schema(
  {
    collector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CollectorProfile",
      required: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    method: {
      type: String,
      enum: ["automatic", "manual"],
      required: true,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { _id: true }
);

const wastePickupRequestSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    residentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResidentProfile",
      required: true,
    },

    // Keep an address snapshot so old requests remain accurate
    // even if the resident later edits their saved address.
    pickupAddress: {
      label: {
        type: String,
        trim: true,
        default: "Home",
      },
      street: {
        type: String,
        required: true,
        trim: true,
      },
      area: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    serviceArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: true,
      index: true,
    },

    wasteItems: [
      {
        category: {
          type: String,
          enum: WASTE_CATEGORIES,
          required: true,
        },
        estimatedQuantity: {
          type: Number,
          required: true,
          min: 0.1,
        },
      },
    ],

    preferredDate: {
      type: Date,
      required: true,
      index: true,
    },
    preferredTimeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    status: {
      type: String,
      enum: PICKUP_STATUSES,
      default: "pending",
      index: true,
    },

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
    assignmentMethod: {
      type: String,
      enum: ["automatic", "manual"],
      default: null,
    },
    assignmentNote: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
    assignmentHistory: {
      type: [assignmentHistorySchema],
      default: [],
    },

    completedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  { timestamps: true }
);

wastePickupRequestSchema.index({ resident: 1, createdAt: -1 });
wastePickupRequestSchema.index({ serviceArea: 1, status: 1 });
wastePickupRequestSchema.index({ assignedCollector: 1, status: 1 });

const WastePickupRequest = mongoose.model(
  "WastePickupRequest",
  wastePickupRequestSchema
);

export default WastePickupRequest;
