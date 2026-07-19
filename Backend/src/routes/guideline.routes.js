import express from "express";
import {
  getAllGuidelines,
  getGuidelineByCategory,
  createGuideline,
  updateGuideline,
  deleteGuideline,
} from "../controllers/guideline.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllGuidelines);
router.get("/:category", getGuidelineByCategory);
router.post("/", protect, restrictTo("admin"), createGuideline);
router.put("/:id", protect, restrictTo("admin"), updateGuideline);
router.delete("/:id", protect, restrictTo("admin"), deleteGuideline);

export default router;