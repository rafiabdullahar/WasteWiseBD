// Backend/src/validations/overflowReport.validation.js

export const validateOverflowReportInput = (data) => {
  const errors = {};
  const { area, locationDescription, description } = data;

  if (!area) {
    errors.area = "Please select an area";
  }

  if (!locationDescription || !locationDescription.trim()) {
    errors.locationDescription = "Location description is required";
  }

  // description is optional, so no required check — but guard against
  // someone sending something silly like just whitespace.
  if (description && !description.trim()) {
    errors.description = "Description cannot be blank spaces only";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateOverflowStatusUpdate = (data) => {
  const errors = {};
  const validStatuses = ["Pending", "In Progress", "Resolved"];

  if (!data.status || !validStatuses.includes(data.status)) {
    errors.status = `status must be one of: ${validStatuses.join(", ")}`;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};