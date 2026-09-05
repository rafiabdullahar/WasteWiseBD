import express from "express";

import {
  getProfile,
  updateProfile,
  getPerformance,
  getAssignedPickupRequests,
  updatePickupRequestStatus,
} from "../controllers/collector.controller.js";

import {
  protect,
  restrictTo,
} from "../middleware/auth.middleware.js";


const router = express.Router();


// All collector routes require collector authentication

router.use(
  protect,
  restrictTo("collector")
);



// Collector profile

router
  .route("/profile")
  .get(getProfile)
  .put(updateProfile);



// Collector performance

router.get(
  "/performance",
  getPerformance
);



// Feature 11:
// Collector views assigned pickup tasks

router.get(
  "/pickup-requests",
  getAssignedPickupRequests
);



// Feature 11:
// Collector updates pickup task status
//
// assigned
//     ↓
// on_the_way
//     ↓
// collected
//
// or
//
// on_the_way
//     ↓
// failed

router.patch(
  "/pickup-requests/:id/status",
  updatePickupRequestStatus
);



export default router;