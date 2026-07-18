import mongoose from "mongoose";
import dotenv from "dotenv";
import DisposalGuideline from "../models/DisposalGuideline.model.js";

dotenv.config();

const guidelines = [
  {
    wasteCategory: "Organic",
    title: "Organic Waste Disposal",
    instructions:
      "Organic waste includes food scraps, vegetable peels, and garden waste. Keep it separate from dry waste to support composting and reduce contamination of recyclables.",
    doList: [
      "Use a separate bin for food and garden waste",
      "Drain excess liquid before disposal",
      "Compost at home where possible",
    ],
    dontList: [
      "Don't mix with plastic or glass",
      "Don't dispose of cooking oil in the same bin",
    ],
    isRecyclable: false,
  },
  {
    wasteCategory: "Plastic",
    title: "Plastic Waste Disposal",
    instructions:
      "Rinse and dry all plastic before disposal. Clean plastic is far more likely to be accepted for recycling than contaminated plastic.",
    doList: ["Rinse containers", "Remove caps and labels where possible", "Flatten bottles to save space"],
    dontList: ["Don't mix with food waste", "Don't dispose of plastic bags with recyclables unless collected separately"],
    isRecyclable: true,
  },
  {
    wasteCategory: "Paper",
    title: "Paper Waste Disposal",
    instructions:
      "Keep paper dry and clean. Wet, greasy, or food-stained paper cannot be recycled and contaminates an entire batch.",
    doList: ["Flatten cardboard boxes", "Keep paper dry", "Bundle newspapers separately"],
    dontList: ["Don't include greasy or food-stained paper", "Don't mix with wet organic waste"],
    isRecyclable: true,
  },
  {
    wasteCategory: "Glass",
    title: "Glass Waste Disposal",
    instructions:
      "Glass should be handled carefully to avoid injury. Rinse containers before disposal and separate by color if required locally.",
    doList: ["Rinse bottles and jars", "Remove lids", "Wrap broken glass before disposal"],
    dontList: ["Don't dispose of broken glass loosely", "Don't mix with ceramics or mirrors"],
    isRecyclable: true,
  },
  {
    wasteCategory: "Metal",
    title: "Metal Waste Disposal",
    instructions:
      "Metal items such as cans and scrap metal are highly recyclable. Rinse food residue before disposal.",
    doList: ["Rinse food cans", "Flatten cans if possible", "Separate scrap metal from general waste"],
    dontList: ["Don't dispose of aerosol cans without checking if empty", "Don't mix with hazardous waste"],
    isRecyclable: true,
  },
  {
    wasteCategory: "Electronic",
    title: "Electronic Waste (E-Waste) Disposal",
    instructions:
      "Electronic waste contains materials that can be harmful if disposed of incorrectly. Use designated e-waste collection points rather than general bins.",
    doList: ["Remove batteries before disposal where possible", "Use certified e-waste collection points", "Wipe personal data from devices"],
    dontList: ["Don't dispose of e-waste in regular bins", "Don't attempt to dismantle devices with hazardous components yourself"],
    isRecyclable: true,
  },
  {
    wasteCategory: "Hazardous",
    title: "Hazardous Waste Disposal",
    instructions:
      "Hazardous waste includes chemicals, batteries, medical waste, and similar materials that can harm people or the environment if handled improperly.",
    doList: ["Store in original, sealed containers when possible", "Contact municipal hazardous waste services for pickup"],
    dontList: ["Don't pour hazardous liquids down drains", "Don't mix with household waste", "Don't burn hazardous waste"],
    isRecyclable: false,
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");

    for (const item of guidelines) {
      await DisposalGuideline.findOneAndUpdate(
        { wasteCategory: item.wasteCategory },
        item,
        { upsert: true, new: true }
      );
    }

    console.log("Guidelines seeded successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();