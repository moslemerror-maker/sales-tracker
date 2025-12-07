// backend/middleware/auth.js

const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/jwt");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }
  console.log("VERIFY JWT_SECRET:", JWT_SECRET);
  console.log("VERIFY token start:", token.slice(0, 25));

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("JWT verify error:", err.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  });
};
