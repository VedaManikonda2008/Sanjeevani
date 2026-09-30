// models/DailyProgress.js
// One document per (plan, day). Holds the checkbox state for every task
// on that day. Nothing here is ever auto-completed — only explicit
// PUT /api/diet/progress requests from the user flip a task's `completed`
// flag, and every flip is persisted immediately.

const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: [
        "Breakfast",
        "Mid-morning Snack",
        "Lunch",
        "Evening Snack",
        "Dinner",
        "Water",
        "Protein",
        "Exercise",
      ],
    },
    plannedActivity: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const dailyProgressSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DietPlan",
      required: true,
      index: true,
    },
    date: { type: Date, required: true },
    dayNumber: { type: Number, required: true }, // 1-indexed, matches DietPlan.dailyMealPlans[].day

    tasks: { type: [taskSchema], required: true },

    completedTaskCount: { type: Number, default: 0 },
    totalTaskCount: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 }, // 0-100, rounded
  },
  { timestamps: true }
);

// A user can only have one progress record per plan per day
dailyProgressSchema.index({ plan: 1, dayNumber: 1 }, { unique: true });

module.exports = mongoose.model("DailyProgress", dailyProgressSchema);
