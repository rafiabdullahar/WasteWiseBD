import RecyclingPartner from "../models/RecyclingPartner.model.js";
import User from "../models/User.model.js";
import Notification from "../models/Notification.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validatePartnerProfileUpdate } from "../validations/partner.validation.js";
import { creditRecyclingReward } from "../utils/rewards.js";

// ─── Partner-facing request management ───────────────────────────────────────

// @route  GET /api/partners/requests
// @access partner
//
// The partner's OWN requests — ones they have already claimed (accepted /
// in_progress / completed / rejected). The shared, unclaimed pool is served
// separately by getAvailableRequests.
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
      .populate("serviceArea", "name city")
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

// @route  GET /api/partners/requests/available
// @access partner (verified)
//
// The shared claim pool: pending, unclaimed recycling requests in a service
// area this partner serves, where the partner accepts at least one of the
// requested materials. Any eligible partner sees the same pool; the first to
// claim a request removes it from everyone else's pool (see claimRequest).
export const getAvailableRequests = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findOne({ user: req.user._id });
  if (!partner) return sendError(res, 404, "Partner profile not found");

  if (!partner.isVerified) {
    return sendError(
      res,
      403,
      "Your account is pending verification by the administrator"
    );
  }

  // A partner with no service areas or no accepted materials has an empty pool.
  if (
    !partner.serviceAreas?.length ||
    !partner.acceptedMaterials?.length
  ) {
    return sendSuccess(res, 200, "Available requests fetched", {
      requests: [],
    });
  }

  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = {
    status: "pending",
    partner: { $in: [null, undefined] },
    serviceArea: { $in: partner.serviceAreas },
    "materials.category": { $in: partner.acceptedMaterials },
  };

  const [requests, total] = await Promise.all([
    RecyclingRequest.find(filter)
      .populate("resident", "name email")
      .populate("serviceArea", "name city")
      .sort({ preferredDate: 1, createdAt: 1 })
      .skip(skip)
      .limit(Number(limit)),
    RecyclingRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Available requests fetched", {
    requests,
    pagination: { total, page: Number(page), limit: Number(limit) },
  });
});

// @route  PATCH /api/partners/requests/:id/claim
// @access partner (verified)
//
// Atomically claim a request from the shared pool. The findOneAndUpdate filter
// requires the request to still be pending and unclaimed, so if two partners
// click "Accept" at the same time, only the first write succeeds — the second
// matches no document and gets a 409. This is what guarantees a request can
// belong to exactly one partner.
export const claimRequest = asyncHandler(async (req, res) => {
  const partner = await RecyclingPartner.findOne({
    user: req.user._id,
  }).populate("user", "_id");

  if (!partner) return sendError(res, 404, "Partner profile not found");
  if (!partner.isVerified)
    return sendError(res, 403, "Account not yet verified");

  const request = await RecyclingRequest.findById(req.params.id);
  if (!request) return sendError(res, 404, "Request not found");

  // Guard: partner must serve this area and accept at least one material.
  const servesArea = partner.serviceAreas.some(
    (areaId) => areaId.toString() === request.serviceArea.toString()
  );
  const acceptsMaterial = request.materials.some((m) =>
    partner.acceptedMaterials.includes(m.category)
  );

  if (!servesArea || !acceptsMaterial) {
    return sendError(
      res,
      403,
      "This request is outside your service areas or accepted materials"
    );
  }

  // Atomic claim — only succeeds while the request is still pending & unclaimed.
  const claimed = await RecyclingRequest.findOneAndUpdate(
    {
      _id: request._id,
      status: "pending",
      partner: { $in: [null, undefined] },
    },
    {
      $set: {
        partner: partner._id,
        status: "accepted",
        acceptedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!claimed) {
    return sendError(
      res,
      409,
      "This request has already been claimed by another partner"
    );
  }

  // Notify the resident that a partner picked up their request.
  await Notification.create({
    recipient: claimed.resident,
    title: "Recycling Request Accepted",
    message: `Your recycling pickup request for ${new Date(
      claimed.preferredDate
    ).toLocaleDateString()} has been accepted by ${partner.organizationName}.`,
    type: "recycling_accepted",
    relatedDocument: claimed._id,
    relatedModel: "RecyclingRequest",
  });

  return sendSuccess(res, 200, "Request claimed successfully", {
    request: claimed,
  });
});

// @route  PATCH /api/partners/requests/:id/status
// @access partner
// Handles partner actions: accepted, rejected, in_progress, completed.
// A request enters the partner's hands at "accepted" (via claimRequest). From
// there the owning partner drives it forward, and may still reject/release it
// before starting work.
const PARTNER_ALLOWED_TRANSITIONS = {
  accepted: ["in_progress", "rejected"],
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

  // Releasing a claimed request: return it to the shared pool as unclaimed
  // rather than leaving a dead "rejected" record, so another partner in the
  // area can pick it up.
  if (status === "rejected") {
    request.status = "pending";
    request.partner = undefined;
    request.acceptedAt = undefined;
    await request.save();

    await Notification.create({
      recipient: request.resident,
      title: "Recycling Request Reopened",
      message:
        "A partner released your recycling request. It is back in the queue for another partner to accept.",
      type: "recycling_rejected",
      relatedDocument: request._id,
      relatedModel: "RecyclingRequest",
    });

    return sendSuccess(res, 200, "Request released back to the pool", {
      request,
    });
  }

  request.status = status;

  // On completion, credit the resident's reward points + ledger (shared helper
  // keeps balance and the RewardTransaction ledger in sync) and bump the
  // partner's handled-requests stat.
  if (status === "completed") {
    request.completedAt = new Date();
    await creditRecyclingReward({ request });
    await RecyclingPartner.findByIdAndUpdate(partner._id, {
      $inc: { totalRequestsHandled: 1 },
    });
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
