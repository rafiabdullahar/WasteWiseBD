const VALID_CATEGORIES = [
  "Missed Pickup",
  "Partial Collection",
  "Wrong Waste Handling",
  "Bin Overflow",
  "Other",
];

export const validateComplaintInput = (data) => {
  const errors = {};
  const { category, description, area, missedDate } = data;

  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.category = `category must be one of: ${VALID_CATEGORIES.join(", ")}`;
  }

  if (category === "Other" && (!description || !description.trim())) {
    errors.description = "Please describe the issue when selecting 'Other'";
  }

  if (!area || !area.trim()) {
    errors.area = "Area is required";
  }

  if (!missedDate) {
    errors.missedDate = "Missed date is required";
  }else if (new Date(missedDate) > new Date()) {
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

  return { isValid: Object.keys(errors).length === 0, errors };
};