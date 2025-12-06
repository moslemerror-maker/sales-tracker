// backend/routes/attendance.js
const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /attendance/mark
// Headers: Authorization: Bearer <token>
// Body: { timestamp?, lat?, lng?, deviceId?, photoUrl? }
router.post("/mark", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { timestamp, lat, lng, deviceId, photoUrl, mode } = req.body;

    let normalizedMode = null;
    if (mode) {
      const upper = String(mode).toUpperCase();
      if (upper === "IN" || upper === "OUT") {
        normalizedMode = upper; // matches AttendanceMode enum
      }
    }

    const record = await prisma.attendance.create({
      data: {
        userId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
        lat,
        lng,
        deviceId: deviceId || null,
        photoUrl: photoUrl || null,
        mode: normalizedMode, // can be null, IN, or OUT
      },
    });

    res.status(201).json(record);
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /attendance/mine
// List current user's attendance records
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const rows = await prisma.attendance.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 50,
    });
    return res.json(rows);
  } catch (err) {
    console.error("Attendance list error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
