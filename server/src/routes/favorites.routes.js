// server/src/routes/favorites.routes.js
import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Favorite from "../models/Favorite.js";

const router = express.Router();

// Protect all favorites routes
router.use(requireAuth);

// Helpers
const MAX_LEN = 100;
const isValidISO3 = (code) => /^[A-Za-z]{3}$/.test((code || "").trim());
const cleanString = (v, max = MAX_LEN) => {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (s === "") return undefined;
  return s.slice(0, max);
};

/**
 * POST /api/favorites
 * Body: { countryCode: "CAN", label?: string, note?: string }
 */
router.post("/", async (req, res, next) => {
  try {
    const { countryCode } = req.body || {};
    const label = cleanString(req.body?.label);
    const note = cleanString(req.body?.note);

    if (!isValidISO3(countryCode)) {
      return res
        .status(400)
        .json({ error: "countryCode must be a 3-letter ISO code" });
    }

    const userId = req.user.id;
    const code = String(countryCode).toUpperCase();

    // Duplicate check (schema should also have unique compound index on { userId, countryCode })
    const exists = await Favorite.findOne({ userId, countryCode: code }).lean();
    if (exists) {
      return res
        .status(409)
        .json({ error: "Favorite already exists for this country" });
    }

    const created = await Favorite.create({
      userId,
      countryCode: code,
      label,
      note,
    });

    return res
      .status(201)
      .location(`/api/favorites/${created._id}`)
      .json(created);
  } catch (err) {
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "User already favorited this country" });
    }
    next(err);
  }
});

/**
 * GET /api/favorites
 * Returns the current user's favorites
 */
router.get("/", async (req, res, next) => {
  try {
    const items = await Favorite.find({ userId: req.user.id })
      .select("-__v") // trim Mongoose version key
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/favorites/:id
 * Body: { label?: string, note?: string }
 * Updates label and/or note
 */
router.patch("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid favorite id" });
    }

    const update = {};
    const label = cleanString(req.body?.label);
    const note = cleanString(req.body?.note);

    // Only set fields that are explicitly provided (and not empty after trim)
    if (req.body?.label !== undefined) update.label = label;
    if (req.body?.note !== undefined) update.note = note;

    // If both were provided but cleaned to undefined (empty strings), it's a no-op
    const hasAnyField =
      Object.prototype.hasOwnProperty.call(update, "label") ||
      Object.prototype.hasOwnProperty.call(update, "note");
    if (!hasAnyField) {
      return res
        .status(400)
        .json({ error: "Provide non-empty label and/or note to update" });
    }

    const updated = await Favorite.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { $set: update },
      { new: true, runValidators: true }
    ).select("-__v");

    if (!updated) return res.status(404).json({ error: "Favorite not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/favorites/:id
 * Removes a favorite owned by user
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid favorite id" });
    }

    const result = await Favorite.deleteOne({ _id: id, userId: req.user.id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
