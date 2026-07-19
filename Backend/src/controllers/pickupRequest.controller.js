import mongoose from "mongoose";
import WastePickupRequest, {
  PICKUP_STATUSES,
} from "../models/WastePickupRequest.model.js";
import ResidentProfile from "../models/ResidentProfile.model.js";
import CollectorProfile from "../models/CollectorProfile.model.js";
import ServiceArea from "../models/ServiceArea.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import { validateCreatePickupRequest } from "../validations/pickupRequest.validation.js";

const ACTIVE_TASK_STATUSES = ["assigned", "on_the_way"];

const populatePickupRequest = (query) =>
  query
    .populate("serviceArea", "name city district")
    .populate({
      path: "assignedCollector",
      select:
        "user employeeId vehicleType vehicleNumber workSchedule averageRating isAvailable",
      populate: {
        path: "user",
        select: "name email phone",
      },
    })
    .populate("assignedBy", "name email");

// Finds an active and available collector who covers the service area.
// The collector with the fewest active tasks is selected.
const findBestAvailableCollector = async (serviceAreaId) => {
  const collectors = await CollectorProfile.find({
    serviceAreas: serviceAreaId,
    isAvailable: true,
  }).populate({
    path: "user",
    match: {
      role: "collector",
      isActive: true,
    },
    select: "name email phone role isActive",
  });

  const eligibleCollectors = collectors.filter(
    (collector) => collector.user
  );

  if (eligibleCollectors.length === 0) {
    return null;
  }

  const collectorIds = eligibleCollectors.map(
    (collector) => collector._id
  );

  const workloadRows = await WastePickupRequest.aggregate([
    {
      $match: {
        assignedCollector: { $in: collectorIds },
        status: { $in: ACTIVE_TASK_STATUSES },
      },
    },
    {
      $group: {
        _id: "$assignedCollector",
        activeTaskCount: { $sum: 1 },
      },
    },
  ]);

  const workloadMap = new Map(
    workloadRows.map((row) => [
      row._id.toString(),
      row.activeTaskCount,
    ])
  );

  eligibleCollectors.sort((a, b) => {
    const workloadA = workloadMap.get(a._id.toString()) || 0;
    const workloadB = workloadMap.get(b._id.toString()) || 0;

    if (workloadA !== workloadB) {
      return workloadA - workloadB;
    }

    // Stable tie-breaker: prefer the collector with more completed tasks.
    return (b.totalCompleted || 0) - (a.totalCompleted || 0);
  });

  return eligibleCollectors[0];
};

// @route  POST /api/residents/pickup-requests
// @access resident
export const createPickupRequest = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateCreatePickupRequest(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const {
    addressId,
    wasteItems,
    preferredDate,
    preferredTimeSlot,
    notes,
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    return sendError(res, 400, "Invalid address ID");
  }

  const residentProfile = await ResidentProfile.findOne({
    user: req.user._id,
  });

  if (!residentProfile) {
    return sendError(res, 404, "Resident profile not found");
  }

  const selectedAddress = residentProfile.addresses.id(addressId);

  if (!selectedAddress) {
    return sendError(
      res,
      404,
      "The selected address does not belong to your profile"
    );
  }

  if (!selectedAddress.serviceArea) {
    return sendError(
      res,
      400,
      "The selected address is not connected to a service area"
    );
  }

  const serviceArea = await ServiceArea.findOne({
    _id: selectedAddress.serviceArea,
    isActive: true,
  });

  if (!serviceArea) {
    return sendError(
      res,
      400,
      "Waste collection is not currently available for this address"
    );
  }

  const bestCollector = await findBestAvailableCollector(
    serviceArea._id
  );
  const assignedAt = bestCollector ? new Date() : null;

  const requestData = {
    resident: req.user._id,
    residentProfile: residentProfile._id,
    pickupAddress: {
      label: selectedAddress.label || "Home",
      street: selectedAddress.street,
      area: selectedAddress.area,
      city: selectedAddress.city,
      postalCode: selectedAddress.postalCode || "",
    },
    serviceArea: serviceArea._id,
    wasteItems: wasteItems.map((item) => ({
      category: item.category,
      estimatedQuantity: Number(item.estimatedQuantity),
    })),
    preferredDate,
    preferredTimeSlot: preferredTimeSlot || "morning",
    notes: notes?.trim() || "",
    status: bestCollector ? "assigned" : "pending",
    assignedCollector: bestCollector?._id || null,
    assignedAt,
    assignmentMethod: bestCollector ? "automatic" : null,
  };

  if (bestCollector) {
    requestData.assignmentHistory = [
      {
        collector: bestCollector._id,
        assignedBy: null,
        method: "automatic",
        assignedAt,
        note: "Automatically assigned by service area and workload",
      },
    ];
  }

  const createdRequest = await WastePickupRequest.create(requestData);

  const request = await populatePickupRequest(
    WastePickupRequest.findById(createdRequest._id)
  );

  return sendSuccess(
    res,
    201,
    bestCollector
      ? "Pickup request submitted and collector assigned"
      : "Pickup request submitted and is waiting for assignment",
    { request }
  );
});

// @route  GET /api/residents/pickup-requests
// @access resident
export const getMyPickupRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  if (status && !PICKUP_STATUSES.includes(status)) {
    return sendError(res, 400, "Invalid pickup request status");
  }

  const pageNumber = Math.max(Number(page) || 1, 1);
  const limitNumber = Math.min(
    Math.max(Number(limit) || 10, 1),
    100
  );
  const skip = (pageNumber - 1) * limitNumber;

  const filter = {
    resident: req.user._id,
  };

  if (status) {
    filter.status = status;
  }

  const [requests, total] = await Promise.all([
    populatePickupRequest(
      WastePickupRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
    ),
    WastePickupRequest.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, "Pickup requests fetched", {
    requests,
    pagination: {
      total,
      page: pageNumber,
      limit: limitNumber,
      pages: Math.ceil(total / limitNumber),
    },
  });
});

// @route  GET /api/residents/pickup-requests/:id
// @access resident
export const getMyPickupRequestById = asyncHandler(
  async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, 400, "Invalid pickup request ID");
    }

    const request = await populatePickupRequest(
      WastePickupRequest.findOne({
        _id: req.params.id,
        resident: req.user._id,
      })
    );

    if (!request) {
      return sendError(res, 404, "Pickup request not found");
    }

    return sendSuccess(res, 200, "Pickup request fetched", {
      request,
    });
  }
);

// @route  PATCH /api/residents/pickup-requests/:id/cancel
// @access resident
export const cancelPickupRequest = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return sendError(res, 400, "Invalid pickup request ID");
  }

  const request = await WastePickupRequest.findOne({
    _id: req.params.id,
    resident: req.user._id,
  });

  if (!request) {
    return sendError(res, 404, "Pickup request not found");
  }

  if (!["pending", "assigned"].includes(request.status)) {
    return sendError(
      res,
      400,
      `A request in '${request.status}' status cannot be cancelled`
    );
  }

  request.status = "cancelled";
  await request.save();

  const populatedRequest = await populatePickupRequest(
    WastePickupRequest.findById(request._id)
  );

  return sendSuccess(res, 200, "Pickup request cancelled", {
    request: populatedRequest,
  });
});
