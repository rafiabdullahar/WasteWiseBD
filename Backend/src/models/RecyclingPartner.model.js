import mongoose from "mongoose";

const RECYCLABLE_MATERIALS = [
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "organic",
  "hazardous",
];

const recyclingPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    organizationName: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
    },
    organizationType: {
      type: String,
      enum: ["recycling_center", "scrap_shop", "environmental_org", "other"],
      default: "recycling_center",
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      trim: true,
      lowercase: true,
    },
    contactPhone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    serviceAreas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ServiceArea",
      },
    ],
    acceptedMaterials: {
      type: [String],
      enum: RECYCLABLE_MATERIALS,
      default: [],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    logo: {
      type: String,
      default: "",
    },
    // Admin verification flow:
    // Partners self-register (isVerified = false). Admin sets isVerified = true
    // before the partner can accept recycling requests.
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    totalRequestsHandled: {
      type: Number,
      default: 0,
    },
    totalRecycled: {
      // kg, updated on request completion
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const RecyclingPartner = mongoose.model(
  "RecyclingPartner",
  recyclingPartnerSchema
);

export default RecyclingPartner;
