import mongoose from "mongoose";

// An address sub-document belonging to a resident.
// Stored as an embedded array (not a separate collection) because addresses
// are always accessed through the resident and never queried in isolation.
const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "Home",
    },
    street: {
      type: String,
      required: [true, "Street is required"],
      trim: true,
    },
    area: {
      type: String,
      required: [true, "Area is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      default: "Dhaka",
    },
    postalCode: {
      type: String,
      trim: true,
    },
    serviceArea: {
      // Reference to the ServiceArea this address falls within.
      // Populated when resident selects their area during address setup.
      type: mongoose.Schema.Types.ObjectId,
      ref: "ServiceArea",
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true, timestamps: true }
);

const residentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per user
    },
    householdType: {
      type: String,
      enum: ["apartment", "house", "commercial", "other"],
      default: "house",
    },
    profilePicture: {
      type: String,
      default: "",
    },
    preferredWasteCategories: [
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
    addresses: [addressSchema],
    totalRewardPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const ResidentProfile = mongoose.model("ResidentProfile", residentProfileSchema);

export default ResidentProfile;
