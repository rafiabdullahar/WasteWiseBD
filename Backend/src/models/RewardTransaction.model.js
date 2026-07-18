import mongoose from "mongoose";

// Immutable ledger — entries are never edited, only appended.
const rewardTransactionSchema = new mongoose.Schema(
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
    type: {
      type: String,
      enum: ["earned", "redeemed"],
      required: true,
    },
    points: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      enum: [
        "recycling_completed",
        "correct_segregation",
        "campaign_participation",
        "redemption",
        "admin_adjustment",
      ],
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    // Reference to the source of the points (e.g. RecyclingRequest ID).
    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
    },
    sourceModel: {
      type: String,
      enum: ["RecyclingRequest", "PickupRequest", "Campaign"],
    },
  },
  { timestamps: true }
);

rewardTransactionSchema.index({ resident: 1, createdAt: -1 });

const RewardTransaction = mongoose.model(
  "RewardTransaction",
  rewardTransactionSchema
);

export default RewardTransaction;
