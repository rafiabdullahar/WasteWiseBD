import mongoose from "mongoose";
import Schedule from "../models/Schedule.model.js";
import ServiceArea from "../models/ServiceArea.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import Notification from "../models/Notification.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  validateCreateSchedule,
  validateUpdateSchedule,
} from "../validations/schedule.validation.js";

// ─── Admin endpoints ─────────────────────────────────────────────────────────

// @route  POST /api/schedules
// @access admin
export const createSchedule = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateCreateSchedule(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const { serviceArea, dayOfWeek, timeSlot, wasteCategories, description } =
    req.body;

  // Verify service area exists and is active.
  const area = await ServiceArea.findById(serviceArea);
  if (!area || !area.isActive) {
    return sendError(res, 404, "Service area not found or is inactive");
  }

  // Check for duplicate schedule.
  const existing = await Schedule.findOne({ serviceArea, dayOfWeek, timeSlot });
  if (existing) {
    return sendError(
      res,
      409,
      `A schedule already exists for ${area.name} on ${dayOfWeek} (${timeSlot})`
    );
  }

  const schedule = await Schedule.create({
    serviceArea,
    dayOfWeek,
    timeSlot,
    wasteCategories: wasteCategories || [],
    description: description?.trim() || "",
    createdBy: req.user._id,
  });

  const populated = await Schedule.findById(schedule._id).populate(
    "serviceArea",
    "name city district"
  );

  return sendSuccess(res, 201, "Schedule created successfully", {
    schedule: populated,
  });
});

// @route  GET /api/schedules
// @access admin (all schedules) — query params: ?serviceArea=<id>&isActive=true
export const getAllSchedules = asyncHandler(async (req, res) => {
  const { serviceArea, isActive } = req.query;

  const filter = {};
  if (serviceArea) filter.serviceArea = serviceArea;
  if (isActive !== undefined) filter.isActive = isActive === "true";

  const schedules = await Schedule.find(filter)
    .populate("serviceArea", "name city district")
    .sort({ dayOfWeek: 1, timeSlot: 1 });

  return sendSuccess(res, 200, "Schedules fetched successfully", { schedules });
});

// @route  PUT /api/schedules/:id
// @access admin
export const updateSchedule = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid schedule ID");
  }

  const { isValid, errors } = validateUpdateSchedule(req.body);
  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const allowedFields = [
    "dayOfWeek",
    "timeSlot",
    "wasteCategories",
    "description",
    "isActive",
  ];
  const updates = {};
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // If day or timeSlot is being changed, check for duplicate.
  if (updates.dayOfWeek || updates.timeSlot) {
    const current = await Schedule.findById(req.params.id);
    if (!current) return sendError(res, 404, "Schedule not found");

    const checkDay = updates.dayOfWeek || current.dayOfWeek;
    const checkSlot = updates.timeSlot || current.timeSlot;

    const duplicate = await Schedule.findOne({
      serviceArea: current.serviceArea,
      dayOfWeek: checkDay,
      timeSlot: checkSlot,
      _id: { $ne: req.params.id },
    });

    if (duplicate) {
      return sendError(
        res,
        409,
        `A schedule already exists for this area on ${checkDay} (${checkSlot})`
      );
    }
  }

  const schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).populate("serviceArea", "name city district");

  if (!schedule) {
    return sendError(res, 404, "Schedule not found");
  }

  return sendSuccess(res, 200, "Schedule updated successfully", { schedule });
});

// @route  DELETE /api/schedules/:id
// @access admin
export const deleteSchedule = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid schedule ID");
  }

  const schedule = await Schedule.findByIdAndDelete(req.params.id);
  if (!schedule) {
    return sendError(res, 404, "Schedule not found");
  }

  return sendSuccess(res, 200, "Schedule deleted successfully");
});

// ─── Resident endpoint ───────────────────────────────────────────────────────

// @route  GET /api/schedules/my-area
// @access resident
// Returns only the active schedules that belong to the service areas
// associated with the logged-in resident's addresses.
export const getMyAreaSchedules = asyncHandler(async (req, res) => {
  const profile = await ResidentProfile.findOne({ user: req.user._id });

  if (!profile || !profile.addresses || profile.addresses.length === 0) {
    return sendSuccess(res, 200, "No schedules found — no addresses on file", {
      schedules: [],
    });
  }

  // Collect unique service area IDs from the resident's addresses.
  const serviceAreaIds = [
    ...new Set(
      profile.addresses
        .filter((addr) => addr.serviceArea)
        .map((addr) => addr.serviceArea.toString())
    ),
  ];

  if (serviceAreaIds.length === 0) {
    return sendSuccess(
      res,
      200,
      "No schedules found — your addresses are not mapped to service areas",
      { schedules: [] }
    );
  }

  const schedules = await Schedule.find({
    serviceArea: { $in: serviceAreaIds },
    isActive: true,
  })
    .populate("serviceArea", "name city district")
    .sort({ dayOfWeek: 1, timeSlot: 1 });

  return sendSuccess(res, 200, "Area schedules fetched successfully", {
    schedules,
  });
});

// ─── Reminder utility ────────────────────────────────────────────────────────

// @route  POST /api/schedules/:id/send-reminders
// @access admin
// Sends a notification to every resident whose address falls within
// the schedule's service area.
export const sendScheduleReminders = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid schedule ID");
  }

  const schedule = await Schedule.findById(req.params.id).populate(
    "serviceArea",
    "name city"
  );
  if (!schedule) {
    return sendError(res, 404, "Schedule not found");
  }

  // Find all residents who have an address in this service area.
  const residents = await ResidentProfile.find({
    "addresses.serviceArea": schedule.serviceArea._id,
  }).populate("user", "_id name");

  if (residents.length === 0) {
    return sendSuccess(res, 200, "No residents found in this service area", {
      notified: 0,
    });
  }

  const TIME_LABELS = {
    morning: "6:00 AM – 12:00 PM",
    afternoon: "12:00 PM – 5:00 PM",
    evening: "5:00 PM – 9:00 PM",
  };

  const notifications = residents.map((profile) => ({
    recipient: profile.user._id,
    title: "Collection Reminder",
    message: `Waste collection is scheduled for ${schedule.dayOfWeek} (${TIME_LABELS[schedule.timeSlot]}) in ${schedule.serviceArea.name}. Please prepare your waste.`,
    type: "reminder",
    relatedDocument: schedule._id,
    relatedModel: "Schedule",
  }));

  await Notification.insertMany(notifications);

  return sendSuccess(res, 200, "Reminders sent successfully", {
    notified: notifications.length,
  });
});
