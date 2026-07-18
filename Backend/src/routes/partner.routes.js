import express from "express";
import {
  getOwnProfile,
  updateOwnProfile,
  getOwnRequests,
  updateRequestStatus,
  getAllPartners,
  getPartnerById,
  verifyPartner,
} from "../controllers/partner.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// Partner self-service
router
  .route("/profile")
  .get(protect, restrictTo("partner"), getOwnProfile)
  .put(protect, restrictTo("partner"), updateOwnProfile);

// Partner request management
router.get("/requests", protect, restrictTo("partner"), getOwnRequests);
router.patch("/requests/:id/status", protect, restrictTo("partner"), updateRequestStatus);

// Admin-only management
router.get("/", protect, restrictTo("admin"), getAllPartners);
router.get("/:id", protect, restrictTo("admin"), getPartnerById);
router.patch("/:id/verify", protect, restrictTo("admin"), verifyPartner);

export default router;
