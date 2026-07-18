import CollectorProfile from "../models/CollectorProfile.model.js";
import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

const VALID_VEHICLE_TYPES = ["truck", "van", "rickshaw", "motorcycle", "other"];

// @route  GET /api/collectors/profile
// @access collector
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await CollectorProfile.findOne({ user: req.user._id })
    .populate("user", "name email phone")
    .populate("serviceAreas", "name city");

  if (!profile) {
    return sendError(res, 404, "Collector profile not found");
  }

  return sendSuccess(res, 200, "Profile fetched successfully", { profile });
});

// @route  PUT /api/collectors/profile
// @access collector
export const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "vehicleType",
    "vehicleNumber",
    "workSchedule",
    "profilePicture",
    "isAvailable",
    "serviceAreas",
    "employeeId",
  ];

  // Validate vehicleType if provided
  if (
    req.body.vehicleType &&
    !VALID_VEHICLE_TYPES.includes(req.body.vehicleType)
  ) {
    return sendError(
      res,
      400,
      `Vehicle type must be one of: ${VALID_VEHICLE_TYPES.join(", ")}`
    );
  }

  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Allow updating User-level name/phone in the same call.
  const userUpdates = {};
  if (req.body.name) userUpdates.name = req.body.name.trim();
  if (req.body.phone) userUpdates.phone = req.body.phone.trim();
  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

  const profile = await CollectorProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    { new: true, runValidators: true }
  )
    .populate("user", "name email phone")
    .populate("serviceAreas", "name city");

  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  return sendSuccess(res, 200, "Profile updated successfully", { profile });
});

// @route  GET /api/collectors/performance
// @access collector
export const getPerformance = asyncHandler(async (req, res) => {
  const profile = await CollectorProfile.findOne({
    user: req.user._id,
  }).select("totalCompleted totalFailed averageRating");

  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  const total = profile.totalCompleted + profile.totalFailed;
  const successRate =
    total > 0
      ? ((profile.totalCompleted / total) * 100).toFixed(1)
      : "0.0";

  return sendSuccess(res, 200, "Performance data fetched", {
    performance: {
      totalCompleted: profile.totalCompleted,
      totalFailed: profile.totalFailed,
      total,
      successRate: `${successRate}%`,
      averageRating: profile.averageRating,
    },
  });
});
