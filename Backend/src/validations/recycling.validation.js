const VALID_MATERIALS = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];
const VALID_TIME_SLOTS = ["morning", "afternoon", "evening"];

export const validateCreateRecyclingRequest = (body) => {
  const errors = {};
  const {
    pickupAddress,
    serviceArea,
    materials,
    preferredDate,
    preferredTimeSlot,
  } = body;

  // Address
  if (!pickupAddress) {
    errors.pickupAddress = "Pickup address is required";
  } else {
    if (!pickupAddress.street?.trim())
      errors["pickupAddress.street"] = "Street is required";
    if (!pickupAddress.area?.trim())
      errors["pickupAddress.area"] = "Area is required";
    if (!pickupAddress.city?.trim())
      errors["pickupAddress.city"] = "City is required";
  }

  if (!serviceArea) errors.serviceArea = "Service area is required";

  // Materials
  if (!materials || !Array.isArray(materials) || materials.length === 0) {
    errors.materials = "At least one material is required";
  } else {
    materials.forEach((mat, i) => {
      if (!mat.category || !VALID_MATERIALS.includes(mat.category)) {
        errors[`materials[${i}].category`] = `Invalid category: ${mat.category}`;
      }
      const qty = Number(mat.estimatedQuantity);
      if (isNaN(qty) || qty < 0.1) {
        errors[`materials[${i}].estimatedQuantity`] =
          "Quantity must be at least 0.1 kg";
      }
    });
  }

  // Date
  if (!preferredDate) {
    errors.preferredDate = "Preferred date is required";
  } else {
    const date = new Date(preferredDate);
    if (isNaN(date.getTime())) {
      errors.preferredDate = "Invalid date format";
    } else if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      errors.preferredDate = "Preferred date cannot be in the past";
    }
  }

  if (preferredTimeSlot && !VALID_TIME_SLOTS.includes(preferredTimeSlot)) {
    errors.preferredTimeSlot = `Must be one of: ${VALID_TIME_SLOTS.join(", ")}`;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
