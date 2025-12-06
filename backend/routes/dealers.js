// backend/routes/dealers.js

const express = require("express");
const prisma = require("../db");
const authMiddleware = require("../middleware/auth");
const adminOnly = require("../middleware/admin");


const router = express.Router();

// POST /dealers
// Body: { name, type, address?, city?, phone? }
// type should be "dealer" or "sub-dealer"
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      name,
      type,
      address,
      city,
      phone,
      contactName,
      contactMobile,
      lat,
      lng,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "name and type are required" });
    }

    if (!["dealer", "sub-dealer", "subdealer"].includes(type.toLowerCase())) {
      return res
        .status(400)
        .json({ error: "type must be 'dealer' or 'sub-dealer'" });
    }

    const normalizedType =
      type.toLowerCase() === "dealer" ? "dealer" : "sub-dealer";

    const dealer = await prisma.dealer.create({
      data: {
        name,
        type: normalizedType,
        address: address || null,
        city: city || null,

        phone: phone || null,
        contactName: contactName || null,
        contactMobile: contactMobile || null,

        lat: lat != null ? Number(lat) : null,
        lng: lng != null ? Number(lng) : null,

        createdBy: userId,
        approved: false,
      },
    });

    res.status(201).json(dealer);
  } catch (err) {
    console.error("Create dealer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// GET /dealers?search=&type=&approved=
// type: "dealer" or "sub-dealer"
// approved: "true" or "false"
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { search, type, approved } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (approved === "true") where.approved = true;
    if (approved === "false") where.approved = false;

    const dealers = await prisma.dealer.findMany({
      where,
      orderBy: { name: "asc" },
    });

    res.json(dealers);
  } catch (err) {
    console.error("List dealers error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /dealers/:id/approve
// Simple endpoint to mark dealer approved (we'll later restrict to admin)
router.patch("/:id/approve", authMiddleware, adminOnly, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const dealer = await prisma.dealer.update({
      where: { id },
      data: { approved: true },
    });
    res.json(dealer);
  } catch (err) {
    console.error("Approve dealer error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
