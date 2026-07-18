import jwt from "jsonwebtoken";

// Signs a JWT carrying the user's id and role (used for role-based
// authorization in the auth middleware).
export const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// Sets the JWT as an httpOnly cookie so the frontend never has to
// handle the raw token in JS (reduces XSS token-theft risk).
export const sendTokenCookie = (res, token) => {
  const cookieDays = Number(process.env.COOKIE_EXPIRES_DAYS) || 7;

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: cookieDays * 24 * 60 * 60 * 1000,
  });
};
