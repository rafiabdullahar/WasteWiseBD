import User from "../models/User.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import RecyclingPartner from "../models/RecyclingPartner.model.js";
import RecyclingRequest from "../models/RecyclingRequest.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

const round = (value, digits = 1) =>
  Number((Number(value || 0)).toFixed(digits));

const DEFAULT_RECYCLING_STATUSES = {
  pending: 0,
  assigned: 0,
  accepted: 0,
  rejected: 0,
  in_progress: 0,
  completed: 0,
  cancelled: 0,
};

// @route  GET /api/admin/dashboard
// @access admin
export const getDashboardStats = asyncHandler(async (req, res) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    userSummaryRows,
    usersByRoleRows,
    partnerSummaryRows,
    collectorSummaryRows,
    collectorPerformanceRows,
    topCollectors,
    recyclingStatusRows,
    recyclingQuantityRows,
    materialBreakdown,
    monthlyTrend,
    recentUsers,
  ] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ["$isActive", 1, 0] } },
          inactive: { $sum: { $cond: ["$isActive", 0, 1] } },
        },
      },
    ]),

    User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    RecyclingPartner.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          verified: { $sum: { $cond: ["$isVerified", 1, 0] } },
          pendingVerification: {
            $sum: { $cond: ["$isVerified", 0, 1] },
          },
          totalRecycledKg: { $sum: "$totalRecycled" },
          totalRequestsHandled: { $sum: "$totalRequestsHandled" },
        },
      },
    ]),

    CollectorProfile.aggregate([
      {
        $group: {
          _id: null,
          totalProfiles: { $sum: 1 },
          available: { $sum: { $cond: ["$isAvailable", 1, 0] } },
          unavailable: { $sum: { $cond: ["$isAvailable", 0, 1] } },
        },
      },
    ]),

    CollectorProfile.aggregate([
      {
        $group: {
          _id: null,
          totalCompleted: { $sum: "$totalCompleted" },
          totalFailed: { $sum: "$totalFailed" },
          ratedCollectors: {
            $sum: { $cond: [{ $gt: ["$averageRating", 0] }, 1, 0] },
          },
          ratingTotal: {
            $sum: {
              $cond: [
                { $gt: ["$averageRating", 0] },
                "$averageRating",
                0,
              ],
            },
          },
        },
      },
    ]),

    CollectorProfile.find()
      .populate("user", "name email isActive")
      .sort({ totalCompleted: -1, averageRating: -1 })
      .limit(5)
      .select(
        "user employeeId vehicleType isAvailable totalCompleted totalFailed averageRating"
      )
      .lean(),

    RecyclingRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    RecyclingRequest.aggregate([
      { $unwind: "$materials" },
      {
        $group: {
          _id: null,
          totalRequestedQuantityKg: {
            $sum: "$materials.estimatedQuantity",
          },
          completedQuantityKg: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                "$materials.estimatedQuantity",
                0,
              ],
            },
          },
        },
      },
    ]),

    RecyclingRequest.aggregate([
      { $unwind: "$materials" },
      {
        $group: {
          _id: "$materials.category",
          requestItems: { $sum: 1 },
          quantityKg: { $sum: "$materials.estimatedQuantity" },
          completedQuantityKg: {
            $sum: {
              $cond: [
                { $eq: ["$status", "completed"] },
                "$materials.estimatedQuantity",
                0,
              ],
            },
          },
        },
      },
      { $sort: { quantityKg: -1 } },
    ]),

    RecyclingRequest.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $project: {
          status: 1,
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          quantityKg: { $sum: "$materials.estimatedQuantity" },
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalRequests: { $sum: 1 },
          completedRequests: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          quantityKg: { $sum: "$quantityKg" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),

    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt isActive")
      .lean(),
  ]);

  const userSummary = userSummaryRows[0] || {
    total: 0,
    active: 0,
    inactive: 0,
  };

  const usersByRole = usersByRoleRows.reduce(
    (acc, current) => {
      acc[current._id] = current.count;
      return acc;
    },
    { resident: 0, collector: 0, partner: 0, admin: 0 }
  );

  const partnerSummary = partnerSummaryRows[0] || {
    total: 0,
    verified: 0,
    pendingVerification: 0,
    totalRecycledKg: 0,
    totalRequestsHandled: 0,
  };

  const collectorSummary = collectorSummaryRows[0] || {
    totalProfiles: 0,
    available: 0,
    unavailable: 0,
  };

  const collectorPerformance = collectorPerformanceRows[0] || {
    totalCompleted: 0,
    totalFailed: 0,
    ratedCollectors: 0,
    ratingTotal: 0,
  };

  const recyclingByStatus = recyclingStatusRows.reduce(
    (acc, current) => {
      acc[current._id] = current.count;
      return acc;
    },
    { ...DEFAULT_RECYCLING_STATUSES }
  );

  const recyclingTotal = Object.values(recyclingByStatus).reduce(
    (sum, count) => sum + count,
    0
  );

  const activeRecyclingRequests =
    recyclingByStatus.assigned +
    recyclingByStatus.accepted +
    recyclingByStatus.in_progress;

  const actionableRecyclingRequests =
    recyclingTotal - recyclingByStatus.cancelled;

  const recyclingCompletionRate = actionableRecyclingRequests
    ? round(
        (recyclingByStatus.completed / actionableRecyclingRequests) * 100
      )
    : 0;

  const totalCollectorTasks =
    collectorPerformance.totalCompleted + collectorPerformance.totalFailed;

  const collectorSuccessRate = totalCollectorTasks
    ? round((collectorPerformance.totalCompleted / totalCollectorTasks) * 100)
    : 0;

  const averageCollectorRating = collectorPerformance.ratedCollectors
    ? round(
        collectorPerformance.ratingTotal /
          collectorPerformance.ratedCollectors,
        2
      )
    : 0;

  const efficiencyInputs = [];
  if (actionableRecyclingRequests > 0) {
    efficiencyInputs.push(recyclingCompletionRate);
  }
  if (totalCollectorTasks > 0) {
    efficiencyInputs.push(collectorSuccessRate);
  }

  const operationalEfficiency = efficiencyInputs.length
    ? round(
        efficiencyInputs.reduce((sum, value) => sum + value, 0) /
          efficiencyInputs.length
      )
    : 0;

  const recyclingQuantities = recyclingQuantityRows[0] || {
    totalRequestedQuantityKg: 0,
    completedQuantityKg: 0,
  };

  return sendSuccess(res, 200, "Dashboard stats fetched", {
    users: {
      total: userSummary.total,
      active: userSummary.active,
      inactive: userSummary.inactive,
      residents: usersByRole.resident,
      collectors: usersByRole.collector,
      partners: usersByRole.partner,
      admins: usersByRole.admin,
      byRole: usersByRole,
    },

    partners: {
      total: partnerSummary.total,
      verified: partnerSummary.verified,
      pendingVerification: partnerSummary.pendingVerification,
      totalRecycledKg: round(partnerSummary.totalRecycledKg, 2),
      totalRequestsHandled: partnerSummary.totalRequestsHandled,
    },

    collectors: {
      totalProfiles: collectorSummary.totalProfiles,
      available: collectorSummary.available,
      unavailable: collectorSummary.unavailable,
      totalCompleted: collectorPerformance.totalCompleted,
      totalFailed: collectorPerformance.totalFailed,
      successRate: collectorSuccessRate,
      averageRating: averageCollectorRating,
      topPerformers: topCollectors,
    },

    recycling: {
      byStatus: recyclingByStatus,
      total: recyclingTotal,
      pending: recyclingByStatus.pending,
      active: activeRecyclingRequests,
      completed: recyclingByStatus.completed,
      unsuccessful:
        recyclingByStatus.rejected + recyclingByStatus.cancelled,
      totalRequestedQuantityKg: round(
        recyclingQuantities.totalRequestedQuantityKg,
        2
      ),
      completedQuantityKg: round(
        recyclingQuantities.completedQuantityKg,
        2
      ),
      completionRate: recyclingCompletionRate,
      materialBreakdown: materialBreakdown.map((item) => ({
        category: item._id,
        requestItems: item.requestItems,
        quantityKg: round(item.quantityKg, 2),
        completedQuantityKg: round(item.completedQuantityKg, 2),
      })),
      monthlyTrend: monthlyTrend.map((item) => ({
        year: item._id.year,
        month: item._id.month,
        totalRequests: item.totalRequests,
        completedRequests: item.completedRequests,
        quantityKg: round(item.quantityKg, 2),
      })),
    },

    operations: {
      operationalEfficiency,
      pendingActions:
        recyclingByStatus.pending + partnerSummary.pendingVerification,
      generatedAt: new Date(),
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
