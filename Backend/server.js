import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { connectDB } from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
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

// --- Database ---
connectDB();

// --- Routes ---
// Only the auth module (register/login/logout) is wired up for now.
// Future modules (pickups, complaints, recycling, etc.) each get their own
// routes/controllers/models file and are mounted here the same way.
app.use("/api/auth", authRoutes);
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
