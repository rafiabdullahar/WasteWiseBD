import Complaint from "../models/Complaint.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validateComplaintInput, validateStatusUpdate } from "../validations/complaint.validation.js";

// @route  POST /api/complaints
// @access Private (Resident)
export const createComplaint = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateComplaintInput(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  const complaint = await Complaint.create({
    resident: req.user._id,
    pickupRequest: req.body.pickupRequest || null,
    description: req.body.description,
  });

  return sendSuccess(res, 201, "Complaint submitted", { complaint });
});

// @route  GET /api/complaints/my
// @access Private (Resident) — resident sees only their own complaints
export const getMyComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find({ resident: req.user._id }).sort({ createdAt: -1 });
  return sendSuccess(res, 200, "Your complaints fetched", { complaints });
});

// @route  GET /api/complaints
// @access Private (Admin) — admin sees everyone's complaints
export const getAllComplaints = asyncHandler(async (req, res) => {
  const complaints = await Complaint.find()
    .populate("resident", "name email")
    .sort({ createdAt: -1 });
  return sendSuccess(res, 200, "All complaints fetched", { complaints });
});

// @route  PATCH /api/complaints/:id/status
// @access Private (Admin)
export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateStatusUpdate(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  const complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true, runValidators: true }
  );

  if (!complaint) return sendError(res, 404, "Complaint not found");

  return sendSuccess(res, 200, "Complaint status updated", { complaint });
});