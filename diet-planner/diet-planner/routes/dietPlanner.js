// routes/dietPlanner.js
//
// Mount this in your existing server.js / app.js:
//
//   const dietPlannerRoutes = require("./routes/dietPlanner");
//   app.use("/api/diet", protect, dietPlannerRoutes);
//
// IMPORTANT: This router assumes you already have an auth middleware
// (commonly called `protect` / `authMiddleware`) that runs BEFORE these
// routes and sets `req.user = { id: <logged in user's _id>, ... }` from
// your existing Sanjeevani login/JWT system. We are NOT creating a new
// login system — we are reusing whatever already populates req.user
// elsewhere in your app (adjust the field name below if yours differs,
// e.g. req.user._id instead of req.user.id).

const express = require("express");
const router = express.Router();

const DietProfile = require("../models/DietProfile");
const DietPlan = require("../models/DietPlan");
const DailyProgress = require("../models/DailyProgress");

const { calculatePlanDuration, isFutureDate } = require("../utils/dateUtils");
const {
  generateDailyMealPlans,
  buildTasksForDay,
} = require("../utils/mealGenerator");

// small helper so we don't repeat req.user.id vs req.user._id everywhere
function getUserId(req) {
  return req.user.id || req.user._id;
}

/* ------------------------------------------------------------------ */
/* 1. PERSONAL DETAILS                                                 */
/* ------------------------------------------------------------------ */

// GET existing profile (used to prefill the form if the user has one)
router.get("/profile", async (req, res) => {
  try {
    const profile = await DietProfile.findOne({ user: getUserId(req) });
    res.json({ success: true, profile: profile || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load profile" });
  }
});

// POST/UPSERT personal details
router.post("/profile", async (req, res) => {
  try {
    const {
      name,
      age,
      height,
      weight,
      allergies,
      restrictions,
      dislikedFoods,
      preferences,
      cuisine,
      cookingTime,
    } = req.body;

    if (!name || !age || !height || !weight) {
      return res.status(400).json({
        success: false,
        message: "Name, age, height and weight are required.",
      });
    }

    const profile = await DietProfile.findOneAndUpdate(
      { user: getUserId(req) },
      {
        user: getUserId(req),
        name,
        age,
        height,
        weight,
        allergies: allergies || [],
        restrictions: restrictions || [],
        dislikedFoods: dislikedFoods || [],
        preferences: preferences || [],
        cuisine: cuisine || "Any",
        cookingTime: cookingTime || "Any",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
});

/* ------------------------------------------------------------------ */
/* 2-6. GOAL / DIET TYPE / DURATION / GENERATE (PREVIEW ONLY)          */
/* ------------------------------------------------------------------ */

// POST /api/diet/generate
// Body: { goal, dietType, durationType, startDate }
// Generates a plan PREVIEW. Nothing is saved to the DB yet.
router.post("/generate", async (req, res) => {
  try {
    const { goal, dietType, durationType, startDate } = req.body;

    const validGoals = ["Gain Weight", "Lose Weight", "Maintain Healthy Lifestyle"];
    const validDietTypes = ["Vegetarian", "Non-Vegetarian", "Both"];
    const validDurations = ["weekly", "monthly"];

    if (!validGoals.includes(goal)) {
      return res.status(400).json({ success: false, message: "Invalid goal." });
    }
    if (!validDietTypes.includes(dietType)) {
      return res.status(400).json({ success: false, message: "Invalid diet type." });
    }
    if (!validDurations.includes(durationType)) {
      return res.status(400).json({ success: false, message: "Invalid duration type." });
    }
    if (!startDate) {
      return res.status(400).json({ success: false, message: "startDate is required." });
    }

    const profile = await DietProfile.findOne({ user: getUserId(req) });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "Please save your personal details before generating a plan.",
      });
    }

    const { totalDays, endDate } = calculatePlanDuration(startDate, durationType);

    const dailyMealPlans = generateDailyMealPlans(
      profile,
      goal,
      dietType,
      startDate,
      totalDays
    );

    res.json({
      success: true,
      preview: {
        goal,
        dietType,
        durationType,
        startDate,
        endDate,
        totalDays,
        personalDetailsSnapshot: profile,
        dailyMealPlans,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to generate plan preview" });
  }
});

/* ------------------------------------------------------------------ */
/* 7. START THIS PLAN -> save DietPlan + create DailyProgress records  */
/* ------------------------------------------------------------------ */

// POST /api/diet/start
// Body: same as /generate: { goal, dietType, durationType, startDate }
// Regenerates the SAME deterministic plan and persists it.
router.post("/start", async (req, res) => {
  try {
    const { goal, dietType, durationType, startDate } = req.body;

    const profile = await DietProfile.findOne({ user: getUserId(req) });
    if (!profile) {
      return res.status(400).json({
        success: false,
        message: "Please save your personal details before starting a plan.",
      });
    }

    const { totalDays, endDate } = calculatePlanDuration(startDate, durationType);
    const dailyMealPlans = generateDailyMealPlans(
      profile,
      goal,
      dietType,
      startDate,
      totalDays
    );

    const plan = await DietPlan.create({
      user: getUserId(req),
      personalDetailsSnapshot: {
        name: profile.name,
        age: profile.age,
        height: profile.height,
        weight: profile.weight,
        allergies: profile.allergies,
        restrictions: profile.restrictions,
        dislikedFoods: profile.dislikedFoods,
        preferences: profile.preferences,
        cuisine: profile.cuisine,
        cookingTime: profile.cookingTime,
      },
      goal,
      dietType,
      durationType,
      startDate,
      endDate,
      totalDays,
      dailyMealPlans,
      status: "Active",
    });

    // Create one DailyProgress record per day, all unchecked.
    const progressDocs = dailyMealPlans.map((dmp) => ({
      user: getUserId(req),
      plan: plan._id,
      date: dmp.date,
      dayNumber: dmp.day,
      tasks: buildTasksForDay(dmp),
      completedTaskCount: 0,
      totalTaskCount: buildTasksForDay(dmp).length,
      completionPercentage: 0,
    }));

    await DailyProgress.insertMany(progressDocs);

    res.status(201).json({ success: true, planId: plan._id, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to start plan" });
  }
});

/* ------------------------------------------------------------------ */
/* Helper: fetch a plan and verify ownership                           */
/* ------------------------------------------------------------------ */

async function getOwnedPlan(req, res) {
  const plan = await DietPlan.findById(req.params.planId);
  if (!plan) {
    res.status(404).json({ success: false, message: "Plan not found." });
    return null;
  }
  if (plan.user.toString() !== getUserId(req).toString()) {
    res.status(403).json({ success: false, message: "Not authorized to access this plan." });
    return null;
  }
  return plan;
}

// GET /api/diet/plan/:planId
router.get("/plan/:planId", async (req, res) => {
  try {
    const plan = await getOwnedPlan(req, res);
    if (!plan) return;
    res.json({ success: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load plan" });
  }
});

/* ------------------------------------------------------------------ */
/* 8-9. DAILY TRACKING + SAVE CHECKBOX STATE                           */
/* ------------------------------------------------------------------ */

// GET /api/diet/progress/:planId/:dayNumber
router.get("/progress/:planId/:dayNumber", async (req, res) => {
  try {
    const plan = await getOwnedPlan(req, res);
    if (!plan) return;

    const dayNumber = Number(req.params.dayNumber);
    const progress = await DailyProgress.findOne({
      plan: plan._id,
      dayNumber,
    });

    if (!progress) {
      return res.status(404).json({ success: false, message: "Day not found in this plan." });
    }

    res.json({ success: true, progress, totalDays: plan.totalDays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load day progress" });
  }
});

// PUT /api/diet/progress/:planId/:dayNumber
// Body: { taskName, completed }  -- flips ONE task's checkbox.
// Nothing is ever auto-completed; this only reacts to an explicit
// user click, and the new state is written to MongoDB immediately.
router.put("/progress/:planId/:dayNumber", async (req, res) => {
  try {
    const plan = await getOwnedPlan(req, res);
    if (!plan) return;

    const { taskName, completed } = req.body;
    if (typeof completed !== "boolean" || !taskName) {
      return res.status(400).json({
        success: false,
        message: "taskName and a boolean 'completed' value are required.",
      });
    }

    const dayNumber = Number(req.params.dayNumber);
    const progress = await DailyProgress.findOne({ plan: plan._id, dayNumber });
    if (!progress) {
      return res.status(404).json({ success: false, message: "Day not found in this plan." });
    }

    const task = progress.tasks.find((t) => t.name === taskName);
    if (!task) {
      return res.status(400).json({ success: false, message: "Unknown task name." });
    }

    task.completed = completed;
    task.completedAt = completed ? new Date() : null;

    const completedCount = progress.tasks.filter((t) => t.completed).length;
    progress.completedTaskCount = completedCount;
    progress.totalTaskCount = progress.tasks.length;
    progress.completionPercentage = Math.round(
      (completedCount / progress.tasks.length) * 100
    );

    await progress.save();

    // If every day of the plan is now at 100% and the plan's end date has
    // passed, we don't auto-flip status here (report route handles that
    // when explicitly requested) — this keeps checkbox saves fast and
    // side-effect free.

    res.json({ success: true, progress });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to update task" });
  }
});

/* ------------------------------------------------------------------ */
/* 10-12. WEEKLY / MONTHLY OVERVIEW                                    */
/* ------------------------------------------------------------------ */

// GET /api/diet/overview/:planId
// Returns per-day status: Completed / Partial / Incomplete / Future
router.get("/overview/:planId", async (req, res) => {
  try {
    const plan = await getOwnedPlan(req, res);
    if (!plan) return;

    const progressRecords = await DailyProgress.find({ plan: plan._id }).sort({
      dayNumber: 1,
    });

    const overview = progressRecords.map((p) => {
      let status;
      if (isFutureDate(p.date)) {
        status = "Future";
      } else if (p.completionPercentage === 100) {
        status = "Completed";
      } else if (p.completionPercentage > 0) {
        status = "Partial";
      } else {
        status = "Incomplete";
      }

      return {
        day: p.dayNumber,
        date: p.date,
        completedTaskCount: p.completedTaskCount,
        totalTaskCount: p.totalTaskCount,
        completionPercentage: p.completionPercentage,
        status,
      };
    });

    // Group into weeks of 7 for a "Week 1 / Week 2 ..." style view
    const weeks = [];
    for (let i = 0; i < overview.length; i += 7) {
      weeks.push({
        weekNumber: Math.floor(i / 7) + 1,
        days: overview.slice(i, i + 7),
      });
    }

    res.json({ success: true, overview, weeks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load overview" });
  }
});

/* ------------------------------------------------------------------ */
/* 13. FINAL COMPLETION REPORT                                         */
/* ------------------------------------------------------------------ */

// GET /api/diet/report/:planId
router.get("/report/:planId", async (req, res) => {
  try {
    const plan = await getOwnedPlan(req, res);
    if (!plan) return;

    const progressRecords = await DailyProgress.find({ plan: plan._id }).sort({
      dayNumber: 1,
    });

    let totalTasksAssigned = 0;
    let totalTasksCompleted = 0;
    let fullyCompletedDays = 0;
    let incompleteDays = 0;

    const perTaskTypeStats = {
      Breakfast: { assigned: 0, completed: 0 },
      "Mid-morning Snack": { assigned: 0, completed: 0 },
      Lunch: { assigned: 0, completed: 0 },
      "Evening Snack": { assigned: 0, completed: 0 },
      Dinner: { assigned: 0, completed: 0 },
      Water: { assigned: 0, completed: 0 },
      Protein: { assigned: 0, completed: 0 },
      Exercise: { assigned: 0, completed: 0 },
    };

    const dailyProgressSummary = [];

    progressRecords.forEach((p) => {
      totalTasksAssigned += p.totalTaskCount;
      totalTasksCompleted += p.completedTaskCount;

      if (p.completionPercentage === 100) fullyCompletedDays++;
      else if (!isFutureDate(p.date)) incompleteDays++;

      p.tasks.forEach((t) => {
        if (perTaskTypeStats[t.name]) {
          perTaskTypeStats[t.name].assigned++;
          if (t.completed) perTaskTypeStats[t.name].completed++;
        }
      });

      dailyProgressSummary.push({
        day: p.dayNumber,
        date: p.date,
        completionPercentage: p.completionPercentage,
      });
    });

    const overallCompletionPercentage =
      totalTasksAssigned > 0
        ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100)
        : 0;

    // Category completion rates (meals combined, water, protein, exercise)
    const mealKeys = ["Breakfast", "Mid-morning Snack", "Lunch", "Evening Snack", "Dinner"];
    const mealAssigned = mealKeys.reduce((s, k) => s + perTaskTypeStats[k].assigned, 0);
    const mealCompleted = mealKeys.reduce((s, k) => s + perTaskTypeStats[k].completed, 0);

    const categoryCompletion = {
      meals: mealAssigned ? Math.round((mealCompleted / mealAssigned) * 100) : 0,
      water: perTaskTypeStats.Water.assigned
        ? Math.round((perTaskTypeStats.Water.completed / perTaskTypeStats.Water.assigned) * 100)
        : 0,
      protein: perTaskTypeStats.Protein.assigned
        ? Math.round((perTaskTypeStats.Protein.completed / perTaskTypeStats.Protein.assigned) * 100)
        : 0,
      exercise: perTaskTypeStats.Exercise.assigned
        ? Math.round((perTaskTypeStats.Exercise.completed / perTaskTypeStats.Exercise.assigned) * 100)
        : 0,
    };

    // Frequently incomplete tasks = task types with the lowest completion rate
    const frequentlyIncompleteTasks = Object.entries(perTaskTypeStats)
      .map(([name, stats]) => ({
        name,
        completionRate: stats.assigned ? Math.round((stats.completed / stats.assigned) * 100) : 0,
        missed: stats.assigned - stats.completed,
      }))
      .filter((t) => t.missed > 0)
      .sort((a, b) => a.completionRate - b.completionRate)
      .slice(0, 3);

    // Weekly summary (reuses same week grouping as overview)
    const weeklySummary = [];
    for (let i = 0; i < dailyProgressSummary.length; i += 7) {
      const weekSlice = dailyProgressSummary.slice(i, i + 7);
      const avg =
        weekSlice.reduce((s, d) => s + d.completionPercentage, 0) / weekSlice.length;
      weeklySummary.push({
        weekNumber: Math.floor(i / 7) + 1,
        averageCompletion: Math.round(avg),
        days: weekSlice,
      });
    }

    // If the plan's end date has passed and it's still Active, mark Completed
    if (plan.status === "Active" && !isFutureDate(plan.endDate)) {
      plan.status = "Completed";
      await plan.save();
    }

    res.json({
      success: true,
      report: {
        planId: plan._id,
        goal: plan.goal,
        dietType: plan.dietType,
        durationType: plan.durationType,
        startDate: plan.startDate,
        endDate: plan.endDate,
        totalDays: plan.totalDays,
        fullyCompletedDays,
        incompleteDays,
        totalTasksAssigned,
        totalTasksCompleted,
        overallCompletionPercentage,
        dailyProgress: dailyProgressSummary,
        weeklySummary,
        categoryCompletion,
        frequentlyIncompleteTasks,
        status: plan.status,
        disclaimer:
          "This report reflects your adherence to the planned tasks only. It is not a medical result or diagnosis.",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to generate report" });
  }
});

/* ------------------------------------------------------------------ */
/* 14. PREVIOUS PLANS                                                   */
/* ------------------------------------------------------------------ */

// GET /api/diet/previous
router.get("/previous", async (req, res) => {
  try {
    const plans = await DietPlan.find({ user: getUserId(req) }).sort({
      createdAt: -1,
    });

    const results = await Promise.all(
      plans.map(async (plan) => {
        const progressRecords = await DailyProgress.find({ plan: plan._id });
        const totalAssigned = progressRecords.reduce((s, p) => s + p.totalTaskCount, 0);
        const totalCompleted = progressRecords.reduce((s, p) => s + p.completedTaskCount, 0);
        const completionPercentage =
          totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;

        return {
          planId: plan._id,
          goal: plan.goal,
          dietType: plan.dietType,
          durationType: plan.durationType,
          startDate: plan.startDate,
          endDate: plan.endDate,
          totalDays: plan.totalDays,
          status: plan.status,
          completionPercentage,
        };
      })
    );

    res.json({ success: true, plans: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to load previous plans" });
  }
});

// PUT /api/diet/plan/:planId/cancel
router.put("/plan/:planId/cancel", async (req, res) => {
  try {
    const plan = await getOwnedPlan(req, res);
    if (!plan) return;

    plan.status = "Cancelled";
    await plan.save();

    res.json({ success: true, plan });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to cancel plan" });
  }
});

module.exports = router;
