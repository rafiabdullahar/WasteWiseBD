import express from "express";

import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
  getAllPickupRequests,
  getAssignmentCollectors,
  assignPickupRequest,
} from "../controllers/admin.controller.js";

import {
  protect,
  restrictTo,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All admin routes require authentication
// and the user must have the admin role.
router.use(protect, restrictTo("admin"));

// ─── Dashboard ──────────────────────────────────────────────────────────────

router.get(
  "/dashboard",
  getDashboardStats
);

// ─── User Management ────────────────────────────────────────────────────────

router.get(
  "/users",
  getAllUsers
);

router.get(
  "/users/:id",
  getUserById
);

router.patch(
  "/users/:id/status",
  toggleUserStatus
);

// ─── Feature 10: Collector Task Assignment ─────────────────────────────────

// Get pickup requests for the administrator.
router.get(
  "/pickup-requests",
  getAllPickupRequests
);

// Get collectors with availability and workload information.
router.get(
  "/collectors",
  getAssignmentCollectors
);

// Assign or reassign a pickup request to a collector.
router.patch(
  "/pickup-requests/:id/assign",
  assignPickupRequest
);

export default router;