import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { generateToken, sendTokenCookie } from "../utils/token.js";
import {
  validateRegisterInput,
  validateLoginInput,
} from "../validations/auth.validation.js";

// @route  POST /api/auth/register
// @access Public
export const register = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateRegisterInput(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const { name, email, password, phone, role, householdType } = req.body;

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return sendError(res, 409, "An account with this email already exists");
  }

  // Public self-registration only ever creates Residents. Collector, Partner,
  // and Admin accounts should be provisioned separately (e.g. by an Admin),
  // so any "role" sent in the request body is intentionally ignored here.
  const user = await User.create({
    name,
    email,
    password,
    phone,
    householdType,
    role: "resident",
  });

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
