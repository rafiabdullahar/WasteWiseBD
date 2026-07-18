import ServiceArea from "../models/ServiceArea.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";

// @route  GET /api/service-areas
// @access Public (includes inactive only if ?includeInactive=true is passed by admin)
export const getAllServiceAreas = asyncHandler(async (req, res) => {
  const filter = req.query.includeInactive === "true" ? {} : { isActive: true };
  const areas = await ServiceArea.find(filter).sort({ name: 1 });
  return sendSuccess(res, 200, "Service areas fetched", { areas });
});

// @route  POST /api/service-areas
// @access admin
export const createServiceArea = asyncHandler(async (req, res) => {
  const { name, city, district, description } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, 400, "Service area name is required");
  }

  const area = await ServiceArea.create({
    name: name.trim(),
    city: city?.trim() || "Dhaka",
    district: district?.trim() || "Dhaka",
    description: description?.trim() || "",
    createdBy: req.user._id,
  });

  return sendSuccess(res, 201, "Service area created successfully", { area });
});

// @route  PUT /api/service-areas/:id
// @access admin
export const updateServiceArea = asyncHandler(async (req, res) => {
  const { name, city, district, description, isActive } = req.body;

  const area = await ServiceArea.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        ...(name && { name: name.trim() }),
        ...(city && { city: city.trim() }),
        ...(district && { district: district.trim() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(isActive !== undefined && { isActive }),
      },
    },
    { new: true, runValidators: true }
  );

  if (!area) {
    return sendError(res, 404, "Service area not found");
  }

  return sendSuccess(res, 200, "Service area updated successfully", { area });
});

// @route  DELETE /api/service-areas/:id
// @access admin
export const deleteServiceArea = asyncHandler(async (req, res) => {
  const area = await ServiceArea.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!area) {
    return sendError(res, 404, "Service area not found");
  }

  // Soft-delete: set isActive = false so historical data stays intact.
  return sendSuccess(res, 200, "Service area deactivated successfully", {
    area,
  });
});

// @route  PATCH /api/service-areas/:id/toggle
// @access admin
export const toggleServiceArea = asyncHandler(async (req, res) => {
  const area = await ServiceArea.findById(req.params.id);

  if (!area) {
    return sendError(res, 404, "Service area not found");
  }

  area.isActive = !area.isActive;
  await area.save();

  return sendSuccess(
    res,
    200,
    `Service area ${area.isActive ? "activated" : "deactivated"} successfully`,
    { area }
  );
});
