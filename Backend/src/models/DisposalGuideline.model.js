import mongoose from "mongoose";

const disposalGuidelineSchema = new mongoose.Schema(
  {
    wasteCategory: {
      type: String,
      required: [true, "Waste category is required"],
      enum: ["Organic", "Plastic", "Paper", "Glass", "Metal", "Electronic", "Hazardous"],
      unique: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },
    instructions: {
      type: String,
      required: [true, "Instructions are required"],
      trim: true,
    },
    doList: [{ type: String, trim: true }],
    dontList: [{ type: String, trim: true }],
    isRecyclable: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const DisposalGuideline = mongoose.model("DisposalGuideline", disposalGuidelineSchema);

export default DisposalGuideline;