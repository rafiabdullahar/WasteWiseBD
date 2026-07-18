const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const ALLOWED_ROLES = ["resident", "collector", "partner", "admin"];

export const validateRegisterInput = (body) => {
  const errors = {};
  const { name, email, password, role } = body;

  if (!name || !name.trim()) errors.name = "Name is required";

  if (!email || !email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Email format is invalid";
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (role && !ALLOWED_ROLES.includes(role)) {
    errors.role = `Role must be one of: ${ALLOWED_ROLES.join(", ")}`;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

export const validateLoginInput = (body) => {
  const errors = {};
  const { email, password } = body;

  if (!email || !email.trim()) errors.email = "Email is required";
  if (!password) errors.password = "Password is required";

  return { isValid: Object.keys(errors).length === 0, errors };
};
