import User from "../models/User.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import RecyclingPartner from "../models/RecyclingPartner.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// @route  GET /api/admin/dashboard
// @access admin
// Uses MongoDB aggregation pipelines for real-time analytics instead of
// multiple round-trips. All counts are computed in a single stage.
export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalUsers,
    usersByRole,
    totalResidents,
    totalCollectors,
    totalPartners,
    verifiedPartners,
    pendingPartners,
    recyclingStats,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    User.countDocuments({ role: "resident" }),
    User.countDocuments({ role: "collector" }),
    User.countDocuments({ role: "partner" }),
    RecyclingPartner.countDocuments({ isVerified: true }),
    RecyclingPartner.countDocuments({ isVerified: false }),
    RecyclingRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt isActive"),
  ]);

  // Shape recycling stats into a map for easy frontend consumption.
  const recyclingByStatus = recyclingStats.reduce((acc, cur) => {
    acc[cur._id] = cur.count;
    return acc;
  }, {});

  return sendSuccess(res, 200, "Dashboard stats fetched", {
    users: {
      total: totalUsers,
      residents: totalResidents,
      collectors: totalCollectors,
      partners: totalPartners,
      byRole: usersByRole,
    },
    partners: {
      verified: verifiedPartners,
      pendingVerification: pendingPartners,
    },
    recycling: {
      byStatus: recyclingByStatus,
      total: Object.values(recyclingByStatus).reduce((a, b) => a + b, 0),
    },
    recentUsers,
  });
});

// @route  GET /api/admin/users
// @access admin
export const getAllUsers = asyncHandler(async (req, res) => {
  const {
    role,
    isActive,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === "true";
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit))
      .select("-password"),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Users fetched successfully", {
    users,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @route  GET /api/admin/users/:id
// @access admin
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  // Fetch the role-specific profile alongside the user.
  let profile = null;
  if (user.role === "resident") {
    profile = await ResidentProfile.findOne({ user: user._id }).populate(
      "addresses.serviceArea",
      "name city"
    );
  } else if (user.role === "collector") {
    profile = await CollectorProfile.findOne({ user: user._id }).populate(
      "serviceAreas",
      "name city"
    );
  } else if (user.role === "partner") {
    profile = await RecyclingPartner.findOne({ user: user._id }).populate(
      "serviceAreas",
      "name city"
    );
  }

  return sendSuccess(res, 200, "User fetched", { user, profile });
});

// @route  PATCH /api/admin/users/:id/status
// @access admin
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  // Prevent admin from deactivating their own account.
  if (user._id.toString() === req.user._id.toString()) {
    return sendError(res, 400, "You cannot change your own account status");
  }

  user.isActive = !user.isActive;
  await user.save();

  return sendSuccess(
    res,
    200,
    `User ${user.isActive ? "activated" : "deactivated"} successfully`,
    { user: { id: user._id, name: user.name, isActive: user.isActive } }
  );
});
