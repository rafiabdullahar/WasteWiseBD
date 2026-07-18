import express from "express";
import {
  getDashboardStats,
  getAllUsers,
  getUserById,
  toggleUserStatus,
} from "../controllers/admin.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// All admin routes require authentication and admin role.
router.use(protect, restrictTo("admin"));

router.get("/dashboard", getDashboardStats);
router.get("/users", getAllUsers);
router.get("/users/:id", getUserById);
router.patch("/users/:id/status", toggleUserStatus);

export default router;
