// backend/config/jwt.js

const JWT_SECRET = process.env.JWT_SECRET || "super-strong-secret-123";

module.exports = { JWT_SECRET };
