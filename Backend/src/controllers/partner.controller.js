import RecyclingPartner from "../models/RecyclingPartner.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validatePartnerProfileUpdate } from "../validations/partner.validation.js";

// ─── Partner-facing request management ───────────────────────────────────────

// @route  GET /api/partners/requests
// @access partner
export const getOwnRequests = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findOne({ user: req.user._id });
  if (!partner) return sendError(res, 404, "Partner profile not found");

  const { status, page = 1, limit = 20 } = req.query;
  const filter = { partner: partner._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    RecyclingRequest.find(filter)
      .populate("resident", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    RecyclingRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Requests fetched", {
    requests,
    pagination: { total, page: Number(page), limit: Number(limit) },
  });
});

// @route  PATCH /api/partners/requests/:id/status
// @access partner
// Handles partner actions: accepted, rejected, in_progress, completed.
const PARTNER_ALLOWED_TRANSITIONS = {
  assigned: ["accepted", "rejected"],
  accepted: ["in_progress"],
  in_progress: ["completed"],
};

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) return sendError(res, 400, "Status is required");

  const partner = await RecyclingPartner.findOne({ user: req.user._id });
  if (!partner) return sendError(res, 404, "Partner profile not found");

  const request = await RecyclingRequest.findOne({
    _id: req.params.id,
    partner: partner._id,
  });

  if (!request) return sendError(res, 404, "Request not found");

  const allowed = PARTNER_ALLOWED_TRANSITIONS[request.status];
  if (!allowed || !allowed.includes(status)) {
    return sendError(
      res,
      400,
      `Cannot transition from '${request.status}' to '${status}'`
    );
  }

  request.status = status;

  // Award resident points on completion.
  if (status === "completed") {
    const pointsEarned = request.materials.reduce(
      (sum, m) => sum + Math.floor(m.estimatedQuantity * 10),
      0
    );
    request.rewardPointsEarned = pointsEarned;
    if (pointsEarned > 0) {
      await ResidentProfile.findOneAndUpdate(
        { user: request.resident },
        { $inc: { totalRewardPoints: pointsEarned } }
      );
    }
  }

  await request.save();

  return sendSuccess(res, 200, `Request updated to '${status}'`, { request });
});


// ─── Partner-owned endpoints ──────────────────────────────────────────────────

// @route  GET /api/partners/profile
// @access partner
export const getOwnProfile = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findOne({ user: req.user._id })
    .populate("user", "name email phone")
    .populate("serviceAreas", "name city");

  if (!partner) {
    return sendError(res, 404, "Partner profile not found");
  }

  return sendSuccess(res, 200, "Profile fetched successfully", { partner });
});

// @route  PUT /api/partners/profile
// @access partner
export const updateOwnProfile = asyncHandler(async (req, res) => {
  const { isValid, errors } = validatePartnerProfileUpdate(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const allowedFields = [
    "organizationName",
    "organizationType",
    "contactEmail",
    "contactPhone",
    "address",
    "serviceAreas",
    "acceptedMaterials",
    "description",
    "logo",
  ];

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Sync name/phone on User doc too.
  const userUpdates = {};
  if (req.body.name) userUpdates.name = req.body.name.trim();
  if (req.body.phone) userUpdates.phone = req.body.phone.trim();
  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

  const partner = await RecyclingPartner.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate("user", "name email phone")
    .populate("serviceAreas", "name city");

  if (!partner) {
    return sendError(res, 404, "Profile not found");
  }

  return sendSuccess(res, 200, "Profile updated successfully", { partner });
});

// ─── Admin-only endpoints ─────────────────────────────────────────────────────

// @route  GET /api/partners
// @access admin
export const getAllPartners = asyncHandler(async (req, res) => {
  const { isVerified, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (isVerified !== undefined) {
    filter.isVerified = isVerified === "true";
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [partners, total] = await Promise.all([
    RecyclingPartner.find(filter)
      .populate("user", "name email phone isActive")
      .populate("serviceAreas", "name city")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    RecyclingPartner.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Partners fetched successfully", {
    partners,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @route  GET /api/partners/:id
// @access admin
export const getPartnerById = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findById(req.params.id)
    .populate("user", "name email phone isActive createdAt")
    .populate("serviceAreas", "name city")
    .populate("verifiedBy", "name email");

  if (!partner) {
    return sendError(res, 404, "Partner not found");
  }

  return sendSuccess(res, 200, "Partner fetched successfully", { partner });
});

// @route  PATCH /api/partners/:id/verify
// @access admin
// Toggles the partner's verification status. When verified, a notification
// is sent to the partner user.
export const verifyPartner = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findById(req.params.id).populate(
    "user",
    "_id name email"
  );

  if (!partner) {
    return sendError(res, 404, "Partner not found");
  }

  const isNowVerified = !partner.isVerified;

  partner.isVerified = isNowVerified;
  partner.verifiedBy = isNowVerified ? req.user._id : undefined;
  partner.verifiedAt = isNowVerified ? new Date() : undefined;

  await partner.save();

  // Notify the partner user.
  if (isNowVerified) {
    await Notification.create({
      recipient: partner.user._id,
      title: "Account Verified",
      message:
        "Your recycling partner account has been verified. You can now accept recycling requests.",
      type: "partner_verified",
      relatedDocument: partner._id,
      relatedModel: "RecyclingPartner",
    });
  }

  return sendSuccess(
    res,
    200,
    `Partner ${isNowVerified ? "verified" : "unverified"} successfully`,
    { partner }
  );
});
