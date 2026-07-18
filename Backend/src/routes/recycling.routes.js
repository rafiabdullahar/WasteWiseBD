import express from "express";
import {
  createRecyclingRequest,
  getMyRecyclingRequests,
  getRecyclingRequestById,
  getPartnerRequests,
  acceptRequest,
  rejectRequest,
  updateRequestStatus,
  getAllRecyclingRequests,
} from "../controllers/recycling.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// Admin
router.get(
  "/admin/all",
  protect,
  restrictTo("admin"),
  getAllRecyclingRequests
);

// Partner
router.get(
  "/partner/requests",
  protect,
  restrictTo("partner"),
  getPartnerRequests
);
router.patch(
  "/:id/accept",
  protect,
  restrictTo("partner"),
  acceptRequest
);
router.patch(
  "/:id/reject",
  protect,
  restrictTo("partner"),
  rejectRequest
);
router.patch(
  "/:id/status",
  protect,
  restrictTo("partner"),
  updateRequestStatus
);

// Resident
router
  .route("/")
  .post(protect, restrictTo("resident"), createRecyclingRequest)
  .get(protect, restrictTo("resident"), getMyRecyclingRequests);

// Shared — resident/partner/admin (authorization checked inside controller)
router.get(
  "/:id",
  protect,
  restrictTo("resident", "partner", "admin"),
  getRecyclingRequestById
);

export default router;
