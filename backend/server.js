// backend/server.js

const express = require("express");
const cors = require("cors");

const app = express();

// Allow JSON in request bodies
app.use(express.json());

// Allow cross-origin requests (admin web + mobile app)
app.use(cors());

// Simple test route - this is just to confirm server works
app.get("/", (req, res) => {
  res.send("Sales Tracker API is running ✅");
});

// Choose a port for the server (4000 is common for APIs)
const PORT = 4000;

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
