import express from "express";
import {
  getAllCategories,
  createCategory,
  updateCategory,
} from "../controllers/wasteCategory.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllCategories); // Public
router.post("/", protect, restrictTo("admin"), createCategory);
router.put("/:id", protect, restrictTo("admin"), updateCategory);

export default router;
