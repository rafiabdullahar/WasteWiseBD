import mongoose from "mongoose";

const wasteCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      lowercase: true,
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
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    isRecyclable: {
      type: Boolean,
      default: false,
    },
    disposalGuideline: {
      type: String,
      trim: true,
      default: "",
    },
    icon: {
      // Icon name or URL
      type: String,
      default: "",
    },
    color: {
      // Hex code for UI badge
      type: String,
      default: "#6B7280",
    },
    rewardPointsPerKg: {
      // Points awarded per kg when this category is recycled correctly.
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const WasteCategory = mongoose.model("WasteCategory", wasteCategorySchema);

export default WasteCategory;
