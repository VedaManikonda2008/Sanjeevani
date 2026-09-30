# Sanjeevani Diet Planner Module

A self-contained module you drop into your existing Sanjeevani project.
Stack: **HTML + CSS + vanilla JS (frontend)**, **Node/Express + Mongoose +
MongoDB Atlas (backend)** — no React, no changes to your existing Home
Page or Ayurvedic Store.

## Files

```
models/
  DietProfile.js      -> user's saved personal details (name, age, allergies...)
  DietPlan.js          -> a generated plan (goal, diet type, duration, daily meals)
  DailyProgress.js     -> per-day checkbox state (one doc per plan+day)
utils/
  dateUtils.js          -> weekly=7 days / monthly=actual days-in-month logic
  mealGenerator.js       -> Indian/Ayurvedic meal pools + allergy/dislike filtering
routes/
  dietPlanner.js         -> all /api/diet/* endpoints
public/
  diet-planner.html      -> the wizard + tracker page
  css/diet-planner.css
  js/diet-planner.js
```

## 1. Copy files into your project

- Copy `models/*.js` into your existing `models/` folder.
- Copy `utils/*.js` into your existing `utils/` folder (create one if you
  don't have it).
- Copy `routes/dietPlanner.js` into your existing `routes/` folder.
- Copy everything under `public/` into your existing `public/` folder
  (or wherever your static frontend files live — adjust paths if your
  structure differs).

## 2. Mount the routes in your server.js / app.js

```js
const dietPlannerRoutes = require("./routes/dietPlanner");

// `protect` = your EXISTING auth middleware that verifies the logged-in
// user and sets req.user. Do not build a new login system.
app.use("/api/diet", protect, dietPlannerRoutes);
```

If your auth middleware sets `req.user._id` instead of `req.user.id`,
that's already handled — `getUserId(req)` in `dietPlanner.js` checks
both.

## 3. Link the Diet Planner from your Sanjeevani Home page

Wherever your Home page has the "Diet Planner" option/button:

```html
<a href="/diet-planner.html">Diet Planner</a>
```

Since the user is already logged in when they reach Home, no extra
login step happens — the page simply calls the `/api/diet/*` APIs with
the existing auth token.

## 4. Wire up auth on the frontend

Open `public/js/diet-planner.js` and check the `authHeaders()` function
near the top. It currently reads a token from
`localStorage.getItem("sanjeevani_token")`. Change that key (or switch
to cookie-based auth, i.e. just remove the Authorization header if your
app uses `credentials: "include"` cookies) to match however your
existing site already authenticates API calls.

## 5. MongoDB Atlas

No new setup needed beyond your existing Mongoose connection — these
models register three new collections on your existing database:
`dietprofiles`, `dietplans`, `dailyprogresses`. Every query is scoped to
`req.user.id`, so one user can never see another user's plans or
progress.

## How each requirement is covered

| Requirement | Where |
|---|---|
| Personal details saved per user | `DietProfile` model + `POST/GET /api/diet/profile` |
| Goal / Diet type / Duration selection | Wizard steps in `diet-planner.html` + `/generate` |
| Weekly = exactly 7 days | `dateUtils.calculatePlanDuration` |
| Monthly = actual days in month (28/29/30/31) | `dateUtils.daysInMonth` |
| Plan respects diet type & avoids allergies/dislikes | `mealGenerator.filterPool` / `isExcluded` |
| Plan Preview with Edit / Start buttons | `panel-preview` in HTML + `editPrefsBtn` / `startPlanBtn` |
| Starting a plan saves it + creates daily records + marks Active | `POST /api/diet/start` |
| Daily tracker, manual checkboxes only, nothing auto-completes | `DailyProgress` schema + `PUT /api/diet/progress/:planId/:day` (only flips on explicit request) |
| Every checkbox change persisted to MongoDB, survives refresh/logout | Same endpoint — always awaits `progress.save()` before responding |
| Daily progress % from real data | `completedTaskCount / totalTaskCount * 100`, computed server-side, never faked |
| Prev/Next day + date navigation | `dayDateSelector`, `prevDayBtn`, `nextDayBtn` in JS |
| Weekly/Monthly overview with Completed/Partial/Incomplete/Future | `GET /api/diet/overview/:planId` |
| Final completion report | `GET /api/diet/report/:planId` (adherence-only, includes the required disclaimer, no medical claims) |
| Previous plans list + reopen | `GET /api/diet/previous` + "Open" button |
| One user can't see another's data | Every route checks `plan.user.toString() === req.user.id` |

## Notes / things you may want to tweak for your BCA viva

- The meal pools in `mealGenerator.js` are intentionally editable arrays
  — you can add more Indian dishes easily, or swap in a bigger dataset.
- The plan generation is **deterministic**: given the same profile +
  goal + diet type + start date, `/generate` (preview) and `/start`
  (save) always produce the identical plan. That's why there's no
  server-side "draft" storage between preview and start — it simply
  regenerates the same result and persists it.
- Protein/water goals use simple, commonly-cited formulas
  (protein ≈ bodyweight × 1.0–1.6 g/kg depending on goal; water ≈
  bodyweight × 33 ml/kg) — clearly labelled as general wellness
  guidance, not medical advice, matching your "no medical claims"
  requirement.
