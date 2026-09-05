import mongoose from "mongoose";
import User from "../models/User.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import WastePickupRequest, {
  PICKUP_STATUSES,
} from "../models/WastePickupRequest.model.js";
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
            $sum: {
              $cond: [{ $gt: ["$averageRating", 0] }, 1, 0],
            },
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
      ),

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
            $sum: {
              $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
            },
          },
          quantityKg: { $sum: "$quantityKg" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]),


    User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email role createdAt isActive"),
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
    {
      resident: 0,
      collector: 0,
      partner: 0,
      admin: 0,
    }
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
    collectorPerformance.totalCompleted +
    collectorPerformance.totalFailed;

  const collectorSuccessRate = totalCollectorTasks
    ? round(
        (collectorPerformance.totalCompleted / totalCollectorTasks) * 100
      )
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
        completedQuantityKg: round(
          item.completedQuantityKg,
          2
        ),
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
        recyclingByStatus.pending +
        partnerSummary.pendingVerification,
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

  if (role) {
    filter.role = role;
  }

  if (isActive !== undefined) {
    filter.isActive = isActive === "true";
  }

  if (search) {
    filter.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number(limit) || 20, 1),
    100
  );

  const skip = (pageNumber - 1) * limitNumber;

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNumber)
      .select("-password"),

    User.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Users fetched successfully", {
    users,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber),
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
    profile = await ResidentProfile.findOne({
      user: user._id,
    }).populate(
      "addresses.serviceArea",
      "name city"
    );
  } else if (user.role === "collector") {
    profile = await CollectorProfile.findOne({
      user: user._id,
    }).populate(
      "serviceAreas",
      "name city"
    );
  } else if (user.role === "partner") {
    profile = await RecyclingPartner.findOne({
      user: user._id,
    }).populate(
      "serviceAreas",
      "name city"
    );
  }

  return sendSuccess(res, 200, "User fetched", {
    user,
    profile,
  });
});

// @route  PATCH /api/admin/users/:id/status
// @access admin
export const toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return sendError(res, 404, "User not found");
  }

  if (
    user._id.toString() ===
    req.user._id.toString()
  ) {
    return sendError(
      res,
      400,
      "You cannot change your own account status"
    );
  }

  user.isActive = !user.isActive;

  await user.save();

  return sendSuccess(
    res,
    200,
    `User ${
      user.isActive
        ? "activated"
        : "deactivated"
    } successfully`,
    {
      user: {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
      },
    }
  );
});

// ============================================================================
// FEATURE 10 — COLLECTOR TASK ASSIGNMENT
// ============================================================================

// @route  GET /api/admin/pickup-requests
// @access admin
export const getAllPickupRequests = asyncHandler(
  async (req, res) => {
    const {
      status,
      serviceArea,
      assigned,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (status) {
      if (!PICKUP_STATUSES.includes(status)) {
        return sendError(
          res,
          400,
          "Invalid pickup request status"
        );
      }

      filter.status = status;
    }

    if (serviceArea) {
      if (
        !mongoose.Types.ObjectId.isValid(
          serviceArea
        )
      ) {
        return sendError(
          res,
          400,
          "Invalid service area ID"
        );
      }

      filter.serviceArea = serviceArea;
    }

    if (assigned === "true") {
      filter.assignedCollector = {
        $ne: null,
      };
    } else if (assigned === "false") {
      filter.assignedCollector = null;
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [requests, total] =
      await Promise.all([
        WastePickupRequest.find(filter)
          .populate(
            "resident",
            "name email phone"
          )
          .populate(
            "serviceArea",
            "name city district"
          )
          .populate({
            path: "assignedCollector",
            select:
              "user employeeId vehicleType vehicleNumber serviceAreas isAvailable totalCompleted totalFailed averageRating",
            populate: {
              path: "user",
              select:
                "name email phone isActive",
            },
          })
          .populate(
            "assignedBy",
            "name email"
          )
          .sort({
            preferredDate: 1,
            createdAt: 1,
          })
          .skip(skip)
          .limit(limitNumber),

        WastePickupRequest.countDocuments(
          filter
        ),
      ]);

    return sendSuccess(
      res,
      200,
      "Pickup requests fetched successfully",
      {
        requests,
        pagination: {
          total,
          page: pageNumber,
          limit: limitNumber,
          pages: Math.ceil(
            total / limitNumber
          ),
        },
      }
    );
  }
);

// @route  GET /api/admin/collectors
// @access admin
export const getAssignmentCollectors =
  asyncHandler(async (req, res) => {
    const { serviceArea } = req.query;

    const collectorFilter = {};

    if (serviceArea) {
      if (
        !mongoose.Types.ObjectId.isValid(
          serviceArea
        )
      ) {
        return sendError(
          res,
          400,
          "Invalid service area ID"
        );
      }

      collectorFilter.serviceAreas =
        serviceArea;
    }

    const collectors =
      await CollectorProfile.find(
        collectorFilter
      )
        .populate(
          "user",
          "name email phone role isActive"
        )
        .populate(
          "serviceAreas",
          "name city district isActive"
        )
        .lean();

    const eligibleCollectors =
      collectors.filter(
        (collector) =>
          collector.user &&
          collector.user.role ===
            "collector" &&
          collector.user.isActive
      );

    const collectorIds =
      eligibleCollectors.map(
        (collector) => collector._id
      );

    const workloadRows =
      await WastePickupRequest.aggregate([
        {
          $match: {
            assignedCollector: {
              $in: collectorIds,
            },
            status: {
              $in: [
                "assigned",
                "on_the_way",
              ],
            },
          },
        },
        {
          $group: {
            _id: "$assignedCollector",
            activeTaskCount: {
              $sum: 1,
            },
          },
        },
      ]);

    const workloadMap = new Map(
      workloadRows.map((row) => [
        row._id.toString(),
        row.activeTaskCount,
      ])
    );

    const result = eligibleCollectors
      .map((collector) => ({
        ...collector,
        activeTaskCount:
          workloadMap.get(
            collector._id.toString()
          ) || 0,
      }))
      .sort((a, b) => {
        // Available collectors first.
        if (
          a.isAvailable !==
          b.isAvailable
        ) {
          return a.isAvailable
            ? -1
            : 1;
        }

        // Lowest workload next.
        if (
          a.activeTaskCount !==
          b.activeTaskCount
        ) {
          return (
            a.activeTaskCount -
            b.activeTaskCount
          );
        }

        // Deterministic tie-breaker:
        // fewer completed tasks first.
        return (
          (a.totalCompleted || 0) -
          (b.totalCompleted || 0)
        );
      });

    return sendSuccess(
      res,
      200,
      "Collectors fetched successfully",
      {
        collectors: result,
      }
    );
  });

// @route  PATCH /api/admin/pickup-requests/:id/assign
// @access admin
export const assignPickupRequest =
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      collectorId,
      note = "",
    } = req.body;

    // Validate pickup request ID.
    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return sendError(
        res,
        400,
        "Invalid pickup request ID"
      );
    }

    // Validate collector ID.
    if (
      !collectorId ||
      !mongoose.Types.ObjectId.isValid(
        collectorId
      )
    ) {
      return sendError(
        res,
        400,
        "A valid collector ID is required"
      );
    }

    // Find pickup request.
    const request =
      await WastePickupRequest.findById(id);

    if (!request) {
      return sendError(
        res,
        404,
        "Pickup request not found"
      );
    }

    // Completed, failed and cancelled requests
    // should not be reassigned.
    if (
      [
        "collected",
        "failed",
        "cancelled",
      ].includes(request.status)
    ) {
      return sendError(
        res,
        400,
        `A request in '${request.status}' status cannot be assigned`
      );
    }

    // Find collector.
    const collector =
      await CollectorProfile.findById(
        collectorId
      ).populate(
        "user",
        "name email phone role isActive"
      );

    if (!collector) {
      return sendError(
        res,
        404,
        "Collector not found"
      );
    }

    // Make sure this is a collector profile.
    if (
      !collector.user ||
      collector.user.role !==
        "collector"
    ) {
      return sendError(
        res,
        400,
        "Selected profile does not belong to a collector"
      );
    }

    // Collector account must be active.
    if (!collector.user.isActive) {
      return sendError(
        res,
        400,
        "Selected collector account is inactive"
      );
    }

    // Collector must currently be available.
    if (!collector.isAvailable) {
      return sendError(
        res,
        400,
        "Selected collector is currently unavailable"
      );
    }

    // Collector must cover the request's service area.
    const coversServiceArea =
      collector.serviceAreas.some(
        (areaId) =>
          areaId.toString() ===
          request.serviceArea.toString()
      );

    if (!coversServiceArea) {
      return sendError(
        res,
        400,
        "Selected collector does not cover this service area"
      );
    }

    const previousCollector =
      request.assignedCollector;

    const isReassignment =
      previousCollector &&
      previousCollector.toString() !==
        collector._id.toString();

    const assignedAt = new Date();

    // Update current assignment.
    request.assignedCollector =
      collector._id;

    request.assignedBy =
      req.user._id;

    request.assignedAt =
      assignedAt;

    request.assignmentMethod =
      "manual";

    request.assignmentNote =
      typeof note === "string"
        ? note.trim()
        : "";

    request.status = "assigned";

    // Preserve assignment history.
    request.assignmentHistory.push({
      collector: collector._id,
      assignedBy: req.user._id,
      method: "manual",
      assignedAt,
      note:
        request.assignmentNote ||
        (isReassignment
          ? "Pickup request reassigned by administrator"
          : "Pickup request manually assigned by administrator"),
    });

    await request.save();

    // Return populated request.
    const populatedRequest =
      await WastePickupRequest.findById(
        request._id
      )
        .populate(
          "resident",
          "name email phone"
        )
        .populate(
          "serviceArea",
          "name city district"
        )
        .populate({
          path: "assignedCollector",
          select:
            "user employeeId vehicleType vehicleNumber serviceAreas isAvailable totalCompleted totalFailed averageRating",
          populate: {
            path: "user",
            select:
              "name email phone isActive",
          },
        })
        .populate(
          "assignedBy",
          "name email"
        );

    return sendSuccess(
      res,
      200,
      isReassignment
        ? "Pickup request reassigned successfully"
        : "Pickup request assigned successfully",
      {
        request: populatedRequest,
      }
    );
  });