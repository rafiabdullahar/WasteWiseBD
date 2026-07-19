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
  trim: true,
  default: "",
},
    category: {
      type: String,
      enum: [
        "Missed Pickup",
        "Partial Collection",
        "Wrong Waste Handling",
        "Bin Overflow",
        "Other",
      ],
      required: [true, "Category is required"],
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    missedDate: {
      type: Date,
      required: [true, "Missed date is required"],
    },
    evidenceUrl: {
      type: String,
      default: "",
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