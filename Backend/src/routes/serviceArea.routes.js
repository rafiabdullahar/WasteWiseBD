import express from "express";
import {
  getAllServiceAreas,
  createServiceArea,
  updateServiceArea,
  deleteServiceArea,
  toggleServiceArea,
} from "../controllers/serviceArea.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllServiceAreas); // Public
router.post("/", protect, restrictTo("admin"), createServiceArea);
router.put("/:id", protect, restrictTo("admin"), updateServiceArea);
router.patch("/:id/toggle", protect, restrictTo("admin"), toggleServiceArea);
router.delete("/:id", protect, restrictTo("admin"), deleteServiceArea);

export default router;
