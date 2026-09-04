import express from "express";
import {
  createSchedule,
  getAllSchedules,
  updateSchedule,
  deleteSchedule,
  getMyAreaSchedules,
  sendScheduleReminders,
} from "../controllers/schedule.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// Resident: view schedules for their own service areas
router.get("/my-area", protect, restrictTo("resident"), getMyAreaSchedules);

// Admin: CRUD + reminders
router.get("/", protect, restrictTo("admin"), getAllSchedules);
router.post("/", protect, restrictTo("admin"), createSchedule);
router.put("/:id", protect, restrictTo("admin"), updateSchedule);
router.delete("/:id", protect, restrictTo("admin"), deleteSchedule);
router.post(
  "/:id/send-reminders",
  protect,
  restrictTo("admin"),
  sendScheduleReminders
);

export default router;
