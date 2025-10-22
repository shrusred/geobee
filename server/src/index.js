// server/src/index.js
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import countriesRoutes from "./routes/countries.routes.js";
import favoritesRoutes from "./routes/favorites.routes.js";

dotenv.config();

const app = express();

// CORS Using localStorage , bearer token
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN, // e.g. http://localhost:5173
    credentials: false,
  })
);

// Core middleware
app.use(helmet());
app.use(express.json());

// Public routes
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);

// Geobee feature routes
app.use("/api", countriesRoutes);
app.use("/api/favorites", favoritesRoutes);

// Error handler at end
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 4000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB Atlas");
    app.listen(PORT, () => console.log(`Backend API running on :${PORT}`));
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
}

//test
//console.log("Environment:", process.env.NODE_ENV);

startServer();
