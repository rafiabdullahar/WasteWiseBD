const VALID_WASTE_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

const VALID_TIME_SLOTS = ["morning", "afternoon", "evening"];

export const validateCreatePickupRequest = (body) => {
  const errors = {};
  const {
    addressId,
    wasteItems,
    preferredDate,
    preferredTimeSlot,
    notes,
  } = body;

  if (!addressId || typeof addressId !== "string" || !addressId.trim()) {
    errors.addressId = "Pickup address is required";
  }

  if (!Array.isArray(wasteItems) || wasteItems.length === 0) {
    errors.wasteItems = "At least one waste item is required";
  } else {
    const seenCategories = new Set();

    wasteItems.forEach((item, index) => {
      if (
        !item?.category ||
        !VALID_WASTE_CATEGORIES.includes(item.category)
      ) {
        errors[`wasteItems[${index}].category`] =
          "A valid waste category is required";
      } else if (seenCategories.has(item.category)) {
        errors[`wasteItems[${index}].category`] =
          "Duplicate waste categories are not allowed";
      } else {
        seenCategories.add(item.category);
      }

      const quantity = Number(item?.estimatedQuantity);

      if (!Number.isFinite(quantity) || quantity < 0.1) {
        errors[`wasteItems[${index}].estimatedQuantity`] =
          "Quantity must be at least 0.1 kg";
      }
    });
  }

  if (!preferredDate) {
    errors.preferredDate = "Preferred date is required";
  } else {
    const date = new Date(preferredDate);
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(date.getTime())) {
      errors.preferredDate = "Invalid preferred date";
    } else if (date < today) {
      errors.preferredDate = "Preferred date cannot be in the past";
    }
  }

  if (
    preferredTimeSlot &&
    !VALID_TIME_SLOTS.includes(preferredTimeSlot)
  ) {
    errors.preferredTimeSlot = `Time slot must be one of: ${VALID_TIME_SLOTS.join(
      ", "
    )}`;
  }

  if (notes !== undefined && String(notes).trim().length > 500) {
    errors.notes = "Notes cannot exceed 500 characters";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
