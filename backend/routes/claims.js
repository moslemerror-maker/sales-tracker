// backend/routes/claims.js

const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

function parseDateYMD(ymd) {
  if (!ymd) return null;
  return new Date(`${ymd}T00:00:00.000Z`);
}

/**
 * POST /claims
 * Body:
 * {
 *   "date": "2025-12-06",     // required
 *   "amount": 250.5,          // required
 *   "type": "Travel",         // optional text
 *   "description": "Bus fare from A to B",
 *   "distanceKm": 120        // optional
 * }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { date, amount, type, description, distanceKm } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date (YYYY-MM-DD) is required" });
    }
    if (amount == null || isNaN(Number(amount))) {
      return res
        .status(400)
        .json({ error: "amount is required and must be a number" });
    }

    const claimDate = parseDateYMD(date);
    if (isNaN(claimDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    const claim = await prisma.claim.create({
      data: {
        userId,
        date: claimDate,
        amount: Number(amount),
        type: type || null,
        description: description || null,
        distanceKm:
          distanceKm != null && !isNaN(Number(distanceKm))
            ? Number(distanceKm)
            : null,
        // status defaults to PENDING
      },
    });

    res.status(201).json(claim);
  } catch (err) {
    console.error("Create claim error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /claims/my?from=YYYY-MM-DD&to=YYYY-MM-DD
 * - List claims for the logged-in employee
 */
router.get("/my", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to } = req.query;

    let where = { userId };

    if (from && to) {
      const fromDate = parseDateYMD(from);
      const toDate = parseDateYMD(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ error: "Invalid date range" });
      }
      where.date = { gte: fromDate, lte: toDate };
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { date: "desc" },
    });

    res.json(claims);
  } catch (err) {
    console.error("Get my claims error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /claims
 * Admin list with filters:
 *   ?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=2&status=PENDING
 */
router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { from, to, userId, status } = req.query;

    const where = {};

    if (userId) {
      where.userId = Number(userId);
    }

    if (from && to) {
      const fromDate = parseDateYMD(from);
      const toDate = parseDateYMD(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return res.status(400).json({ error: "Invalid date range" });
      }
      where.date = { gte: fromDate, lte: toDate };
    }

    if (status) {
      const upper = String(status).toUpperCase();
      if (["PENDING", "APPROVED", "REJECTED"].includes(upper)) {
        where.status = upper;
      }
    }

    const claims = await prisma.claim.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        approvedByUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    res.json(claims);
  } catch (err) {
    console.error("Admin list claims error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /claims/:id/status
 * Body: { "status": "APPROVED" } or "REJECTED"
 * Only admin
 */
router.patch("/:id/status", authMiddleware, adminOnly, async (req, res) => {
  try {
    const claimId = Number(req.params.id);
    const { status } = req.body;
    const adminId = req.user.userId;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(String(status))) {
      return res.status(400).json({
        error: "status must be one of PENDING, APPROVED, REJECTED",
      });
    }

    const now = new Date();

    const updated = await prisma.claim.update({
      where: { id: claimId },
      data: {
        status,
        approvedAt: status === "PENDING" ? null : now,
        approvedBy: status === "PENDING" ? null : adminId,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Update claim status error:", err);
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Claim not found" });
    }
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
