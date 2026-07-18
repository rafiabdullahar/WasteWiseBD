import mongoose from "mongoose";

const serviceAreaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Service area name is required"],
      unique: true,
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      default: "Dhaka",
    },
    district: {
      type: String,
      trim: true,
      default: "Dhaka",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // The admin who created this service area — for audit purposes.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const ServiceArea = mongoose.model("ServiceArea", serviceAreaSchema);

export default ServiceArea;
