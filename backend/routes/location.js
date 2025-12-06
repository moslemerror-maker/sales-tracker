// backend/routes/location.js

const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

// POST /location/live
// Body: { lat, lng }
// Uses userId from JWT
router.post("/live", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { lat, lng } = req.body;

    if (lat == null || lng == null) {
      return res.status(400).json({ error: "lat and lng are required" });
    }

    const location = await prisma.lastLocation.upsert({
      where: { userId },
      update: { lat: Number(lat), lng: Number(lng) },
      create: { userId, lat: Number(lat), lng: Number(lng) },
    });

    return res.json({ ok: true, location });
  } catch (err) {
    console.error("Live location error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /location/all
// For now: returns all users' last locations (admin use later)
router.get("/all", authMiddleware, adminOnly, async (req, res) => {
  try {
    const locations = await prisma.lastLocation.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
    return res.json(locations);
  } catch (err) {
    console.error("List locations error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
