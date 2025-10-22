import mongoose from "mongoose";

const FavoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    countryCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 100,
    },
  },
  { timestamps: true }
);

// Enforce one favorite per country per user
FavoriteSchema.index({ userId: 1, countryCode: 1 }, { unique: true });

export default mongoose.model("Favorite", FavoriteSchema);
