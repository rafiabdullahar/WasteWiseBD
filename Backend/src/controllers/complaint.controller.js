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
    category: req.body.category,
    description: req.body.description || "",
    area: req.body.area || "",
    missedDate: req.body.missedDate || null,
    evidenceUrl: req.file ? `/uploads/complaints/${req.file.filename}` : "",
  });

  return sendSuccess(res, 201, "Complaint submitted", { complaint });
});
// @route  PUT /api/complaints/:id
// @access Private (Resident, own complaint, only while status is "Open")
export const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return sendError(res, 404, "Complaint not found");
  }

  if (complaint.resident.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "You can only edit your own complaints");
  }

  if (complaint.status !== "Open") {
    return sendError(
      res,
      409,
      `This complaint cannot be edited because it is already ${complaint.status.toLowerCase()}`
    );
  }

  const { isValid, errors } = validateComplaintInput(req.body);
  if (!isValid) return sendError(res, 400, "Validation failed", errors);

  complaint.category = req.body.category || complaint.category;
  complaint.description = req.body.description || "";
  complaint.area = req.body.area || "";
  complaint.missedDate = req.body.missedDate || null;
  await complaint.save();

  return sendSuccess(res, 200, "Complaint updated", { complaint });
});

// @route  DELETE /api/complaints/:id
// @access Private (Resident, own complaint, only while status is "Open")
export const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return sendError(res, 404, "Complaint not found");
  }

  if (complaint.resident.toString() !== req.user._id.toString()) {
    return sendError(res, 403, "You can only delete your own complaints");
  }

  if (complaint.status !== "Open") {
    return sendError(
      res,
      409,
      `This complaint cannot be deleted because it is already ${complaint.status.toLowerCase()}`
    );
  }

  await complaint.deleteOne();

  return sendSuccess(res, 200, "Complaint deleted", {});
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