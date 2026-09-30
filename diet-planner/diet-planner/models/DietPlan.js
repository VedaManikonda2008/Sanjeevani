// models/DietPlan.js

const mongoose = require("mongoose");

const mealSetSchema = new mongoose.Schema(
  {
    breakfast: { type: String, required: true },
    midMorningSnack: { type: String, required: true },
    lunch: { type: String, required: true },
    eveningSnack: { type: String, required: true },
    dinner: { type: String, required: true },
  },
  { _id: false }
);

const dailyMealPlanSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true }, // 1-indexed
    date: { type: Date, required: true },
    meals: { type: mealSetSchema, required: true },
    waterGoalLiters: { type: Number, required: true },
    proteinGoalGrams: { type: Number, required: true },
    exercise: { type: String, required: true },
  },
  { _id: false }
);

const dietPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of personal details at the time this plan was generated
    personalDetailsSnapshot: {
      name: String,
      age: Number,
      height: Number,
      weight: Number,
      allergies: [String],
      restrictions: [String],
      dislikedFoods: [String],
      preferences: [String],
      cuisine: String,
      cookingTime: String,
    },

    goal: {
      type: String,
      enum: ["Gain Weight", "Lose Weight", "Maintain Healthy Lifestyle"],
      required: true,
    },

    dietType: {
      type: String,
      enum: ["Vegetarian", "Non-Vegetarian", "Both"],
      required: true,
    },

    durationType: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },

    dailyMealPlans: { type: [dailyMealPlanSchema], required: true },

    status: {
      type: String,
      enum: ["Active", "Completed", "Cancelled"],
      default: "Active",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DietPlan", dietPlanSchema);
