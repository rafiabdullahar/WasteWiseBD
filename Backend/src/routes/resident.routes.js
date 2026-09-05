import express from "express";

import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  checkAddressCoverage,
} from "../controllers/resident.controller.js";

import {
  createPickupRequest,
  getMyPickupRequests,
  getMyPickupRequestById,
  cancelPickupRequest,
} from "../controllers/pickupRequest.controller.js";

import { getResidentHistory } from "../controllers/history.controller.js";

import {
  protect,
  restrictTo,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All resident routes require authentication
// and the user must have the resident role.
router.use(protect, restrictTo("resident"));

// ─── Profile ────────────────────────────────────────────────────────────────

router
  .route("/profile")
  .get(getProfile)
  .put(updateProfile);

// ─── Addresses ──────────────────────────────────────────────────────────────

router
  .route("/addresses")
  .get(getAddresses)
  .post(addAddress);

// Feature 6:
// Check whether a resident's selected address
// is inside an active supported service area.
router.get(
  "/addresses/:addressId/coverage",
  checkAddressCoverage
);

router
  .route("/addresses/:addressId")
  .put(updateAddress)
  .delete(deleteAddress);

// ─── Pickup Requests ────────────────────────────────────────────────────────

// Create a new pickup request
// POST /api/residents/pickup-requests
router
  .route("/pickup-requests")
  .get(getMyPickupRequests)
  .post(createPickupRequest);

// Get a specific pickup request
// GET /api/residents/pickup-requests/:id
router.get(
  "/pickup-requests/:id",
  getMyPickupRequestById
);

// Cancel a pickup request
// PATCH /api/residents/pickup-requests/:id/cancel
router.patch(
  "/pickup-requests/:id/cancel",
  cancelPickupRequest
);

// ─── Collection History (Feature 14) ─────────────────────────────────────────

// Unified pickup + recycling collection timeline for the resident.
// GET /api/residents/history
router.get("/history", getResidentHistory);

export default router;