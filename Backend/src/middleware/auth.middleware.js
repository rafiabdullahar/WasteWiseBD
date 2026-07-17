import jwt from "jsonwebtoken";
import User from "../models/User.model.js";
import { sendError } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Verifies the JWT (from the httpOnly cookie, or a Bearer header as a
// fallback for non-browser clients) and attaches the user to req.user.
export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies?.token;

  if (!token && req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return sendError(res, 401, "Not authorized, no token provided");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return sendError(res, 401, "Not authorized, user no longer exists");
    }

    req.user = user;
    next();
  } catch (error) {
    return sendError(res, 401, "Not authorized, token invalid or expired");
  }
});

// Role-based authorization: usage `restrictTo("admin", "collector")`.
// Must be used after `protect` so req.user is populated.
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        "You do not have permission to perform this action"
      );
    }
    next();
  };
};
