import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "pickup_assigned",
        "pickup_on_way",
        "pickup_completed",
        "pickup_failed",
        "recycling_accepted",
        "recycling_rejected",
        "recycling_completed",
        "complaint_updated",
        "reward_earned",
        "reminder",
        "system",
        "partner_verified",
      ],
      default: "system",
    },
    // Optional reference to the related document (e.g. a pickup request ID).
    relatedDocument: {
      type: mongoose.Schema.Types.ObjectId,
    },
    relatedModel: {
      type: String,
      enum: [
        "PickupRequest",
        "RecyclingRequest",
        "Complaint",
        "RewardTransaction",
        "RecyclingPartner",
      ],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Index for fast per-user notification queries sorted by newest first.
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
