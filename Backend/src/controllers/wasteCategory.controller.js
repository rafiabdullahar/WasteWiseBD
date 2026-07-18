import WasteCategory from "../models/WasteCategory.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// @route  GET /api/waste-categories
// @access Public
export const getAllCategories = asyncHandler(async (req, res) => {
  const categories = await WasteCategory.find({ isActive: true }).sort({
    name: 1,
  });
  return sendSuccess(res, 200, "Waste categories fetched", { categories });
});

// @route  POST /api/waste-categories
// @access admin
export const createCategory = asyncHandler(async (req, res) => {
  const {
    name,
    displayName,
    isRecyclable,
    disposalGuideline,
    icon,
    color,
    rewardPointsPerKg,
  } = req.body;

  if (!name || !displayName) {
    return sendError(res, 400, "Name and display name are required");
  }

  const category = await WasteCategory.create({
    name: name.toLowerCase().trim(),
    displayName: displayName.trim(),
    isRecyclable: !!isRecyclable,
    disposalGuideline: disposalGuideline?.trim() || "",
    icon: icon || "",
    color: color || "#6B7280",
    rewardPointsPerKg: Number(rewardPointsPerKg) || 0,
  });

  return sendSuccess(res, 201, "Waste category created", { category });
});

// @route  PUT /api/waste-categories/:id
// @access admin
export const updateCategory = asyncHandler(async (req, res) => {
  const allowedFields = [
    "displayName",
    "isRecyclable",
    "disposalGuideline",
    "icon",
    "color",
    "rewardPointsPerKg",
    "isActive",
  ];

  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const category = await WasteCategory.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!category) {
    return sendError(res, 404, "Category not found");
  }

  return sendSuccess(res, 200, "Category updated", { category });
});
