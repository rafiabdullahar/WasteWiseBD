const VALID_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const VALID_TIME_SLOTS = ["morning", "afternoon", "evening"];

const VALID_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

export const validateCreateSchedule = (data) => {
  const errors = {};
  const { serviceArea, dayOfWeek, timeSlot, wasteCategories } = data;

  if (!serviceArea || !serviceArea.trim()) {
    errors.serviceArea = "Service area is required";
  }

  if (!dayOfWeek || !VALID_DAYS.includes(dayOfWeek)) {
    errors.dayOfWeek = `Day of week must be one of: ${VALID_DAYS.join(", ")}`;
  }

  if (!timeSlot || !VALID_TIME_SLOTS.includes(timeSlot)) {
    errors.timeSlot = `Time slot must be one of: ${VALID_TIME_SLOTS.join(", ")}`;
  }

  if (wasteCategories && Array.isArray(wasteCategories)) {
    const invalid = wasteCategories.filter(
      (cat) => !VALID_CATEGORIES.includes(cat)
    );
    if (invalid.length > 0) {
      errors.wasteCategories = `Invalid categories: ${invalid.join(", ")}`;
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateUpdateSchedule = (data) => {
  const errors = {};
  const { dayOfWeek, timeSlot, wasteCategories } = data;

  if (dayOfWeek !== undefined && !VALID_DAYS.includes(dayOfWeek)) {
    errors.dayOfWeek = `Day of week must be one of: ${VALID_DAYS.join(", ")}`;
  }

  if (timeSlot !== undefined && !VALID_TIME_SLOTS.includes(timeSlot)) {
    errors.timeSlot = `Time slot must be one of: ${VALID_TIME_SLOTS.join(", ")}`;
  }

  if (wasteCategories !== undefined) {
    if (!Array.isArray(wasteCategories)) {
      errors.wasteCategories = "wasteCategories must be an array";
    } else {
      const invalid = wasteCategories.filter(
        (cat) => !VALID_CATEGORIES.includes(cat)
      );
      if (invalid.length > 0) {
        errors.wasteCategories = `Invalid categories: ${invalid.join(", ")}`;
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
