// Backend/src/routes/overflowReport.routes.js

import express from "express";
import {
  createOverflowReport,
  updateOverflowReport,
  deleteOverflowReport,
  getMyOverflowReports,
  getAllOverflowReports,
  updateOverflowReportStatus,
} from "../controllers/overflowReport.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import { uploadOverflowPhoto } from "../middleware/uploadOverflow.middleware.js";

const router = express.Router();

router.post("/", protect, restrictTo("resident"), uploadOverflowPhoto.single("photo"), createOverflowReport);
router.put("/:id", protect, restrictTo("resident"), uploadOverflowPhoto.single("photo"), updateOverflowReport);
router.delete("/:id", protect, restrictTo("resident"), deleteOverflowReport);
router.get("/my", protect, restrictTo("resident"), getMyOverflowReports);
router.get("/", protect, restrictTo("admin"), getAllOverflowReports);
router.patch("/:id/status", protect, restrictTo("admin"), updateOverflowReportStatus);

export default router;