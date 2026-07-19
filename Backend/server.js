import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import complaintRoutes from "./src/routes/complaint.routes.js";
import residentRoutes from "./src/routes/resident.routes.js";
import collectorRoutes from "./src/routes/collector.routes.js";
import partnerRoutes from "./src/routes/partner.routes.js";
import recyclingRoutes from "./src/routes/recycling.routes.js";
import serviceAreaRoutes from "./src/routes/serviceArea.routes.js";
import wasteCategoryRoutes from "./src/routes/wasteCategory.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import { notFound, errorHandler } from "./src/middleware/error.middleware.js";
import guidelineRoutes from "./src/routes/guideline.routes.js";

const app = express();

// --- Core middleware ---
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // allow the httpOnly auth cookie to be sent
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

// --- Database ---
connectDB();

// --- Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/residents", residentRoutes);
app.use("/api/collectors", collectorRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/recycling", recyclingRoutes);
app.use("/api/service-areas", serviceAreaRoutes);
app.use("/api/waste-categories", wasteCategoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/guidelines", guidelineRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({ success: true, message: "WasteWiseBD API is running" });
});

// --- Error handling (must be registered last) ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});