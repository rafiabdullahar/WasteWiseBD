import express from "express";
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/resident.controller.js";
import {
  createPickupRequest,
  getMyPickupRequests,
  getMyPickupRequestById,
  cancelPickupRequest,
} from "../controllers/pickupRequest.controller.js";
import {
  protect,
  restrictTo,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below require authentication and resident role.
router.use(protect, restrictTo("resident"));

// Resident profile
router.route("/profile").get(getProfile).put(updateProfile);

// Resident addresses
router.route("/addresses").get(getAddresses).post(addAddress);

router
  .route("/addresses/:addressId")
  .put(updateAddress)
  .delete(deleteAddress);

// Feature 3: Waste Pickup Request
router
  .route("/pickup-requests")
  .post(createPickupRequest)
  .get(getMyPickupRequests);

router.get(
  "/pickup-requests/:id",
  getMyPickupRequestById
);

router.patch(
  "/pickup-requests/:id/cancel",
  cancelPickupRequest
);

export default router;
