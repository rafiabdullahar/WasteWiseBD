import express from "express";

import {
  createRoute,
  getRoutes,
  getCoverage,
  getMyRoutes,
  getRouteById,
  updateRoute,
  updateRouteStops,
  assignRoute,
  toggleRoute,
  deleteRoute,
  dispatchRouteRequests,
} from "../controllers/route.controller.js";

import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─── Feature 5: Area-Based Route Management ─────────────────────────────────
//
// Every route here requires authentication. Authorisation is applied per
// endpoint rather than to the whole router, because one endpoint (/my) belongs
// to collectors while the rest are administrative.

router.use(protect);

// ─── Collector-facing ───────────────────────────────────────────────────────

// A collector's own weekly routes. Declared before "/:id" so the literal
// path is not captured as an id.
router.get("/my", restrictTo("collector"), getMyRoutes);

// ─── Admin-facing ───────────────────────────────────────────────────────────

// Coverage report — also declared before "/:id".
router.get("/coverage", restrictTo("admin"), getCoverage);

router
  .route("/")
  .get(restrictTo("admin"), getRoutes)
  .post(restrictTo("admin"), createRoute);

router
  .route("/:id")
  .get(restrictTo("admin"), getRouteById)
  .put(restrictTo("admin"), updateRoute)
  .delete(restrictTo("admin"), deleteRoute);

// Replace or reorder the stop list.
router.patch("/:id/stops", restrictTo("admin"), updateRouteStops);

// Assign, reassign, or unassign the route's collector.
router.patch("/:id/assign", restrictTo("admin"), assignRoute);

// Activate / deactivate.
router.patch("/:id/toggle", restrictTo("admin"), toggleRoute);

// Claim the unassigned pickup requests that fall on this route's slot.
router.post("/:id/dispatch", restrictTo("admin"), dispatchRouteRequests);

export default router;
