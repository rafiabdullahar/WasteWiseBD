import mongoose from "mongoose";
import "dotenv/config";
import User from "../models/User.model.js";
import { connectDB } from "../config/db.js";

const seedAdmin = async () => {
  try {
    // 1. Connect to database
    await connectDB();

    const email = "admin@wastewise.bd";
    const password = "AdminSecurePassword123";

    // 2. Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log(`[Seed] Admin user already exists with email: ${email}`);
      process.exit(0);
    }

    // 3. Create admin user
    const admin = await User.create({
      name: "System Administrator",
      email,
      password,
      role: "admin",
      isActive: true,
    });

    console.log("=========================================");
    console.log(" Admin account seeded successfully!");
    console.log(` Email:    ${admin.email}`);
    console.log(` Password: ${password}`);
    console.log("=========================================");
    process.exit(0);
  } catch (error) {
    console.error("[Seed] Error seeding admin account:", error.message);
    process.exit(1);
  }
};

seedAdmin();
