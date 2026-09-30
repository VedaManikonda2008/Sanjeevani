// models/DietProfile.js
// Stores the user's latest personal details for the Diet Planner.
// One document per user (upserted). A snapshot of these details is also
// copied into each DietPlan so historical plans keep the details as they
// were at the time the plan was created.

const mongoose = require("mongoose");

const dietProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one profile per user
    },
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 10, max: 100 },
    height: { type: Number, required: true }, // cm
    weight: { type: Number, required: true }, // kg
    allergies: { type: [String], default: [] },
    restrictions: { type: [String], default: [] }, // e.g. "lactose intolerant"
    dislikedFoods: { type: [String], default: [] },
    preferences: { type: [String], default: [] }, // e.g. "high fiber"
    cuisine: { type: String, default: "Any" },
    cookingTime: { type: String, default: "Any" }, // e.g. "Under 20 mins"
  },
  { timestamps: true }
);

module.exports = mongoose.model("DietProfile", dietProfileSchema);
