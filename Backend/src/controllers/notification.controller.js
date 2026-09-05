import Notification from "../models/Notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import mongoose from "mongoose";

// @route  GET /api/notifications
// @access all authenticated users
// Returns the logged-in user's notifications, newest first.
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const filter = { recipient: req.user._id };
  if (unreadOnly === "true") filter.isRead = false;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  return sendSuccess(res, 200, "Notifications fetched", {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

// @route  PATCH /api/notifications/:id/read
// @access all authenticated users
export const markAsRead = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid notification ID");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, recipient: req.user._id },
    { isRead: true, readAt: new Date() },
    { new: true }
  );

  if (!notification) {
    return sendError(res, 404, "Notification not found");
  }

  return sendSuccess(res, 200, "Marked as read", { notification });
});

// @route  PATCH /api/notifications/mark-all-read
// @access all authenticated users
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  return sendSuccess(res, 200, "All notifications marked as read");
});

// @route  DELETE /api/notifications/:id
// @access all authenticated users
export const deleteNotification = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid notification ID");
  }

  const notification = await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    return sendError(res, 404, "Notification not found");
  }

  return sendSuccess(res, 200, "Notification deleted");
});
