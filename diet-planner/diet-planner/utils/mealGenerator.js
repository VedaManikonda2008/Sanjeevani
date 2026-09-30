// utils/mealGenerator.js
//
// Sanjeevani personalized Indian/Ayurvedic-inspired meal planner.
//
// IMPORTANT:
// - Deterministic: same profile + goal + diet type + date + number of days
//   produces the same plan every time.
// - This keeps Preview and Start perfectly synchronized.
// - General wellness project only. This generator does not diagnose,
//   prescribe treatment, or calculate medical diets.
//
// Personalization considers:
//   • Goal
//   • Diet type
//   • Allergies
//   • Food restrictions
//   • Disliked foods
//   • Food preferences
//   • Cuisine preference
//   • Cooking-time preference
//   • Weight for general hydration/protein tracking
//   • Meal variety across days

/* ================================================================== */
/* FOOD DATABASE                                                       */
/* ================================================================== */

const FOOD_POOL = {
  breakfast: [
    {
      name: "Vegetable Poha",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "North Indian", "South Indian"],
      tags: ["light", "balanced", "traditional", "quick"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Moong Dal Chilla with Mint Chutney",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "balanced", "traditional"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Masala Oats with Vegetables",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian"],
      tags: ["fiber", "balanced", "quick"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Besan Chilla with Curd",
      type: "veg",
      allergens: ["dairy"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Idli with Sambar",
      type: "veg",
      allergens: [],
      cuisines: ["South Indian", "Indian"],
      tags: ["traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Vegetable Upma",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["South Indian", "Indian"],
      tags: ["balanced", "traditional"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Paneer Bhurji with Multigrain Toast",
      type: "veg",
      allergens: ["dairy", "gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "energy", "balanced"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Ragi Dosa with Coconut Chutney",
      type: "veg",
      allergens: [],
      cuisines: ["South Indian", "Indian"],
      tags: ["traditional", "fiber", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Vegetable Daliya",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["fiber", "balanced", "comfort"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Sprouts and Peanut Chaat",
      type: "veg",
      allergens: ["nuts"],
      cuisines: ["Indian"],
      tags: ["protein", "fiber", "fresh"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Egg Bhurji with Multigrain Toast",
      type: "non-veg",
      allergens: ["egg", "gluten"],
      cuisines: ["Indian"],
      tags: ["protein", "energy"],
      prep: "quick",
      goals: ["gain", "maintain"],
    },
    {
      name: "Boiled Eggs with Sprouts Salad",
      type: "non-veg",
      allergens: ["egg"],
      cuisines: ["Indian"],
      tags: ["protein", "fresh", "fiber"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Chicken Sausage with Vegetable Saute",
      type: "non-veg",
      allergens: [],
      cuisines: ["Indian", "Continental"],
      tags: ["protein"],
      prep: "quick",
      goals: ["gain", "maintain"],
    },
  ],

  midMorningSnack: [
    {
      name: "Buttermilk (Chaas)",
      type: "veg",
      allergens: ["dairy"],
      cuisines: ["Indian", "South Indian"],
      tags: ["hydrating", "traditional", "light"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Seasonal Fruit Bowl",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["fresh", "fiber", "light"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Soaked Almonds and Walnuts",
      type: "veg",
      allergens: ["nuts"],
      cuisines: ["Indian"],
      tags: ["protein", "energy", "traditional"],
      prep: "quick",
      goals: ["gain", "maintain"],
    },
    {
      name: "Coconut Water",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "South Indian"],
      tags: ["hydrating", "light"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Roasted Chana",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["protein", "fiber", "traditional"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Herbal Tulsi Tea with Roasted Makhana",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["traditional", "light"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Cucumber and Carrot Sticks",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["fresh", "light", "fiber"],
      prep: "quick",
      goals: ["lose", "maintain"],
    },
    {
      name: "Sprouted Moong Salad",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["protein", "fiber", "fresh"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
  ],

  lunch: [
    {
      name: "Dal Tadka, Brown Rice, Mixed Vegetable Sabzi and Salad",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "fiber", "balanced", "traditional"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Rajma Curry with Steamed Rice and Salad",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "fiber", "balanced"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Paneer Curry with Roti and Sabzi",
      type: "veg",
      allergens: ["dairy", "gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "energy", "traditional"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Chole with Roti and Onion Salad",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "fiber", "traditional"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Kadhi Chawal with Vegetable Sabzi",
      type: "veg",
      allergens: ["dairy"],
      cuisines: ["Indian", "North Indian"],
      tags: ["traditional", "balanced", "comfort"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Mixed Dal Khichdi with Curd",
      type: "veg",
      allergens: ["dairy"],
      cuisines: ["Indian"],
      tags: ["protein", "comfort", "traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Vegetable Pulao with Raita",
      type: "veg",
      allergens: ["dairy"],
      cuisines: ["Indian"],
      tags: ["balanced", "traditional"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Grilled Chicken with Brown Rice and Salad",
      type: "non-veg",
      allergens: [],
      cuisines: ["Indian", "Continental"],
      tags: ["protein", "balanced", "fresh"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Fish Curry with Steamed Rice",
      type: "non-veg",
      allergens: ["fish"],
      cuisines: ["Indian", "South Indian"],
      tags: ["protein", "traditional"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Egg Curry with Roti",
      type: "non-veg",
      allergens: ["egg", "gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "traditional"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Chicken Curry with Roti and Salad",
      type: "non-veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "traditional"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
  ],

  eveningSnack: [
    {
      name: "Roasted Makhana",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["light", "quick"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Sprouts Salad with Lemon",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["protein", "fiber", "fresh"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Green Tea with Roasted Chana",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["protein", "light", "quick"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Fruit Chaat",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["fresh", "fiber", "light"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Vegetable Clear Soup",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "Continental"],
      tags: ["light", "fresh"],
      prep: "medium",
      goals: ["lose", "maintain"],
    },
    {
      name: "Boiled Corn Chaat",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["fiber", "traditional"],
      prep: "quick",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Whole Wheat Vegetable Sandwich",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "Continental"],
      tags: ["balanced", "quick"],
      prep: "quick",
      goals: ["gain", "maintain"],
    },
  ],

  dinner: [
    {
      name: "Moong Dal Khichdi with Vegetables",
      type: "veg",
      allergens: [],
      cuisines: ["Indian"],
      tags: ["protein", "comfort", "traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Vegetable Soup with Multigrain Toast",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "Continental"],
      tags: ["light", "fiber"],
      prep: "medium",
      goals: ["lose", "maintain"],
    },
    {
      name: "Palak Paneer with Roti",
      type: "veg",
      allergens: ["dairy", "gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Mixed Vegetable Curry with Roti",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["fiber", "traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Lentil Soup with Salad",
      type: "veg",
      allergens: [],
      cuisines: ["Indian", "Continental"],
      tags: ["protein", "fiber", "light"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Vegetable Daliya",
      type: "veg",
      allergens: ["gluten"],
      cuisines: ["Indian", "North Indian"],
      tags: ["fiber", "comfort", "balanced"],
      prep: "medium",
      goals: ["gain", "lose", "maintain"],
    },
    {
      name: "Grilled Fish with Sauteed Vegetables",
      type: "non-veg",
      allergens: ["fish"],
      cuisines: ["Indian", "Continental"],
      tags: ["protein", "fresh"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Chicken Stew with Steamed Vegetables",
      type: "non-veg",
      allergens: [],
      cuisines: ["Indian", "Continental"],
      tags: ["protein", "balanced"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
    {
      name: "Egg Curry with Steamed Rice",
      type: "non-veg",
      allergens: ["egg"],
      cuisines: ["Indian", "North Indian"],
      tags: ["protein", "traditional", "balanced"],
      prep: "medium",
      goals: ["gain", "maintain"],
    },
  ],
};

/* ================================================================== */
/* EXERCISE DATABASE                                                   */
/* ================================================================== */

const EXERCISE_POOL = {
  "Gain Weight": [
    "Light strength and mobility routine",
    "Bodyweight resistance exercises + gentle walk",
    "Yoga and full-body stretching",
    "Light strength exercises for upper body",
    "Light strength exercises for lower body",
    "Gentle walk and mobility routine",
    "Full-body strength and stretching",
  ],

  "Lose Weight": [
    "Brisk walking + gentle stretching",
    "Light cardio + bodyweight movement",
    "Yoga and mobility routine",
    "Cycling or swimming at a comfortable pace",
    "Beginner-friendly cardio and stretching",
    "Brisk walk in fresh air",
    "Active recovery with gentle yoga",
  ],

  "Maintain Healthy Lifestyle": [
    "30 min walk in fresh air",
    "Yoga and breathing exercises",
    "Light bodyweight exercises",
    "Cycling at an easy pace",
    "Stretching and mobility routine",
    "Walk + short relaxation session",
    "Active rest with gentle stretching",
  ],
};

/* ================================================================== */
/* NORMALIZATION / MATCHING                                            */
/* ================================================================== */

function normalize(value) {
  return (value || "")
    .toString()
    .trim()
    .toLowerCase();
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map(normalize);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map(normalize)
      .filter(Boolean);
  }

  return [];
}

/*
 * Common words users may enter in the form.
 * Example:
 * "milk" -> dairy
 * "peanuts" -> nuts
 * "wheat" -> gluten
 */
const TERM_GROUPS = {
  dairy: [
    "dairy",
    "milk",
    "curd",
    "yogurt",
    "yoghurt",
    "paneer",
    "cheese",
    "buttermilk",
    "ghee",
  ],

  nuts: [
    "nut",
    "nuts",
    "peanut",
    "peanuts",
    "almond",
    "almonds",
    "walnut",
    "walnuts",
    "cashew",
    "cashews",
  ],

  gluten: [
    "gluten",
    "wheat",
    "maida",
    "bread",
    "roti",
    "atta",
  ],

  egg: ["egg", "eggs"],
  fish: ["fish"],
};

function belongsToTermGroup(term, group) {
  const normalized = normalize(term);
  return TERM_GROUPS[group].some(
    (word) =>
      normalized === word ||
      normalized.includes(word) ||
      word.includes(normalized)
  );
}

function itemConflicts(item, avoidTerms) {
  const name = normalize(item.name);
  const allergens = (item.allergens || []).map(normalize);

  return avoidTerms.some((term) => {
    if (!term) return false;

    // Direct food-name match
    if (name.includes(term)) return true;

    // Direct allergen match
    if (allergens.includes(term)) return true;

    // Group matching
    return Object.keys(TERM_GROUPS).some((group) => {
      if (!belongsToTermGroup(term, group)) return false;

      return (
        allergens.includes(group) ||
        TERM_GROUPS[group].some((word) => name.includes(word))
      );
    });
  });
}

/* ================================================================== */
/* FILTERING                                                           */
/* ================================================================== */

function filterPool(category, dietType, avoidTerms) {
  let pool = [...(FOOD_POOL[category] || [])];

  // Vegetarian = vegetarian food only.
  if (dietType === "Vegetarian") {
    pool = pool.filter((item) => item.type === "veg");
  }

  // Non-Vegetarian = vegetarian + non-vegetarian.
  // Both = vegetarian + non-vegetarian.
  //
  // This matches the existing Sanjeevani behaviour.

  pool = pool.filter((item) => !itemConflicts(item, avoidTerms));

  // If the user's restrictions remove everything,
  // use safe vegetarian fallback items rather than crashing.
  if (pool.length === 0) {
    pool = (FOOD_POOL[category] || []).filter(
      (item) =>
        item.type === "veg" &&
        (!item.allergens || item.allergens.length === 0)
    );
  }

  if (pool.length === 0) {
    pool = [
      {
        name: "Seasonal vegetarian wellness meal",
        type: "veg",
        allergens: [],
        cuisines: ["Indian"],
        tags: ["balanced"],
        prep: "medium",
        goals: ["gain", "lose", "maintain"],
      },
    ];
  }

  return pool;
}

/* ================================================================== */
/* PERSONALIZATION                                                     */
/* ================================================================== */

function normalizeGoal(goal) {
  if (goal === "Gain Weight") return "gain";
  if (goal === "Lose Weight") return "lose";
  return "maintain";
}

function preferenceMatches(item, preferences) {
  if (!preferences.length) return 0;

  let score = 0;

  preferences.forEach((preference) => {
    const p = normalize(preference);

    if (item.name.toLowerCase().includes(p)) {
      score += 5;
    }

    if ((item.tags || []).some((tag) => tag.includes(p) || p.includes(tag))) {
      score += 3;
    }

    if (
      (item.cuisines || []).some(
        (cuisine) =>
          normalize(cuisine).includes(p) ||
          p.includes(normalize(cuisine))
      )
    ) {
      score += 2;
    }
  });

  return score;
}

function cuisineScore(item, cuisine) {
  const preferredCuisine = normalize(cuisine);

  if (!preferredCuisine || preferredCuisine === "any") {
    return 0;
  }

  return (item.cuisines || []).some(
    (itemCuisine) =>
      normalize(itemCuisine) === preferredCuisine ||
      normalize(itemCuisine).includes(preferredCuisine) ||
      preferredCuisine.includes(normalize(itemCuisine))
  )
    ? 5
    : -2;
}

function cookingTimeScore(item, cookingTime) {
  const time = normalize(cookingTime);

  if (!time || time === "any") return 0;

  if (
    time.includes("quick") ||
    time.includes("15") ||
    time.includes("20")
  ) {
    return item.prep === "quick" ? 4 : -2;
  }

  if (
    time.includes("medium") ||
    time.includes("30") ||
    time.includes("45")
  ) {
    return item.prep === "medium" ? 4 : 0;
  }

  if (
    time.includes("long") ||
    time.includes("60") ||
    time.includes("more")
  ) {
    return item.prep === "long" ? 4 : 0;
  }

  return 0;
}

function goalScore(item, goal) {
  const normalizedGoal = normalizeGoal(goal);

  if ((item.goals || []).includes(normalizedGoal)) {
    return 4;
  }

  return -1;
}

function calculateMealScore(item, context) {
  let score = 0;

  score += goalScore(item, context.goal);
  score += cuisineScore(item, context.cuisine);
  score += cookingTimeScore(item, context.cookingTime);
  score += preferenceMatches(item, context.preferences);

  // Variety:
  // Strongly discourage meals recently used in this plan.
  if (context.recentMeals.includes(item.name)) {
    score -= 7;
  }

  // Avoid using the same meal on consecutive days.
  if (context.lastMeal === item.name) {
    score -= 10;
  }

  //Slightly prefer foods that haven't appeared much yet.
  const usedCount = context.usedCounts[item.name] || 0;
  score -= usedCount * 2;

  return score;
}

/* ================================================================== */
/* DETERMINISTIC SELECTION                                             */
/* ================================================================== */

/*
 * We deliberately do NOT use Math.random().
 *
 * Instead, ties are resolved using a deterministic calculation based
 * on the day number and meal category.
 *
 * Therefore:
 *
 * Preview -> exact plan
 * Start   -> exact same plan
 */

function deterministicTieBreak(item, index, day, category) {
  const text = `${item.name}|${category}|${day}|${index}`;

  let hash = 0;

  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function chooseMeal(pool, context, day, category) {
  const ranked = pool
    .map((item, index) => ({
      item,
      score: calculateMealScore(item, context),
      tie: deterministicTieBreak(item, index, day, category),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.tie - b.tie;
    });

  const selected = ranked[0].item;

  context.usedCounts[selected.name] =
    (context.usedCounts[selected.name] || 0) + 1;

  context.recentMeals.push(selected.name);

  // Keep only the last few meals for variety checking.
  if (context.recentMeals.length > 8) {
    context.recentMeals.shift();
  }

  context.lastMeal = selected.name;

  return selected.name;
}

/* ================================================================== */
/* GENERAL WELLNESS TRACKING TARGETS                                   */
/* ================================================================== */

function calculateProteinGoal(goal, weightKg) {
  const weight = Number(weightKg);

  if (!Number.isFinite(weight) || weight <= 0) {
    return 50;
  }

  /*
   * This is intentionally a simple general-wellness tracking target,
   * not a medical or therapeutic prescription.
   *
   * We keep the range moderate and avoid the old aggressive
   * goal-based multipliers.
   */
  let target;

  if (goal === "Gain Weight") {
    target = weight * 1.0;
  } else if (goal === "Lose Weight") {
    target = weight * 0.9;
  } else {
    target = weight * 0.9;
  }

  return Math.max(40, Math.min(75, Math.round(target)));
}

function calculateWaterGoal(weightKg) {
  const weight = Number(weightKg);

  if (!Number.isFinite(weight) || weight <= 0) {
    return 2.0;
  }

  /*
   * General hydration reminder only.
   * It is not intended as a medical hydration prescription.
   */
  const liters = weight * 0.033;

  return Math.max(1.5, Math.min(3.0, Math.round(liters * 10) / 10));
}

/* ================================================================== */
/* EXERCISE SELECTION                                                  */
/* ================================================================== */

function chooseExercise(goal, day) {
  const pool =
    EXERCISE_POOL[goal] ||
    EXERCISE_POOL["Maintain Healthy Lifestyle"];

  const index = deterministicTieBreak(
    { name: `${goal}-${day}` },
    day,
    day,
    "exercise"
  ) % pool.length;

  return pool[index];
}

/* ================================================================== */
/* MAIN GENERATOR                                                      */
/* ================================================================== */

/**
 * Generate personalized daily meal plans.
 *
 * @param {Object} profile
 * @param {String} goal
 * @param {String} dietType
 * @param {Date|String} startDate
 * @param {Number} totalDays
 *
 * @returns {Array}
 */
function generateDailyMealPlans(
  profile,
  goal,
  dietType,
  startDate,
  totalDays
) {
  profile = profile || {};

  const avoidTerms = [
    ...toArray(profile.allergies),
    ...toArray(profile.restrictions),
    ...toArray(profile.dislikedFoods),
  ];

  const preferences = toArray(profile.preferences);

  const pools = {
    breakfast: filterPool("breakfast", dietType, avoidTerms),
    midMorningSnack: filterPool(
      "midMorningSnack",
      dietType,
      avoidTerms
    ),
    lunch: filterPool("lunch", dietType, avoidTerms),
    eveningSnack: filterPool(
      "eveningSnack",
      dietType,
      avoidTerms
    ),
    dinner: filterPool("dinner", dietType, avoidTerms),
  };

  const context = {
    goal,
    cuisine: profile.cuisine || "Any",
    cookingTime: profile.cookingTime || "Any",
    preferences,
    recentMeals: [],
    usedCounts: {},
    lastMeal: null,
  };

  const proteinGoal = calculateProteinGoal(goal, profile.weight);
  const waterGoal = calculateWaterGoal(profile.weight);

  const plans = [];

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const days = Math.max(0, Number(totalDays) || 0);

  for (let day = 1; day <= days; day++) {
    const date = new Date(start);

    date.setDate(date.getDate() + day - 1);

    /*
     * Reset the "last meal" between meal categories.
     *
     * We want to prevent repetition of the same breakfast,
     * but a breakfast item shouldn't affect dinner scoring.
     */
    const mealContext = {
      ...context,
      recentMeals: [...context.recentMeals],
      lastMeal: null,
    };

    const breakfast = chooseMeal(
      pools.breakfast,
      mealContext,
      day,
      "breakfast"
    );

    const midMorningSnack = chooseMeal(
      pools.midMorningSnack,
      mealContext,
      day,
      "midMorningSnack"
    );

    const lunch = chooseMeal(
      pools.lunch,
      mealContext,
      day,
      "lunch"
    );

    const eveningSnack = chooseMeal(
      pools.eveningSnack,
      mealContext,
      day,
      "eveningSnack"
    );

    const dinner = chooseMeal(
      pools.dinner,
      mealContext,
      day,
      "dinner"
    );

    /*
     * Copy the updated variety state back into the main context.
     */
    context.recentMeals = mealContext.recentMeals;
    context.usedCounts = mealContext.usedCounts;

    plans.push({
      day,
      date,

      meals: {
        breakfast,
        midMorningSnack,
        lunch,
        eveningSnack,
        dinner,
      },

      waterGoalLiters: waterGoal,
      proteinGoalGrams: proteinGoal,
      exercise: chooseExercise(goal, day),
    });
  }

  return plans;
}

/* ================================================================== */
/* DAILY TRACKING TASKS                                                 */
/* ================================================================== */

/**
 * Build the checklist for one day.
 *
 * IMPORTANT:
 * This function accepts the daily meal-plan object directly.
 * Your existing dietPlanner route already passes dmp into it.
 */
function buildTasksForDay(dailyMealPlan) {
  return [
    {
      name: "Breakfast",
      plannedActivity: dailyMealPlan.meals.breakfast,
      completed: false,
      completedAt: null,
    },

    {
      name: "Mid-morning Snack",
      plannedActivity: dailyMealPlan.meals.midMorningSnack,
      completed: false,
      completedAt: null,
    },

    {
      name: "Lunch",
      plannedActivity: dailyMealPlan.meals.lunch,
      completed: false,
      completedAt: null,
    },

    {
      name: "Evening Snack",
      plannedActivity: dailyMealPlan.meals.eveningSnack,
      completed: false,
      completedAt: null,
    },

    {
      name: "Dinner",
      plannedActivity: dailyMealPlan.meals.dinner,
      completed: false,
      completedAt: null,
    },

    {
      name: "Water",
      plannedActivity: `Drink ${dailyMealPlan.waterGoalLiters} L water`,
      completed: false,
      completedAt: null,
    },

    {
      name: "Protein",
      plannedActivity: `Reach ${dailyMealPlan.proteinGoalGrams} g protein`,
      completed: false,
      completedAt: null,
    },

    {
      name: "Exercise",
      plannedActivity: dailyMealPlan.exercise,
      completed: false,
      completedAt: null,
    },
  ];
}

/* ================================================================== */
/* EXPORTS                                                             */
/* ================================================================== */

module.exports = {
  generateDailyMealPlans,
  buildTasksForDay,
  calculateProteinGoal,
  calculateWaterGoal,
};