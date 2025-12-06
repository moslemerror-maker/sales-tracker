// backend/routes/pjp.js

const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

/**
 * Helper to parse YYYY-MM-DD into Date at midnight UTC
 */
function parseDateYMD(ymd) {
  if (!ymd) return null;
  // Treat as date-only; you can adjust for timezone later if needed
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * POST /pjp
 * Body:
 *  {
 *    "date": "2025-12-05",       // required (YYYY-MM-DD)
 *    "notes": "optional text",
 *    "items": [
 *      { "dealerId": 3, "sequence": 1, "plannedTime": "2025-12-05T09:00:00Z" },
 *      { "dealerId": 5, "sequence": 2 }
 *    ]
 *  }
 *
 * - If PJP already exists for (user, date), we replace its items.
 * - If not, we create a new PJP row + items.
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, notes, items } = req.body;

    if (!date) {
      return res
        .status(400)
        .json({ error: "date (YYYY-MM-DD) is required in body" });
    }

    const planDate = parseDateYMD(date);
    if (isNaN(planDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ error: "items array is required and cannot be empty" });
    }

    // Normalize items
    const normalizedItems = items.map((it, index) => {
      if (!it.dealerId) {
        throw new Error("Each item must have dealerId");
      }
      const seq =
        typeof it.sequence === "number" && it.sequence > 0
          ? it.sequence
          : index + 1;

      let plannedTime = null;
      if (it.plannedTime) {
        const dt = new Date(it.plannedTime);
        if (!isNaN(dt.getTime())) {
          plannedTime = dt;
        }
      }

      return {
        dealerId: Number(it.dealerId),
        sequence: seq,
        plannedTime,
      };
    });

    // Upsert PJP for (userId, date)
    const plan = await prisma.pJP.upsert({
      where: {
        userId_date: {
          userId,
          date: planDate,
        },
      },
      update: {
        notes: notes || null,
        // We'll delete existing items and recreate
        items: {
          deleteMany: {}, // delete all existing items for this pjp
          create: normalizedItems,
        },
      },
      create: {
        userId,
        date: planDate,
        notes: notes || null,
        items: {
          create: normalizedItems,
        },
      },
      include: {
        items: {
          include: {
            dealer: {
              select: {
                id: true,
                name: true,
                city: true,
                type: true,
              },
            },
          },
          orderBy: { sequence: "asc" },
        },
      },
    });

    res.json(plan);
  } catch (err) {
    console.error("Create/update PJP error:", err);
    if (err.message && err.message.includes("dealerId")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /pjp/my?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - For the logged-in sales user to view their own PJP plans.
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Query params 'from' and 'to' are required" });
    }

    const fromDate = parseDateYMD(from);
    const toDate = parseDateYMD(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const plans = await prisma.pJP.findMany({
      where: {
        userId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: {
        date: "asc",
      },
      include: {
        items: {
          include: {
            dealer: {
              select: {
                id: true,
                name: true,
                city: true,
                type: true,
              },
            },
          },
          orderBy: { sequence: "asc" },
        },
      },
    });

    res.json(plans);
  } catch (err) {
    console.error("Get my PJP error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /pjp/user/:userId?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - Admin can view PJP for any user
 */
router.get("/user/:userId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    const { from, to } = req.query;

    if (!from || !to) {
      return res
        .status(400)
        .json({ error: "Query params 'from' and 'to' are required" });
    }

    const fromDate = parseDateYMD(from);
    const toDate = parseDateYMD(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const plans = await prisma.pJP.findMany({
      where: {
        userId: targetUserId,
        date: {
          gte: fromDate,
          lte: toDate,
        },
      },
      orderBy: {
        date: "asc",
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            dealer: {
              select: {
                id: true,
                name: true,
                city: true,
                type: true,
              },
            },
          },
          orderBy: { sequence: "asc" },
        },
      },
    });

    res.json(plans);
  } catch (err) {
    console.error("Admin get user PJP error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
