// Backend/src/controllers/overflowReport.controller.js

import OverflowReport from "../models/OverflowReport.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  validateOverflowReportInput,
  validateOverflowStatusUpdate,
} from "../validations/overflowReport.validation.js";

// @route  POST /api/overflow-reports
// @access Private (Resident)
export const createOverflowReport = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateOverflowReportInput(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  if (!req.file) {
    return sendError(res, 400, "A photo of the overflowing bin is required");
  }

  const report = await OverflowReport.create({
    resident: req.user._id,
    area: req.body.area,
    locationDescription: req.body.locationDescription,
    description: req.body.description || "",
    photoUrl: req.file.path, // Cloudinary URL, provided by multer-storage-cloudinary
  });

  return sendSuccess(res, 201, "Overflow report submitted", { report });
});

// @route  PUT /api/overflow-reports/:id
// @access Private (Resident, own report, only while status is "Pending")
export const updateOverflowReport = asyncHandler(async (req, res) => {
  const report = await OverflowReport.findById(req.params.id);

  if (!report) {
    return sendError(res, 404, "Overflow report not found");
  }

  if (report.resident.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "You can only edit your own reports");
  }

  if (report.status !== "Pending") {
    return sendError(
      res,
      409,
      `This report cannot be edited because it is already ${report.status.toLowerCase()}`
    );
  }

  const { isValid, errors } = validateOverflowReportInput(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  report.area = req.body.area;
  report.locationDescription = req.body.locationDescription;
  report.description = req.body.description || "";

  if (req.file) {
    report.photoUrl = req.file.path;
  }

  await report.save();

  return sendSuccess(res, 200, "Overflow report updated", { report });
});

// @route  DELETE /api/overflow-reports/:id
// @access Private (Resident, own report, only while status is "Pending")
export const deleteOverflowReport = asyncHandler(async (req, res) => {
  const report = await OverflowReport.findById(req.params.id);

  if (!report) {
    return sendError(res, 404, "Overflow report not found");
  }

  if (report.resident.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "You can only delete your own reports");
  }

  if (report.status !== "Pending") {
    return sendError(
      res,
      409,
      `This report cannot be deleted because it is already ${report.status.toLowerCase()}`
    );
  }

  await report.deleteOne();

  return sendSuccess(res, 200, "Overflow report deleted", {});
});

// @route  GET /api/overflow-reports/my
// @access Private (Resident) — resident sees only their own reports
export const getMyOverflowReports = asyncHandler(async (req, res) => {
  const reports = await OverflowReport.find({ resident: req.user._id })
    .populate("area", "name")
    .sort({ createdAt: -1 });
  return sendSuccess(res, 200, "Your overflow reports fetched", { reports });
});

// @route  GET /api/overflow-reports
// @access Private (Admin) — admin sees everyone's reports
export const getAllOverflowReports = asyncHandler(async (req, res) => {
  const reports = await OverflowReport.find()
    .populate("resident", "name email")
    .populate("area", "name")
    .sort({ createdAt: -1 });
  return sendSuccess(res, 200, "All overflow reports fetched", { reports });
});

// @route  PATCH /api/overflow-reports/:id/status
// @access Private (Admin)
export const updateOverflowReportStatus = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateOverflowStatusUpdate(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  const report = await OverflowReport.findById(req.params.id);
  if (!report) return sendError(res, 404, "Overflow report not found");

  report.status = req.body.status;

  if (req.body.status === "Resolved") {
    report.resolvedAt = new Date();
    report.resolvedBy = req.user._id;
  }

  await report.save();
  await report.populate("resident", "name email");
  await report.populate("area", "name");

  return sendSuccess(res, 200, "Overflow report status updated", { report });
});

