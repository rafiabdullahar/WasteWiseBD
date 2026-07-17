import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// This is the shared identity collection for all four stakeholder types.
// Role-specific data (e.g. ResidentProfile, CollectorProfile) will live in
// their own collections later, referenced back to this User via ObjectId -
// per the master prompt's "never duplicate data" rule.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: {
      type: String,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false, // never returned by default on find/findOne
    },
    role: {
      type: String,
      enum: ["resident", "collector", "partner", "admin"],
      default: "resident",
    },
    householdType: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hash the password whenever it's set/changed, never store plaintext.
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method used by the login controller to verify credentials.
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
