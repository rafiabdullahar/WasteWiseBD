const CATEGORIES = ["Organic", "Plastic", "Paper", "Glass", "Metal", "Electronic", "Hazardous"];

export const validateGuidelineInput = (data, isUpdate = false) => {
  const errors = {};
  const { wasteCategory, title, instructions, doList, dontList } = data;

  if (!isUpdate || wasteCategory !== undefined) {
    if (!wasteCategory || !CATEGORIES.includes(wasteCategory)) {
      errors.wasteCategory = `wasteCategory must be one of: ${CATEGORIES.join(", ")}`;
    }
  }

  if (!isUpdate || title !== undefined) {
    if (!title || !title.trim()) errors.title = "Title is required";
  }

  if (!isUpdate || instructions !== undefined) {
    if (!instructions || !instructions.trim()) errors.instructions = "Instructions are required";
  }

  if (doList !== undefined && !Array.isArray(doList)) {
    errors.doList = "doList must be an array of strings";
  }

  if (dontList !== undefined && !Array.isArray(dontList)) {
    errors.dontList = "dontList must be an array of strings";
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};