import express from "express";
import {
  createComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
} from "../controllers/complaint.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/", protect, restrictTo("resident"), createComplaint);
router.get("/my", protect, restrictTo("resident"), getMyComplaints);
router.get("/", protect, restrictTo("admin"), getAllComplaints);
router.patch("/:id/status", protect, restrictTo("admin"), updateComplaintStatus);

export default router;