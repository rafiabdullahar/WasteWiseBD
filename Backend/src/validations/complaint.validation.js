export const validateComplaintInput = (data) => {
  const errors = {};
  const { description } = data;

  if (!description || !description.trim()) {
    errors.description = "Description is required";
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