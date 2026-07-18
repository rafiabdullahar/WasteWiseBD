import express from "express";
import {
  getProfile,
  updateProfile,
  getPerformance,
} from "../controllers/collector.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect, restrictTo("collector"));

router.route("/profile").get(getProfile).put(updateProfile);
router.get("/performance", getPerformance);

export default router;
