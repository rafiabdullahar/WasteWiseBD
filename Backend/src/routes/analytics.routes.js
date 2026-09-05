import express from "express";

import {
  getAnalyticsOverview,
  getAreaAnalytics,
  getAreaAnalyticsById,
} from "../controllers/analytics.controller.js";

import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─── Feature 16: Area-wise Waste Analytics ──────────────────────────────────
//
// Analytics exposes aggregated data about every resident, collector and area
// on the platform, so the whole router is admin-only. Mounted as its own
// router (rather than under /api/admin) to keep the reporting surface
// separate from the administrative actions that change state.

router.use(protect, restrictTo("admin"));

// Platform-wide summary: totals, category mix, monthly trend, area rankings.
router.get("/overview", getAnalyticsOverview);

// Per-area comparison table.
router.get("/areas", getAreaAnalytics);

// Single-area drill-down.
router.get("/areas/:areaId", getAreaAnalyticsById);

export default router;
