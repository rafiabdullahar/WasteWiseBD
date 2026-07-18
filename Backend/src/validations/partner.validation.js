const VALID_ORG_TYPES = [
  "recycling_center",
  "scrap_shop",
  "environmental_org",
  "other",
];
const VALID_MATERIALS = [
  "organic",
  "plastic",
  "paper",
  "glass",
  "metal",
  "electronic",
  "hazardous",
];

export const validatePartnerProfileUpdate = (body) => {
  const errors = {};
  const {
    organizationName,
    organizationType,
    contactEmail,
    acceptedMaterials,
  } = body;

  if (organizationName !== undefined && !organizationName.trim()) {
    errors.organizationName = "Organization name cannot be empty";
  }

  if (organizationType && !VALID_ORG_TYPES.includes(organizationType)) {
    errors.organizationType = `Must be one of: ${VALID_ORG_TYPES.join(", ")}`;
  }

  if (contactEmail !== undefined) {
    const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
    if (!EMAIL_REGEX.test(contactEmail)) {
      errors.contactEmail = "Invalid email format";
    }
  }

  if (acceptedMaterials !== undefined) {
    if (!Array.isArray(acceptedMaterials)) {
      errors.acceptedMaterials = "Must be an array";
    } else {
      const invalid = acceptedMaterials.filter(
        (m) => !VALID_MATERIALS.includes(m)
      );
      if (invalid.length > 0) {
        errors.acceptedMaterials = `Invalid materials: ${invalid.join(", ")}`;
      }
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};
