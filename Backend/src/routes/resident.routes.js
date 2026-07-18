import express from "express";
import {
  getProfile,
  updateProfile,
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../controllers/resident.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes below require authentication and resident role.
router.use(protect, restrictTo("resident"));

router.route("/profile").get(getProfile).put(updateProfile);

router
  .route("/addresses")
  .get(getAddresses)
  .post(addAddress);

router
  .route("/addresses/:addressId")
  .put(updateAddress)
  .delete(deleteAddress);

export default router;
