import { sendError } from "../utils/apiResponse.js";

export const notFound = (req, res, next) => {
  sendError(res, 404, `Route not found - ${req.originalUrl}`);
};

// Centralized error handler. Any error passed to next(err), or thrown
// inside an asyncHandler-wrapped controller, ends up here.
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Mongoose duplicate key (e.g. duplicate email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} is already in use`;
  }

  // Mongoose schema validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
  }

  sendError(res, statusCode, message, {
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
