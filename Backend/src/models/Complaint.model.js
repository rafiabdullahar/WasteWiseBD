import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    resident: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Resident is required"],
    },
    pickupRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PickupRequest",
      default: null,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["Open", "Investigating", "Resolved", "Closed"],
      default: "Open",
    },
  },
  { timestamps: true }
);

const Complaint = mongoose.model("Complaint", complaintSchema);

export default Complaint;