// backend/server.js

require("dotenv").config();           // load .env first
const express = require("express");
const cors = require("cors");


// import routes
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const locationRoutes = require("./routes/location");
const reportRoutes = require("./routes/reports");
const dealerRoutes = require("./routes/dealers");
const visitRoutes = require("./routes/visits");
const pjpRoutes = require("./routes/pjp");
const claimsRoutes = require("./routes/claims");


const app = express();

// Middlewares
app.use(cors());
app.use(express.json()); // parse JSON bodies
app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/location", locationRoutes);
app.use("/reports", reportRoutes);
app.use("/dealers", dealerRoutes);
app.use("/visits", visitRoutes);
app.use("/pjp", pjpRoutes);
app.use("/claims", claimsRoutes);


// Basic health check route
app.get("/", (req, res) => {
  res.send("Sales Tracker API is running ✅");
});

// ------------------------
// Start the server
// ------------------------
const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
