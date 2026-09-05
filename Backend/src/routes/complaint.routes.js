import express from "express";
import {
  createComplaint,
  updateComplaint,
  deleteComplaint,
  getMyComplaints,
  getAllComplaints,
  updateComplaintStatus,
} from "../controllers/complaint.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/", protect, restrictTo("resident"), upload.single("evidence"), createComplaint);
router.put("/:id", protect, restrictTo("resident"), updateComplaint);
router.delete("/:id", protect, restrictTo("resident"), deleteComplaint);
router.get("/my", protect, restrictTo("resident"), getMyComplaints);
router.get("/", protect, restrictTo("admin"), getAllComplaints);
router.patch("/:id/status", protect, restrictTo("admin"), updateComplaintStatus);

export default router;