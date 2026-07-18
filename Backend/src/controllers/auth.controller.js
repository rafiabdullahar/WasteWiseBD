import User from "../models/User.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import RecyclingPartner from "../models/RecyclingPartner.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { generateToken, sendTokenCookie } from "../utils/token.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../validations/auth.validation.js";

// Helper: create the appropriate role-specific profile document after a new
// user is saved so that the profile collection always has a matching record.
const createRoleProfile = async (user) => {
  switch (user.role) {
    case "resident":
      await ResidentProfile.create({ user: user._id });
      break;
    case "collector":
      await CollectorProfile.create({ user: user._id });
      break;
    case "partner":
      await RecyclingPartner.create({
        user: user._id,
        organizationName: user.name,
        contactEmail: user.email,
        contactPhone: user.phone || "",
      });
      break;
    default:
      break;
  }
};

// @route  POST /api/auth/register
// @access Public
// Residents, Collectors, and Recycling Partners may all self-register.
// Admin accounts must be provisioned directly in the database — they can
// never be created through this public endpoint.
export const register = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateRegisterInput(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const { name, email, password, phone, role, householdType } = req.body;

  // Guard: admin accounts cannot be self-registered.
  const allowedSelfRegisterRoles = ["resident", "collector", "partner"];
  const assignedRole =
    role && allowedSelfRegisterRoles.includes(role) ? role : "resident";

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendError(res, 409, "An account with this email already exists");
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    householdType: assignedRole === "resident" ? householdType : undefined,
    role: assignedRole,
  });

  // Automatically create the role-specific profile document.
  await createRoleProfile(user);

  const token = generateToken(user._id, user.role);
  sendTokenCookie(res, token);

  return sendSuccess(res, 201, "Account created successfully", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
});

// @route  POST /api/auth/login
// @access Public
export const login = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateLoginInput(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

  if (!user || !(await user.comparePassword(password))) {
    return sendError(res, 401, "Invalid email or password");
  }

  if (!user.isActive) {
    return sendError(res, 403, "This account has been deactivated");
  }

  const token = generateToken(user._id, user.role);
  sendTokenCookie(res, token);

  return sendSuccess(res, 200, "Logged in successfully", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
});

// @route  POST /api/auth/logout
// @access Private
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return sendSuccess(res, 200, "Logged out successfully");
});

// @route  GET /api/auth/me
// @access Private
export const getMe = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, "Current user fetched", {
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});