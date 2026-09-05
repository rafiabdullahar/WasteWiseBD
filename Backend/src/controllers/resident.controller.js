import mongoose from "mongoose";
import ResidentProfile from "../models/ResidentProfile.model.js";
import User from "../models/User.model.js";
import ServiceArea from "../models/ServiceArea.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  validateProfileUpdate,
  validateAddressInput,
} from "../validations/resident.validation.js";

// ─── Profile ────────────────────────────────────────────────────────────────

// @route  GET /api/residents/profile
// @access resident
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await ResidentProfile.findOne({
    user: req.user._id,
  })
    .populate("user", "name email phone")
    .populate("addresses.serviceArea", "name city");

  if (!profile) {
    return sendError(res, 404, "Resident profile not found");
  }

  return sendSuccess(res, 200, "Profile fetched successfully", {
    profile,
  });
});

// @route  PUT /api/residents/profile
// @access resident
export const updateProfile = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateProfileUpdate(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const allowedFields = [
    "householdType",
    "preferredWasteCategories",
    "profilePicture",
  ];

  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  // Also allow updating User-level fields
  // (name and phone) in the same call.
  const userUpdates = {};

  if (req.body.name) {
    userUpdates.name = req.body.name.trim();
  }

  if (req.body.phone) {
    userUpdates.phone = req.body.phone.trim();
  }

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(
      req.user._id,
      userUpdates
    );
  }

  const profile = await ResidentProfile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updates },
    {
      new: true,
      runValidators: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  )
    .populate("user", "name email phone")
    .populate("addresses.serviceArea", "name city");

  if (!profile) {
    return sendError(res, 500, "Failed to update profile");
  }

  return sendSuccess(res, 200, "Profile updated successfully", {
    profile,
  });
});

// ─── Addresses ─────────────────────────────────────────────────────────────

// @route  GET /api/residents/addresses
// @access resident
export const getAddresses = asyncHandler(async (req, res) => {
  const profile = await ResidentProfile.findOne({
    user: req.user._id,
  }).populate("addresses.serviceArea", "name city");

  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  return sendSuccess(res, 200, "Addresses fetched", {
    addresses: profile.addresses,
  });
});

// @route  POST /api/residents/addresses
// @access resident
export const addAddress = asyncHandler(async (req, res) => {
  const { isValid, errors } = validateAddressInput(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const {
    street,
    area,
    city,
    postalCode,
    label,
    serviceArea,
    isDefault,
  } = req.body;

  const newAddress = {
    street: street.trim(),
    area: area.trim(),
    city: city.trim(),
    postalCode: postalCode?.trim(),
    label: label?.trim() || "Home",
    serviceArea: serviceArea || undefined,
    isDefault: !!isDefault,
  };

  const profile = await ResidentProfile.findOne({
    user: req.user._id,
  });

  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  // If this address is being set as default,
  // clear the flag from all existing addresses.
  if (newAddress.isDefault) {
    profile.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  profile.addresses.push(newAddress);

  await profile.save();

  await profile.populate(
    "addresses.serviceArea",
    "name city"
  );

  return sendSuccess(res, 201, "Address added successfully", {
    addresses: profile.addresses,
  });
});

// @route  PUT /api/residents/addresses/:addressId
// @access resident
export const updateAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    return sendError(res, 400, "Invalid address ID");
  }

  const { isValid, errors } = validateAddressInput(req.body);

  if (!isValid) {
    return sendError(res, 400, "Validation failed", errors);
  }

  const profile = await ResidentProfile.findOne({
    user: req.user._id,
  });

  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  const address = profile.addresses.id(addressId);

  if (!address) {
    return sendError(res, 404, "Address not found");
  }

  const {
    street,
    area,
    city,
    postalCode,
    label,
    serviceArea,
    isDefault,
  } = req.body;

  if (isDefault) {
    profile.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  address.street = street.trim();
  address.area = area.trim();
  address.city = city.trim();

  if (postalCode !== undefined) {
    address.postalCode = postalCode.trim();
  }

  if (label) {
    address.label = label.trim();
  }

  if (serviceArea !== undefined) {
    address.serviceArea = serviceArea || undefined;
  }

  if (isDefault !== undefined) {
    address.isDefault = !!isDefault;
  }

  await profile.save();

  await profile.populate(
    "addresses.serviceArea",
    "name city"
  );

  return sendSuccess(res, 200, "Address updated successfully", {
    addresses: profile.addresses,
  });
});

// @route  DELETE /api/residents/addresses/:addressId
// @access resident
export const deleteAddress = asyncHandler(async (req, res) => {
  const { addressId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(addressId)) {
    return sendError(res, 400, "Invalid address ID");
  }

  const profile = await ResidentProfile.findOne({
    user: req.user._id,
  });

  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  const address = profile.addresses.id(addressId);

  if (!address) {
    return sendError(res, 404, "Address not found");
  }

  profile.addresses.pull(addressId);

  await profile.save();

  return sendSuccess(res, 200, "Address deleted successfully", {
    addresses: profile.addresses,
  });
});

// ─── Feature 6: Service Coverage Checker ──────────────────────────────────

// @route  GET /api/residents/addresses/:addressId/coverage
// @access resident
export const checkAddressCoverage = asyncHandler(
  async (req, res) => {
    const { addressId } = req.params;

    // Validate address ID.
    if (!mongoose.Types.ObjectId.isValid(addressId)) {
      return sendError(res, 400, "Invalid address ID");
    }

    // Find the logged-in resident's profile.
    const profile = await ResidentProfile.findOne({
      user: req.user._id,
    });

    if (!profile) {
      return sendError(res, 404, "Profile not found");
    }

    // Make sure the address belongs to this resident.
    const address = profile.addresses.id(addressId);

    if (!address) {
      return sendError(res, 404, "Address not found");
    }

    // The address does not have a service area.
    if (!address.serviceArea) {
      return sendSuccess(
        res,
        200,
        "Address coverage checked",
        {
          covered: false,
          message:
            "This address is not currently associated with a supported service area.",
          serviceArea: null,
        }
      );
    }

    // Check whether the assigned service area exists
    // and is currently active.
    const serviceArea = await ServiceArea.findOne({
      _id: address.serviceArea,
      isActive: true,
    }).select(
      "name city district description isActive"
    );

    // Service area doesn't exist or is inactive.
    if (!serviceArea) {
      return sendSuccess(
        res,
        200,
        "Address coverage checked",
        {
          covered: false,
          message:
            "Waste collection is currently unavailable in this service area.",
          serviceArea: null,
        }
      );
    }

    // Address is covered.
    return sendSuccess(
      res,
      200,
      "Address coverage checked",
      {
        covered: true,
        message: `Waste collection is available in ${serviceArea.name}.`,
        serviceArea,
      }
    );
  }
);