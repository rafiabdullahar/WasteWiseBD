import express from "express";
import {
  getOwnProfile,
  updateOwnProfile,
  getOwnRequests,
  getAvailableRequests,
  claimRequest,
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
// NOTE: /requests/available must be registered before /requests/:id-style
// routes so "available" is never captured as an :id.
router.get("/requests", protect, restrictTo("partner"), getOwnRequests);
router.get("/requests/available", protect, restrictTo("partner"), getAvailableRequests);
router.patch("/requests/:id/claim", protect, restrictTo("partner"), claimRequest);
router.patch("/requests/:id/status", protect, restrictTo("partner"), updateRequestStatus);

// Admin-only management
router.get("/", protect, restrictTo("admin"), getAllPartners);
router.get("/:id", protect, restrictTo("admin"), getPartnerById);
router.patch("/:id/verify", protect, restrictTo("admin"), verifyPartner);

export default router;
