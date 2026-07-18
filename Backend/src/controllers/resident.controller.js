import mongoose from "mongoose";
import ResidentProfile from "../models/ResidentProfile.model.js";
import User from "../models/User.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendSuccess, sendError } from "../utils/apiResponse.js";
import {
  validateProfileUpdate,
  validateAddressInput,
} from "../validations/resident.validation.js";

// ─── Profile ─────────────────────────────────────────────────────────────────

// @route  GET /api/residents/profile
// @access resident
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await ResidentProfile.findOne({ user: req.user._id })
    .populate("user", "name email phone")
    .populate("addresses.serviceArea", "name city");

  if (!profile) {
    return sendError(res, 404, "Resident profile not found");
  }

  return sendSuccess(res, 200, "Profile fetched successfully", { profile });
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
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  // Also allow updating User-level fields (name, phone) in the same call
  const userUpdates = {};
  if (req.body.name) userUpdates.name = req.body.name.trim();
  if (req.body.phone) userUpdates.phone = req.body.phone.trim();

  if (Object.keys(userUpdates).length > 0) {
    await User.findByIdAndUpdate(req.user._id, userUpdates);
  }

const profile = await ResidentProfile.findOneAndUpdate(
  { user: req.user._id },
  { $set: updates },
  { new: true, runValidators: true }
)
  .populate("user", "name email phone")
  .populate("addresses.serviceArea", "name city");

return sendSuccess(res, 200, "Profile updated successfully", { profile });
});

// ─── Addresses ───────────────────────────────────────────────────────────────

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

  const { street, area, city, postalCode, label, serviceArea, isDefault } =
    req.body;

  const newAddress = {
    street: street.trim(),
    area: area.trim(),
    city: city.trim(),
    postalCode: postalCode?.trim(),
    label: label?.trim() || "Home",
    serviceArea: serviceArea || undefined,
    isDefault: !!isDefault,
  };

  const profile = await ResidentProfile.findOne({ user: req.user._id });
  if (!profile) {
    return sendError(res, 404, "Profile not found");
  }

  // If this is being set as default, clear the flag on all existing addresses.
  if (newAddress.isDefault) {
    profile.addresses.forEach((addr) => {
      addr.isDefault = false;
    });
  }

  profile.addresses.push(newAddress);
  await profile.save();

  await profile.populate("addresses.serviceArea", "name city");

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

  const profile = await ResidentProfile.findOne({ user: req.user._id });
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
  if (postalCode !== undefined) address.postalCode = postalCode.trim();
  if (label) address.label = label.trim();
  if (serviceArea !== undefined) address.serviceArea = serviceArea || undefined;
  if (isDefault !== undefined) address.isDefault = !!isDefault;

  await profile.save();
  await profile.populate("addresses.serviceArea", "name city");

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

  const profile = await ResidentProfile.findOne({ user: req.user._id });
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
