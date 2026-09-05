import express from "express";
import {
  getMyRewards,
  getCatalog,
  redeemReward,
} from "../controllers/rewards.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// All rewards routes are resident-only.
router.use(protect, restrictTo("resident"));

router.get("/me", getMyRewards);
router.get("/catalog", getCatalog);
router.post("/redeem", redeemReward);

export default router;
