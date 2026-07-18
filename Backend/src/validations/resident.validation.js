// ─── Resident validation helpers ─────────────────────────────────────────────

const VALID_HOUSEHOLD_TYPES = ["apartment", "house", "commercial", "other"];
const VALID_WASTE_CATEGORIES = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

export const validateProfileUpdate = (body) => {
  const errors = {};
  const { householdType, preferredWasteCategories } = body;

  if (householdType && !VALID_HOUSEHOLD_TYPES.includes(householdType)) {
    errors.householdType = `Must be one of: ${VALID_HOUSEHOLD_TYPES.join(", ")}`;
  }

  if (preferredWasteCategories !== undefined) {
    if (!Array.isArray(preferredWasteCategories)) {
      errors.preferredWasteCategories = "Must be an array";
    } else {
      const invalid = preferredWasteCategories.filter(
        (c) => !VALID_WASTE_CATEGORIES.includes(c)
      );
      if (invalid.length > 0) {
        errors.preferredWasteCategories = `Invalid categories: ${invalid.join(", ")}`;
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateAddressInput = (body) => {
  const errors = {};
  const { street, area, city } = body;

  if (!street || !street.trim()) errors.street = "Street is required";
  if (!area || !area.trim()) errors.area = "Area is required";
  if (!city || !city.trim()) errors.city = "City is required";

  return { isValid: Object.keys(errors).length === 0, errors };
};
