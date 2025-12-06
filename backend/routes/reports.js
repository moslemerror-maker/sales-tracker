// backend/routes/reports.js

const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

// GET /reports/attendance?from=2025-01-01&to=2025-01-31&userId=1
router.get("/attendance", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { from, to, userId } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Query params 'from' and 'to' (YYYY-MM-DD) are required" });
    }

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const where = {
      timestamp: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (userId) {
      where.userId = Number(userId);
    }

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { timestamp: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(records);
  } catch (err) {
    console.error("Attendance report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /reports/users  -> list all users (to populate dropdown)
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    res.json(users);
  } catch (err) {
    console.error("Users report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /reports/visits?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=&dealerId=
router.get("/visits", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { from, to, userId, dealerId } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Query params 'from' and 'to' (YYYY-MM-DD) are required" });
    }

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const where = {
      checkInAt: {
        gte: fromDate,
        lte: toDate,
      },
    };

    if (userId) {
      where.userId = Number(userId);
    }

    if (dealerId) {
      where.dealerId = Number(dealerId);
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { checkInAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        dealer: {
          select: { id: true, name: true, city: true, type: true },
        },
      },
    });

    res.json(visits);
  } catch (err) {
    console.error("Visits report error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/dealers", authMiddleware, adminOnly, async (req, res) => {
  try {
    const dealers = await prisma.dealer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        city: true,
        type: true,
        approved: true,
        contactName: true,
        contactMobile: true,
        lat: true,
        lng: true,
        createdAt: true,
        createdBy: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    res.json(dealers);
  } catch (err) {
    console.error("Report dealers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
