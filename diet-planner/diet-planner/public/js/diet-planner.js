/* diet-planner.js
 * Vanilla JS controller for the Diet Planner module.
 * Assumes the user is already logged in via the existing Sanjeevani auth
 * system, and that a JWT (or session cookie) is available for API calls.
 * Adjust `authHeaders()` below to match however your existing app sends
 * credentials (Authorization header, cookie, etc).
 */

const API_BASE = "/api/diet";

// ---- Wizard state (kept in memory only until "Start This Plan") -------
const state = {
  goal: null,
  dietType: null,
  durationType: null,
  startDate: null,
  preview: null,   // full preview object returned by /generate
  planId: null,    // set once plan is started
  totalDays: null,
  currentDay: 1,
};

/* ------------------------------------------------------------------ */
/* AUTH HELPER — wire this up to however your app already stores the   */
/* logged-in user's token (localStorage, cookie, etc).                 */
/* ------------------------------------------------------------------ */
function authHeaders() {
  const token = localStorage.getItem("sanjeevani_token"); // adjust key name if different
  const profile = JSON.parse(localStorage.getItem("sanjeevaniProfile") || "null");
  const userKey = profile?.email || profile?.fullName || "local-user";
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "x-sanjeevani-user": userKey }
    : { "Content-Type": "application/json", "x-sanjeevani-user": userKey };
}

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await res.json()
    : { message: `Diet service returned an unexpected response (${res.status}).` };
  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Something went wrong.");
  }
  return data;
}

/* ------------------------------------------------------------------ */
/* STEP NAVIGATION                                                      */
/* ------------------------------------------------------------------ */
function showPanel(stepName) {
  document.querySelectorAll(".dp-panel").forEach((p) => p.classList.add("dp-hidden"));
  document.getElementById(`panel-${stepName}`).classList.remove("dp-hidden");

  document.querySelectorAll(".dp-step").forEach((s) => {
    s.classList.toggle("active", s.dataset.step === stepName);
  });
}

document.querySelectorAll(".dp-back").forEach((btn) => {
  btn.addEventListener("click", () => showPanel(btn.dataset.back));
});

/* ------------------------------------------------------------------ */
/* STEP 1: PERSONAL DETAILS                                             */
/* ------------------------------------------------------------------ */
function splitCsv(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadExistingProfile() {
  try {
    const { profile } = await api("/profile");
    if (!profile) return;
    const form = document.getElementById("detailsForm");
    form.name.value = profile.name || "";
    form.age.value = profile.age || "";
    form.height.value = profile.height || "";
    form.weight.value = profile.weight || "";
    form.cuisine.value = profile.cuisine || "";
    form.cookingTime.value = profile.cookingTime || "Any";
    form.allergies.value = (profile.allergies || []).join(", ");
    form.restrictions.value = (profile.restrictions || []).join(", ");
    form.dislikedFoods.value = (profile.dislikedFoods || []).join(", ");
    form.preferences.value = (profile.preferences || []).join(", ");
  } catch (err) {
    // no existing profile yet — that's fine, form stays blank
  }
}

document.getElementById("detailsForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const body = {
    name: form.name.value.trim(),
    age: Number(form.age.value),
    height: Number(form.height.value),
    weight: Number(form.weight.value),
    cuisine: form.cuisine.value.trim() || "Any",
    cookingTime: form.cookingTime.value,
    allergies: splitCsv(form.allergies.value),
    restrictions: splitCsv(form.restrictions.value),
    dislikedFoods: splitCsv(form.dislikedFoods.value),
    preferences: splitCsv(form.preferences.value),
  };

  try {
    await api("/profile", { method: "POST", body: JSON.stringify(body) });
    showPanel("goal");
  } catch (err) {
    alert(err.message);
  }
});

/* ------------------------------------------------------------------ */
/* STEP 2 & 3: GOAL / DIET TYPE (selectable option cards)                */
/* ------------------------------------------------------------------ */
function wireOptionCards(containerId, stateKey, nextPanel) {
  const container = document.getElementById(containerId);
  container.querySelectorAll(".dp-option-card").forEach((card) => {
    card.addEventListener("click", () => {
      container.querySelectorAll(".dp-option-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      state[stateKey] = card.dataset.value;
      setTimeout(() => showPanel(nextPanel), 150);
    });
  });
}
wireOptionCards("goalCards", "goal", "dietType");
wireOptionCards("dietTypeCards", "dietType", "duration");

/* ------------------------------------------------------------------ */
/* STEP 4: DURATION + GENERATE                                          */
/* ------------------------------------------------------------------ */
document.getElementById("durationCards").querySelectorAll(".dp-option-card").forEach((card) => {
  card.addEventListener("click", () => {
    document
      .getElementById("durationCards")
      .querySelectorAll(".dp-option-card")
      .forEach((c) => c.classList.remove("selected"));
    card.classList.add("selected");
    state.durationType = card.dataset.value;
  });
});

// default start date = today
document.getElementById("startDateInput").valueAsDate = new Date();

document.getElementById("generateBtn").addEventListener("click", async () => {
  if (!state.goal) return alert("Please go back and select a goal.");
  if (!state.dietType) return alert("Please go back and select a diet type.");
  if (!state.durationType) return alert("Please select Weekly or Monthly.");

  const startDate = document.getElementById("startDateInput").value;
  if (!startDate) return alert("Please choose a start date.");
  state.startDate = startDate;

  try {
    const { preview } = await api("/generate", {
      method: "POST",
      body: JSON.stringify({
        goal: state.goal,
        dietType: state.dietType,
        durationType: state.durationType,
        startDate: state.startDate,
      }),
    });
    state.preview = preview;
    renderPreview(preview);
    showPanel("preview");
  } catch (err) {
    alert(err.message);
  }
});

/* ------------------------------------------------------------------ */
/* STEP 5: PREVIEW                                                      */
/* ------------------------------------------------------------------ */
function fmtDate(d) {
  return new Date(d).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}


   
      function renderPreview(preview) {

  const summaryEl = document.getElementById("previewSummary");

  const restrictions = [
    ...(preview.personalDetailsSnapshot.allergies || []),
    ...(preview.personalDetailsSnapshot.restrictions || []),
  ];


  /* --------------------------------------------------------------
     PLAN SUMMARY
  -------------------------------------------------------------- */

  summaryEl.innerHTML = `

    <div class="preview-stat">
      <span class="preview-stat-icon">🎯</span>
      <div>
        <small>Goal</small>
        <strong>${preview.goal}</strong>
      </div>
    </div>

    <div class="preview-stat">
      <span class="preview-stat-icon">🥗</span>
      <div>
        <small>Diet Type</small>
        <strong>${preview.dietType}</strong>
      </div>
    </div>

    <div class="preview-stat">
      <span class="preview-stat-icon">📅</span>
      <div>
        <small>Duration</small>
        <strong>
          ${
            preview.durationType === "weekly"
              ? "7 Days"
              : `${preview.totalDays} Days`
          }
        </strong>
      </div>
    </div>

    <div class="preview-stat">
      <span class="preview-stat-icon">🌱</span>
      <div>
        <small>Start Date</small>
        <strong>${fmtDate(preview.startDate)}</strong>
      </div>
    </div>

    <div class="preview-stat">
      <span class="preview-stat-icon">💧</span>
      <div>
        <small>Daily Water</small>
        <strong>${preview.dailyMealPlans[0].waterGoalLiters} L</strong>
      </div>
    </div>

    <div class="preview-stat">
      <span class="preview-stat-icon">💪</span>
      <div>
        <small>Daily Protein</small>
        <strong>${preview.dailyMealPlans[0].proteinGoalGrams} g</strong>
      </div>
    </div>

    ${
      restrictions.length
        ? `
          <div class="preview-stat preview-stat-wide">
            <span class="preview-stat-icon">🌿</span>
            <div>
              <small>Food Restrictions</small>
              <strong>${restrictions.join(", ")}</strong>
            </div>
          </div>
        `
        : ""
    }

  `;


  /* --------------------------------------------------------------
     CREATE WEEK GROUPS
  -------------------------------------------------------------- */

  const plans = preview.dailyMealPlans || [];

  const weeks = [];

  for (let i = 0; i < plans.length; i += 7) {
    weeks.push(plans.slice(i, i + 7));
  }


  const weekTabs = document.getElementById("previewWeekTabs");
  const daysEl = document.getElementById("previewDays");


  /* --------------------------------------------------------------
     WEEK TABS
  -------------------------------------------------------------- */

  weekTabs.innerHTML = weeks
    .map((week, index) => {

      const firstDay = week[0];
      const lastDay = week[week.length - 1];

      return `
        <button
          type="button"
          class="preview-week-tab ${index === 0 ? "active" : ""}"
          data-week="${index}"
        >
          <span>Week ${index + 1}</span>
          <small>
            ${fmtDate(firstDay.date)} – ${fmtDate(lastDay.date)}
          </small>
        </button>
      `;

    })
    .join("");


  /* --------------------------------------------------------------
     SHOW ONE WEEK
  -------------------------------------------------------------- */

  function renderWeek(weekIndex) {

    const week = weeks[weekIndex];

    if (!week) return;


    daysEl.innerHTML = `

      <div class="preview-selected-week">

        <div class="selected-week-heading">

          <div>
            <span class="preview-small-label">
              WEEK ${weekIndex + 1}
            </span>

            <h4>
              ${fmtDate(week[0].date)}
              –
              ${fmtDate(week[week.length - 1].date)}
            </h4>
          </div>

          <span class="week-count">
            ${week.length} days
          </span>

        </div>


        <div class="compact-day-list">

          ${week
            .map(
              (d) => `

                <div class="compact-day-row">

                  <div class="compact-day-number">
                    ${d.day}
                  </div>

                  <div class="compact-day-info">

                    <strong>
                      Day ${d.day}
                    </strong>

                    <span>
                      ${fmtDate(d.date)}
                    </span>

                  </div>


                  <div class="compact-meals">

                    <div>
                      <span>Breakfast</span>
                      <strong>${d.meals.breakfast}</strong>
                    </div>

                    <div>
                      <span>Lunch</span>
                      <strong>${d.meals.lunch}</strong>
                    </div>

                    <div>
                      <span>Dinner</span>
                      <strong>${d.meals.dinner}</strong>
                    </div>

                  </div>


                  <div class="compact-exercise">

                    <span>Exercise</span>

                    <strong>
                      ${d.exercise}
                    </strong>

                  </div>

                </div>

              `
            )
            .join("")}

        </div>

      </div>

    `;
  }


  /* --------------------------------------------------------------
     WEEK TAB CLICK
  -------------------------------------------------------------- */

  weekTabs.querySelectorAll(".preview-week-tab").forEach((tab) => {

    tab.addEventListener("click", () => {

      weekTabs
        .querySelectorAll(".preview-week-tab")
        .forEach((button) => {
          button.classList.remove("active");
        });

      tab.classList.add("active");

      renderWeek(Number(tab.dataset.week));

    });

  });


  /* --------------------------------------------------------------
     FIRST WEEK BY DEFAULT
  -------------------------------------------------------------- */

  renderWeek(0);

}
document.getElementById("editPrefsBtn").addEventListener("click", () => {
  showPanel("duration");
});

document.getElementById("startPlanBtn").addEventListener("click", async () => {
  try {
    const { planId } = await api("/start", {
      method: "POST",
      body: JSON.stringify({
        goal: state.goal,
        dietType: state.dietType,
        durationType: state.durationType,
        startDate: state.startDate,
      }),
    });
    state.planId = planId;
    state.totalDays = state.preview.totalDays;
    state.currentDay = 1;
    showPanel("tracker");
    await loadDay(1);
    await loadOverview();
  } catch (err) {
    alert(err.message);
  }
});

/* ------------------------------------------------------------------ */
/* STEP 6: DAILY TRACKER                                                */
/* ------------------------------------------------------------------ */
async function loadDay(dayNumber) {
  if (dayNumber < 1 || dayNumber > state.totalDays) return;
  state.currentDay = dayNumber;

  try {
    const { progress } = await api(`/progress/${state.planId}/${dayNumber}`);
    renderDay(progress);
  } catch (err) {
    alert(err.message);
  }
}

function renderDay(progress) {

  /* =========================================================
     1. BASIC DAY INFORMATION
  ========================================================= */

  const dayNumber = progress.dayNumber || 1;
  const totalDays = state.totalDays || 1;

  const dayTitle = `Day ${dayNumber} of ${totalDays}`;

  const trackerDayTitle =
    document.getElementById("trackerDayTitle");

  if (trackerDayTitle) {
    trackerDayTitle.textContent = dayTitle;
  }

  const trackerCurrentDay =
    document.getElementById("trackerCurrentDay");

  if (trackerCurrentDay) {
    trackerCurrentDay.textContent = `Day ${dayNumber}`;
  }


  /* =========================================================
     2. DATE
  ========================================================= */

  const dateInput =
    document.getElementById("dayDateSelector");

  if (dateInput && progress.date) {

    const date = new Date(progress.date);

    if (!isNaN(date.getTime())) {

      const year = date.getFullYear();

      const month =
        String(date.getMonth() + 1).padStart(2, "0");

      const day =
        String(date.getDate()).padStart(2, "0");

      dateInput.value =
        `${year}-${month}-${day}`;
    }
  }


  /* =========================================================
     3. PROGRESS CALCULATION
  ========================================================= */

  const completed =
    Number(progress.completedTaskCount) || 0;

  const total =
    Number(progress.totalTaskCount) ||
    (progress.tasks ? progress.tasks.length : 0);

  const pct =
    Number(progress.completionPercentage) || 0;


  /* =========================================================
     4. MAIN PROGRESS BAR
  ========================================================= */

  const progressBar =
    document.getElementById("dayProgressBar");

  if (progressBar) {

    requestAnimationFrame(() => {

      progressBar.style.width =
        `${Math.max(0, Math.min(100, pct))}%`;

    });
  }


  /* =========================================================
     5. MAIN PROGRESS TEXT
  ========================================================= */

  const progressText =
    document.getElementById("dayProgressText");

  if (progressText) {

    progressText.textContent =
      `${completed} / ${total} tasks completed (${pct}%)`;

  }


  /* =========================================================
     6. CIRCULAR PROGRESS NUMBER
  ========================================================= */

  const progressNumber =
    document.getElementById("trackerProgressNumber");

  if (progressNumber) {

    progressNumber.textContent =
      `${pct}%`;

  }


  /* =========================================================
     7. COMPLETED COUNT
  ========================================================= */

  const completedCount =
    document.getElementById("trackerCompletedCount");

  if (completedCount) {

    completedCount.textContent =
      completed;

  }


  /* =========================================================
     8. REMAINING COUNT
  ========================================================= */

  const remainingCount =
    document.getElementById("trackerRemainingCount");

  if (remainingCount) {

    remainingCount.textContent =
      Math.max(total - completed, 0);

  }


  /* =========================================================
     9. WELLNESS SCORE
  ========================================================= */

  const wellnessScore =
    document.getElementById("trackerWellnessScore");

  if (wellnessScore) {

    wellnessScore.textContent =
      `${pct}%`;

  }


  /* =========================================================
     10. TASK COUNT
  ========================================================= */

  const taskCount =
    document.getElementById("trackerTaskCount");

  if (taskCount) {

    taskCount.textContent =
      `${total} ${total === 1 ? "task" : "tasks"}`;

  }


  /* =========================================================
     11. PERSONALIZED PROGRESS MESSAGE
  ========================================================= */

  const progressMessage =
    document.getElementById("trackerProgressMessage");

  if (progressMessage) {

    if (pct === 0) {

      progressMessage.textContent =
        "🌱 Your wellness check-in is ready. Start with one small step.";

    } else if (pct < 50) {

      progressMessage.textContent =
        "🌿 Good start. Keep going — you're building your routine.";

    } else if (pct < 100) {

      progressMessage.textContent =
        "✨ You're more than halfway there. Keep your momentum going.";

    } else {

      progressMessage.textContent =
        "🌟 Wonderful! Today's wellness check-in is complete.";

    }

  }


  /* =========================================================
     12. EXISTING TRACKER TABLE
     
     IMPORTANT:
     We are keeping your existing table ID:
     
     trackerTableBody
     
     so the rest of your tracker continues working.
  ========================================================= */

  const tbody =
    document.getElementById("trackerTableBody");

  if (!tbody) {
    console.warn(
      "Sanjeevani Tracker: trackerTableBody was not found."
    );

    return;
  }


  /* =========================================================
     13. CREATE TASK ROWS
  ========================================================= */

  tbody.innerHTML =
    (progress.tasks || [])
      .map((task) => {

        const completedClass =
          task.completed
            ? "dp-task-done"
            : "";

        const statusText =
          task.completed
            ? "Completed"
            : "Pending";

        const statusClass =
          task.completed
            ? "task-status-done"
            : "task-status-pending";


        return `
          <tr
            class="
              tracker-row
              ${task.completed ? "tracker-row-completed" : ""}
            "
          >

            <td>
              <strong class="tracker-task-name">
                ${task.name}
              </strong>
            </td>


            <td class="${completedClass}">
              ${task.plannedActivity}
            </td>


            <td>

              <div class="tracker-check-area">

                <span class="task-status ${statusClass}">
                  ${statusText}
                </span>

                <input
                  type="checkbox"
                  data-task="${task.name}"
                  ${task.completed ? "checked" : ""}
                  aria-label="Mark ${task.name} as completed"
                >

              </div>

            </td>

          </tr>
        `;

      })
      .join("");


  /* =========================================================
     14. CHECKBOX FUNCTIONALITY
     
     THIS PART PRESERVES YOUR EXISTING BACKEND CONNECTION.
  ========================================================= */

  tbody
    .querySelectorAll('input[type="checkbox"]')
    .forEach((checkbox) => {

      checkbox.addEventListener(
        "change",
        async (event) => {

          const taskName =
            event.target.dataset.task;

          const completed =
            event.target.checked;


          /* Prevent double-click requests */

          event.target.disabled = true;


          try {

            /*
             * Send the update to your existing backend.
             */

            const result =
              await api(
                `/progress/${state.planId}/${progress.dayNumber}`,
                {
                  method: "PUT",

                  body: JSON.stringify({
                    taskName,
                    completed
                  })
                }
              );


            /*
             * Use the updated progress returned
             * by the backend.
             */

            const updatedProgress =
              result.progress;


            /*
             * Re-render the tracker.
             *
             * This updates:
             * - progress bar
             * - percentage
             * - completed count
             * - remaining count
             * - wellness score
             * - task status
             */

            renderDay(updatedProgress);


            /*
             * Keep the overview section synchronized.
             */

            if (typeof loadOverview === "function") {

              await loadOverview();

            }

          } catch (error) {

            console.error(
              "Tracker update failed:",
              error
            );


            /*
             * Undo checkbox if saving failed.
             */

            event.target.checked =
              !completed;


            alert(
              error.message ||
              "Unable to update your progress. Please try again."
            );


          } finally {

            event.target.disabled =
              false;

          }

        }
      );

    });


  /* =========================================================
     15. DATE PICKER
  ========================================================= */

  if (dateInput && !dateInput.dataset.trackerBound) {

    dateInput.dataset.trackerBound = "true";

    dateInput.addEventListener(
      "change",
      async () => {

        if (!dateInput.value) {
          return;
        }


        const selectedDate =
          new Date(
            `${dateInput.value}T00:00:00`
          );


        if (isNaN(selectedDate.getTime())) {
          return;
        }


        /*
         * Calculate which plan day this date represents.
         */

        const firstDate =
          new Date(state.startDate);


        firstDate.setHours(
          0,
          0,
          0,
          0
        );


        const difference =
          selectedDate.getTime() -
          firstDate.getTime();


        const selectedDay =
          Math.floor(
            difference /
            (1000 * 60 * 60 * 24)
          ) + 1;


        /*
         * Only navigate if the selected date
         * belongs to the current plan.
         */

        if (
          selectedDay >= 1 &&
          selectedDay <= state.totalDays
        ) {

          await loadDay(selectedDay);

        } else {

          alert(
            `Please select a date within your ${state.totalDays}-day plan.`
          );


          /*
           * Restore current date.
           */

          if (progress.date) {

            const currentDate =
              new Date(progress.date);

            if (!isNaN(currentDate.getTime())) {

              const year =
                currentDate.getFullYear();

              const month =
                String(
                  currentDate.getMonth() + 1
                ).padStart(2, "0");

              const day =
                String(
                  currentDate.getDate()
                ).padStart(2, "0");

              dateInput.value =
                `${year}-${month}-${day}`;

            }
          }

        }

      }
    );

  }

}

document.getElementById("prevDayBtn").addEventListener("click", () => loadDay(state.currentDay - 1));
document.getElementById("nextDayBtn").addEventListener("click", () => loadDay(state.currentDay + 1));
document.getElementById("dayDateSelector").addEventListener("change", (e) => {
  if (!state.preview) return;
  const chosen = new Date(e.target.value);
  const start = new Date(state.startDate);
  const dayNumber =
    Math.round((chosen.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / 86400000) + 1;
  loadDay(dayNumber);
});

/* ------------------------------------------------------------------ */
/* TABS: OVERVIEW / REPORT / PREVIOUS PLANS                             */
/* ------------------------------------------------------------------ */
document.querySelectorAll(".dp-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".dp-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".dp-tab-panel").forEach((p) => p.classList.add("dp-hidden"));
    document.getElementById("tab" + capitalize(tab.dataset.tab)).classList.remove("dp-hidden");

    if (tab.dataset.tab === "previous") loadPreviousPlans();
  });
});
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

async function loadOverview() {
  try {
    const { weeks } = await api(`/overview/${state.planId}`);
    const el = document.getElementById("overviewContent");
    el.innerHTML = weeks
      .map(
        (w) => `
      <div class="dp-week-block">
        <h4>Week ${w.weekNumber}</h4>
        <div class="dp-day-chip-row">
          ${w.days
            .map(
              (d) => `<div class="dp-day-chip ${d.status}" data-day="${d.day}">Day ${d.day}<br/>${d.status}</div>`
            )
            .join("")}
        </div>
      </div>`
      )
      .join("");

    el.querySelectorAll(".dp-day-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        loadDay(Number(chip.dataset.day));
        document.querySelector('.dp-tab[data-tab="overview"]').click();
        document.getElementById("trackerDayTitle").scrollIntoView({ behavior: "smooth" });
      });
    });
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("loadReportBtn").addEventListener("click", async () => {
  try {
    const { report } = await api(`/report/${state.planId}`);
    renderReport(report);
  } catch (err) {
    alert(err.message);
  }
});

function renderReport(report) {
  const el = document.getElementById("reportContent");
  el.innerHTML = `
    <h3>Your Plan Is Complete</h3>
    <p class="dp-hint">${report.disclaimer}</p>
    <div class="dp-report-grid">
      <div class="dp-stat-box"><div class="dp-stat-value">${report.overallCompletionPercentage}%</div><div class="dp-stat-label">Overall Adherence</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.fullyCompletedDays}</div><div class="dp-stat-label">Fully Completed Days</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.incompleteDays}</div><div class="dp-stat-label">Incomplete Days</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.totalTasksCompleted}/${report.totalTasksAssigned}</div><div class="dp-stat-label">Tasks Completed</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.categoryCompletion.meals}%</div><div class="dp-stat-label">Meals</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.categoryCompletion.water}%</div><div class="dp-stat-label">Water</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.categoryCompletion.protein}%</div><div class="dp-stat-label">Protein</div></div>
      <div class="dp-stat-box"><div class="dp-stat-value">${report.categoryCompletion.exercise}%</div><div class="dp-stat-label">Exercise</div></div>
    </div>
    ${
      report.frequentlyIncompleteTasks.length
        ? `<p><strong>Frequently incomplete:</strong> ${report.frequentlyIncompleteTasks
            .map((t) => `${t.name} (${t.completionRate}% done)`)
            .join(", ")}</p>`
        : ""
    }
    <p class="dp-hint">Plan: ${fmtDate(report.startDate)} – ${fmtDate(report.endDate)} (${report.totalDays} days) · Status: ${report.status}</p>
  `;
}

async function loadPreviousPlans() {
  try {
    const { plans } = await api("/previous");
    const el = document.getElementById("previousPlansContent");
    if (!plans.length) {
      el.innerHTML = `<p class="dp-hint">No previous plans yet.</p>`;
      return;
    }
    el.innerHTML = plans
      .map(
        (p) => `
      <div class="dp-plan-card">
        <div>
          <strong>${p.goal}</strong> · ${p.dietType} · ${p.durationType === "weekly" ? "Weekly" : "Monthly"}<br/>
          <span class="dp-hint">${fmtDate(p.startDate)} – ${fmtDate(p.endDate)} · ${p.completionPercentage}% adherence</span>
        </div>
        <div>
          <span class="dp-status-badge ${p.status}">${p.status}</span>
          <button class="dp-btn dp-btn-small dp-open-plan" data-plan="${p.planId}">Open</button>
        </div>
      </div>`
      )
      .join("");

    el.querySelectorAll(".dp-open-plan").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const planId = btn.dataset.plan;
        state.planId = planId;
        const { plan } = await api(`/plan/${planId}`);
        state.totalDays = plan.totalDays;
        state.startDate = plan.startDate;
        showPanel("tracker");
        await loadDay(1);
        await loadOverview();
        document.querySelector('.dp-tab[data-tab="overview"]').click();
      });
    });
  } catch (err) {
    console.error(err);
  }
}

/* ------------------------------------------------------------------ */
/* INIT                                                                  */
/* ------------------------------------------------------------------ */
loadExistingProfile();
/* ------------------------------------------------------------------ */
/* STEP NAVIGATION                                                     */
/* ------------------------------------------------------------------ */

const STEP_ORDER = [
  "details",
  "goal",
  "dietType",
  "duration",
  "preview",
  "tracker",
];

let currentStep = "details";


function showPanel(stepName) {

  const targetPanel = document.getElementById(`panel-${stepName}`);

  if (!targetPanel) return;


  /* Hide all panels */

  document.querySelectorAll(".dp-panel").forEach((panel) => {
    panel.classList.add("dp-hidden");
  });


  /* Show selected panel */

  targetPanel.classList.remove("dp-hidden");


  /* Update current step */

  currentStep = stepName;


  /* Update top navigation */

  document.querySelectorAll(".dp-step").forEach((step) => {

    const stepNameForButton = step.dataset.step;

    const stepIndex = STEP_ORDER.indexOf(stepNameForButton);
    const currentIndex = STEP_ORDER.indexOf(currentStep);


    step.classList.toggle(
      "active",
      stepNameForButton === currentStep
    );


    /*
      Previous steps are marked completed.
      Current step stays active.
    */

    step.classList.toggle(
      "completed",
      stepIndex < currentIndex
    );

  });

}


/* ------------------------------------------------------------------ */
/* TOP STEP BUTTONS                                                    */
/* ------------------------------------------------------------------ */

document.querySelectorAll(".dp-step").forEach((stepButton) => {

  stepButton.addEventListener("click", () => {

    const target = stepButton.dataset.step;

    const targetIndex = STEP_ORDER.indexOf(target);
    const currentIndex = STEP_ORDER.indexOf(currentStep);


    /*
      Allow navigation only to the current step
      or already completed/previous steps.

      This prevents a user from jumping directly
      to Preview or Tracker without generating a plan.
    */

    if (targetIndex <= currentIndex) {

      showPanel(target);

    }

  });

});


/* ------------------------------------------------------------------ */
/* BACK BUTTONS                                                        */
/* ------------------------------------------------------------------ */

document.querySelectorAll(".dp-back").forEach((button) => {

  button.addEventListener("click", () => {

    const previousStep = button.dataset.back;

    if (previousStep) {
      showPanel(previousStep);
    }

  });

});