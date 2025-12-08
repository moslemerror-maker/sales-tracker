const express = require("express");
const router = express.Router();

const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

// GET /dashboard/summary
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const date = new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [presentUsers, visitsToday, pjpToday, claimsToday, totalEmployees] =
      await Promise.all([
        prisma.attendance
          .groupBy({
            by: ["userId"],
            where: {
              mode: "IN",
              timestamp: { gte: startOfDay, lte: endOfDay }
            }
          })
          .then((rows) => rows.length),

        prisma.visit.count({
          where: { timestamp: { gte: startOfDay, lte: endOfDay } }
        }),

        prisma.pJPItem
          ? prisma.pJPItem.count({
              where: { date: { gte: startOfDay, lte: endOfDay } }
            })
          : Promise.resolve(0),

        prisma.claim
          ? prisma.claim.count({
              where: { date: { gte: startOfDay, lte: endOfDay } }
            })
          : Promise.resolve(0),

        prisma.user.count()
      ]);

    res.json({
      date: startOfDay.toISOString().slice(0, 10),
      presentToday: presentUsers,
      visitsToday,
      pjpToday,
      claimsToday,
      totalEmployees
    });
  } catch (err) {
    console.error("Dashboard summary error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
