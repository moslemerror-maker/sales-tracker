// backend/routes/visits.js

const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// POST /visits/check-in
// Body: { dealerId, lat?, lng?, notes? }
router.post("/check-in", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { dealerId, lat, lng, notes } = req.body;

    if (!dealerId) {
      return res.status(400).json({ error: "dealerId is required" });
    }

    // Ensure dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id: Number(dealerId) },
    });

    if (!dealer) {
      return res.status(404).json({ error: "Dealer not found" });
    }

    const now = new Date();

    const visit = await prisma.visit.create({
      data: {
        userId,
        dealerId: Number(dealerId),
        checkInAt: now,
        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,
        notes: notes || null,
      },
      include: {
        dealer: true,
      },
    });

    res.status(201).json(visit);
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /visits/:id/check-out
// Body: { lat?, lng? }
router.post("/:id/check-out", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const id = Number(req.params.id);
    const { lat, lng } = req.body;

    // Ensure visit exists and belongs to this user
    const visit = await prisma.visit.findUnique({ where: { id } });
    if (!visit || visit.userId !== userId) {
      return res.status(404).json({ error: "Visit not found or not yours" });
    }

    if (visit.checkOutAt) {
      return res.status(400).json({ error: "Visit already checked out" });
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        checkOutAt: new Date(),
        lat: lat != null ? Number(lat) : visit.lat,
        lng: lng != null ? Number(lng) : visit.lng,
      },
      include: {
        dealer: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("Check-out error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /visits/mine?from=&to=&dealerId=
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { from, to, dealerId } = req.query;

    const where = {
      userId,
    };

    if (from && to) {
      where.checkInAt = {
        gte: new Date(`${from}T00:00:00.000Z`),
        lte: new Date(`${to}T23:59:59.999Z`),
      };
    }

    if (dealerId) {
      where.dealerId = Number(dealerId);
    }

    const visits = await prisma.visit.findMany({
      where,
      orderBy: { checkInAt: "desc" },
      include: {
        dealer: true,
      },
    });

    res.json(visits);
  } catch (err) {
    console.error("List my visits error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
