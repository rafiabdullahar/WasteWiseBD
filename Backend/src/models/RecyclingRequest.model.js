import mongoose from "mongoose";

// Status progression: pending → assigned → accepted → in_progress → completed
//                                         ↘ rejected
const RECYCLING_STATUSES = [
  "pending",
  "assigned",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
];

const recyclingRequestSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    residentProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResidentProfile",
      required: true,
    },
    partner: {
      // Assigned recycling partner (populated after matching).
      type: mongoose.Schema.Types.ObjectId,
      ref: "RecyclingPartner",
    },
    // Address details (stored as snapshot to preserve history even if
    // the resident later edits their address).
    pickupAddress: {
      street: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, required: true },
      postalCode: { type: String },
    },
    serviceArea: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
      required: true,
    },
    materials: [
      {
        // Waste categories the resident wants recycled.
        category: {
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
          required: true,
        },
        estimatedQuantity: {
          // kg
          type: Number,
          required: true,
          min: 0.1,
        },
      },
    ],
    preferredDate: {
      type: Date,
      required: true,
    },
    preferredTimeSlot: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: RECYCLING_STATUSES,
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    // Timestamps for key status transitions.
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    // Reward points earned when request is completed.
    rewardPointsEarned: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const RecyclingRequest = mongoose.model(
  "RecyclingRequest",
  recyclingRequestSchema
);

export default RecyclingRequest;
