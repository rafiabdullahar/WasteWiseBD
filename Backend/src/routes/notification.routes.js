import express from "express";
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication — any role can access their own notifications.
router.get("/", protect, getMyNotifications);
router.patch("/mark-all-read", protect, markAllAsRead);
router.patch("/:id/read", protect, markAsRead);
router.delete("/:id", protect, deleteNotification);

export default router;
