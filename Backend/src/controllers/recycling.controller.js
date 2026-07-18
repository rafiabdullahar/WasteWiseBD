import mongoose from "mongoose";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import RecyclingPartner from "../models/RecyclingPartner.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import RewardTransaction from "../models/RewardTransaction.model.js";
import WasteCategory from "../models/WasteCategory.model.js";
import Notification from "../models/Notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validateCreateRecyclingRequest } from "../validations/recycling.validation.js";

// ─── Helper: find the best available verified partner for a service area ──────
const findAvailablePartner = async (serviceAreaId, requiredMaterials) => {
  const materialCategories = requiredMaterials.map((m) => m.category);

  // Find verified partners in the service area that accept all requested materials.
  const partner = await RecyclingPartner.findOne({
    isVerified: true,
    serviceAreas: serviceAreaId,
    acceptedMaterials: { $all: materialCategories },
  }).populate("user", "_id");

  return partner || null;
};

// ─── Resident endpoints ───────────────────────────────────────────────────────

// @route  POST /api/recycling
// @access resident
export const createRecyclingRequest = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateCreateRecyclingRequest(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const {
    pickupAddress,
    serviceArea,
    materials,
    preferredDate,
    preferredTimeSlot,
    notes,
  } = req.body;

  const residentProfile = await ResidentProfile.findOne({
    user: req.user._id,
  });
  if (!residentProfile) {
    return sendError(res, 404, "Resident profile not found");
  }

  // Try to auto-assign a partner.
  const partner = await findAvailablePartner(serviceArea, materials);

  const request = await RecyclingRequest.create({
    resident: req.user._id,
    residentProfile: residentProfile._id,
    partner: partner?._id || undefined,
    pickupAddress,
    serviceArea,
    materials,
    preferredDate,
    preferredTimeSlot: preferredTimeSlot || "morning",
    notes: notes || "",
    status: partner ? "assigned" : "pending",
  });

  // Notify the partner if one was auto-assigned.
  if (partner) {
    await Notification.create({
      recipient: partner.user._id,
      title: "New Recycling Request",
      message: `A new recycling request has been assigned to you for ${new Date(preferredDate).toLocaleDateString()}.`,
      type: "recycling_accepted",
      relatedDocument: request._id,
      relatedModel: "RecyclingRequest",
    });
  }

  return sendSuccess(res, 201, "Recycling request submitted successfully", {
    request,
  });
});

// @route  GET /api/recycling
// @access resident
export const getMyRecyclingRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const filter = { resident: req.user._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    RecyclingRequest.find(filter)
      .populate("partner", "organizationName contactPhone")
      .populate("serviceArea", "name city")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    RecyclingRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Recycling requests fetched", {
    requests,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @route  GET /api/recycling/:id
// @access resident | partner | admin
export const getRecyclingRequestById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid request ID");
  }

  const request = await RecyclingRequest.findById(req.params.id)
    .populate("resident", "name email phone")
    .populate("partner", "organizationName contactPhone contactEmail")
    .populate("serviceArea", "name city");

  if (!request) {
    return sendError(res, 404, "Recycling request not found");
  }

  // Authorization: residents can only see their own requests.
  if (
    req.user.role === "resident" &&
    request.resident._id.toString() !== req.user._id.toString()
  ) {
    return sendError(res, 403, "Not authorized to view this request");
  }

  // Authorization: partners can only see requests assigned to them.
  if (req.user.role === "partner") {
    const partnerDoc = await RecyclingPartner.findOne({ user: req.user._id });
    if (!partnerDoc || request.partner?.toString() !== partnerDoc._id.toString()) {
      return sendError(res, 403, "Not authorized to view this request");
    }
  }

  return sendSuccess(res, 200, "Request fetched", { request });
});

// ─── Partner endpoints ────────────────────────────────────────────────────────

// @route  GET /api/recycling/partner/requests
// @access partner
export const getPartnerRequests = asyncHandler(async (req, res) => {
  const partnerDoc = await RecyclingPartner.findOne({ user: req.user._id });
  if (!partnerDoc) {
    return sendError(res, 404, "Partner profile not found");
  }

  if (!partnerDoc.isVerified) {
    return sendError(
      res,
      403,
      "Your account is pending verification by the administrator"
    );
  }

  const { status, page = 1, limit = 10 } = req.query;
  const filter = { partner: partnerDoc._id };
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    RecyclingRequest.find(filter)
      .populate("resident", "name email phone")
      .populate("serviceArea", "name city")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    RecyclingRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Partner requests fetched", {
    requests,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @route  PATCH /api/recycling/:id/accept
// @access partner
export const acceptRequest = asyncHandler(async (req, res) => {
  const partnerDoc = await RecyclingPartner.findOne({
    user: req.user._id,
  }).populate("user", "_id");

  if (!partnerDoc) return sendError(res, 404, "Partner profile not found");
  if (!partnerDoc.isVerified)
    return sendError(res, 403, "Account not yet verified");

  const request = await RecyclingRequest.findById(req.params.id);
  if (!request) return sendError(res, 404, "Request not found");

  if (request.partner?.toString() !== partnerDoc._id.toString()) {
    return sendError(res, 403, "This request is not assigned to you");
  }

  if (!["assigned", "pending"].includes(request.status)) {
    return sendError(res, 400, `Cannot accept a request in '${request.status}' status`);
  }

  request.status = "accepted";
  request.acceptedAt = new Date();
  await request.save();

  // Notify resident
  await Notification.create({
    recipient: request.resident,
    title: "Recycling Request Accepted",
    message: `Your recycling pickup request for ${new Date(request.preferredDate).toLocaleDateString()} has been accepted by the partner.`,
    type: "recycling_accepted",
    relatedDocument: request._id,
    relatedModel: "RecyclingRequest",
  });

  return sendSuccess(res, 200, "Request accepted", { request });
});

// @route  PATCH /api/recycling/:id/reject
// @access partner
export const rejectRequest = asyncHandler(async (req, res) => {
  const partnerDoc = await RecyclingPartner.findOne({ user: req.user._id });
  if (!partnerDoc) return sendError(res, 404, "Partner profile not found");
  if (!partnerDoc.isVerified)
    return sendError(res, 403, "Account not yet verified");

  const request = await RecyclingRequest.findById(req.params.id);
  if (!request) return sendError(res, 404, "Request not found");

  if (request.partner?.toString() !== partnerDoc._id.toString()) {
    return sendError(res, 403, "This request is not assigned to you");
  }

  if (!["assigned", "pending"].includes(request.status)) {
    return sendError(res, 400, `Cannot reject a request in '${request.status}' status`);
  }

  const { reason } = req.body;
  request.status = "rejected";
  request.rejectionReason = reason?.trim() || "No reason provided";
  request.partner = undefined; // un-assign so it can be re-assigned
  await request.save();

  // Notify resident
  await Notification.create({
    recipient: request.resident,
    title: "Recycling Request Rejected",
    message: `Your recycling request has been rejected by the partner. Reason: ${request.rejectionReason}`,
    type: "recycling_rejected",
    relatedDocument: request._id,
    relatedModel: "RecyclingRequest",
  });

  return sendSuccess(res, 200, "Request rejected", { request });
});

// @route  PATCH /api/recycling/:id/status
// @access partner
export const updateRequestStatus = asyncHandler(async (req, res) => {
  const partnerDoc = await RecyclingPartner.findOne({ user: req.user._id });
  if (!partnerDoc) return sendError(res, 404, "Partner profile not found");

  const { status } = req.body;
  const ALLOWED_PARTNER_TRANSITIONS = {
    accepted: ["in_progress"],
    in_progress: ["completed"],
  };

  const request = await RecyclingRequest.findById(req.params.id);
  if (!request) return sendError(res, 404, "Request not found");

  if (request.partner?.toString() !== partnerDoc._id.toString()) {
    return sendError(res, 403, "This request is not assigned to you");
  }

  const allowedNext = ALLOWED_PARTNER_TRANSITIONS[request.status];
  if (!allowedNext || !allowedNext.includes(status)) {
    return sendError(
      res,
      400,
      `Cannot transition from '${request.status}' to '${status}'`
    );
  }

  request.status = status;

  if (status === "completed") {
    request.completedAt = new Date();

    // Award reward points — sum up points for each material by kg.
    const categories = request.materials.map((m) => m.category);
    const wasteCats = await WasteCategory.find({ name: { $in: categories } });

    let totalPoints = 0;
    for (const mat of request.materials) {
      const cat = wasteCats.find((wc) => wc.name === mat.category);
      if (cat && cat.rewardPointsPerKg > 0) {
        totalPoints += Math.floor(cat.rewardPointsPerKg * mat.estimatedQuantity);
      }
    }

    if (totalPoints > 0) {
      request.rewardPointsEarned = totalPoints;

      // Credit to resident profile.
      await ResidentProfile.findOneAndUpdate(
        { user: request.resident },
        { $inc: { totalRewardPoints: totalPoints } }
      );

      // Log the transaction.
      const residentProfile = await ResidentProfile.findOne({
        user: request.resident,
      });
      await RewardTransaction.create({
        resident: request.resident,
        residentProfile: residentProfile._id,
        type: "earned",
        points: totalPoints,
        reason: "recycling_completed",
        description: `Earned for recycling request #${request._id}`,
        sourceDocument: request._id,
        sourceModel: "RecyclingRequest",
      });
    }

    // Update partner stats.
    await RecyclingPartner.findByIdAndUpdate(partnerDoc._id, {
      $inc: { totalRequestsHandled: 1 },
    });

    // Notify resident.
    await Notification.create({
      recipient: request.resident,
      title: "Recycling Completed!",
      message: `Your recycling pickup has been completed. You earned ${totalPoints} reward points!`,
      type: "recycling_completed",
      relatedDocument: request._id,
      relatedModel: "RecyclingRequest",
    });
  }

  await request.save();

  return sendSuccess(res, 200, "Status updated successfully", { request });
});

// ─── Admin endpoints ──────────────────────────────────────────────────────────

// @route  GET /api/recycling/admin/all
// @access admin
export const getAllRecyclingRequests = asyncHandler(async (req, res) => {
  const { status, partnerId, serviceAreaId, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (partnerId) filter.partner = partnerId;
  if (serviceAreaId) filter.serviceArea = serviceAreaId;

  const skip = (Number(page) - 1) * Number(limit);

  const [requests, total] = await Promise.all([
    RecyclingRequest.find(filter)
      .populate("resident", "name email")
      .populate("partner", "organizationName")
      .populate("serviceArea", "name city")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    RecyclingRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "All recycling requests fetched", {
    requests,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});
