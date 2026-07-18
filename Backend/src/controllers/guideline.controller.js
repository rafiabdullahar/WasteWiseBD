import DisposalGuideline from "../models/DisposalGuideline.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validateGuidelineInput } from "../validations/guideline.validation.js";

// @route  GET /api/guidelines
// @access Public
export const getAllGuidelines = asyncHandler(async (req, res) => {
  const guidelines = await DisposalGuideline.find().sort({ wasteCategory: 1 });
  return sendSuccess(res, 200, "Guidelines fetched", { guidelines });
});

// @route  GET /api/guidelines/:category
// @access Public
export const getGuidelineByCategory = asyncHandler(async (req, res) => {
  const guideline = await DisposalGuideline.findOne({
    wasteCategory: req.params.category,
  });

  if (!guideline) {
    return sendError(res, 404, "No guideline found for this category");
  }

  return sendSuccess(res, 200, "Guideline fetched", { guideline });
});

// @route  POST /api/guidelines
// @access Private (Admin)
export const createGuideline = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateGuidelineInput(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  const existing = await DisposalGuideline.findOne({ wasteCategory: req.body.wasteCategory });
  if (existing) {
    return sendError(res, 409, "A guideline for this category already exists");
  }

  const guideline = await DisposalGuideline.create(req.body);
  return sendSuccess(res, 201, "Guideline created", { guideline });
});

// @route  PUT /api/guidelines/:id
// @access Private (Admin)
export const updateGuideline = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateGuidelineInput(req.body, true);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  const guideline = await DisposalGuideline.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!guideline) return sendError(res, 404, "Guideline not found");

  return sendSuccess(res, 200, "Guideline updated", { guideline });
});

// @route  DELETE /api/guidelines/:id
// @access Private (Admin)
export const deleteGuideline = asyncHandler(async (req, res) => {
  const guideline = await DisposalGuideline.findByIdAndDelete(req.params.id);
  if (!guideline) return sendError(res, 404, "Guideline not found");

  return sendSuccess(res, 200, "Guideline deleted", {});
});