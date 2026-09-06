const VALID_CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
  "Bin Overflow",
  "Other",
];

const PICKUP_LINKED_CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
];

export const validateComplaintInput = (data) => {
  const errors = {};
  const { category, description, missedDate } = data;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.category = `category must be one of: ${VALID_CATEGORIES.join(", ")}`;
  }

  if (category === "Other" && (!description || !description.trim())) {
    errors.description = "Please describe the issue when selecting 'Other'";
  }

  if (PICKUP_LINKED_CATEGORIES.includes(category)) {
    if (!data.pickupRequest) {
      errors.pickupRequest = "Please select the pickup this complaint is about";
    }
  } else {
    if (!data.addressId) {
      errors.addressId = "Please select an address";
    }
  }

  if (!missedDate) {
    errors.missedDate = "Missed date is required";
  } else if (new Date(missedDate) > new Date()) {
    errors.missedDate = "Missed date cannot be in the future";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateStatusUpdate = (data) => {
  const errors = {};
  const validStatuses = ["Open", "Investigating", "Resolved", "Closed"];

  if (!data.status || !validStatuses.includes(data.status)) {
    errors.status = `status must be one of: ${validStatuses.join(", ")}`;
  }

  if (data.status === "Resolved") {
    if (!data.resolutionNotes || !data.resolutionNotes.trim()) {
      errors.resolutionNotes =
        "Resolution notes are required when marking a complaint as Resolved";
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};