/* ============================================================
   SANJEEVANI — PERSONAL INFORMATION UI
   ------------------------------------------------------------
   IMPORTANT:
   This file only controls visual enhancements.

   It does NOT:
   - call the API
   - save the profile
   - change diet planner state
   - change MongoDB logic
   - replace diet-planner.js

   The real form functionality remains inside:
   public/js/diet-planner.js
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("detailsForm");

  if (!form) return;


  /* ==========================================================
     ELEMENTS
  ========================================================== */

  const progressRing =
    document.getElementById("piProgressRing");

  const progressValue =
    document.getElementById("piProgressValue");

  const continueButton =
    form.querySelector(".pi-continue-btn");


  /* ==========================================================
     PROFILE FIELDS
  ========================================================== */

  const fields = [
    form.querySelector('[name="name"]'),
    form.querySelector('[name="age"]'),
    form.querySelector('[name="height"]'),
    form.querySelector('[name="weight"]'),
    form.querySelector('[name="cuisine"]'),
    form.querySelector('[name="cookingTime"]'),
    form.querySelector('[name="allergies"]'),
    form.querySelector('[name="restrictions"]'),
    form.querySelector('[name="dislikedFoods"]'),
    form.querySelector('[name="preferences"]')
  ].filter(Boolean);


  /* ==========================================================
     PROFILE COMPLETION
  ========================================================== */

  function calculateProgress() {

    let completed = 0;

    fields.forEach((field) => {

      const value =
        String(field.value || "").trim();

      if (value.length > 0) {
        completed++;
      }

    });

    const percentage =
      Math.round((completed / fields.length) * 100);

    updateProgress(percentage);
  }


  function updateProgress(percentage) {

    if (progressValue) {
      progressValue.textContent =
        `${percentage}%`;
    }

    if (progressRing) {

      const degrees =
        Math.round((percentage / 100) * 360);

      progressRing.style.background = `
        conic-gradient(
          var(--pi-forest) ${degrees}deg,
          #e8e3d8 ${degrees}deg
        )
      `;
    }
  }


  /* ==========================================================
     FIELD INTERACTIONS
  ========================================================== */

  fields.forEach((field) => {

    field.addEventListener("input", () => {

      calculateProgress();

      const wrapper =
        field.closest(".pi-field");

      if (wrapper) {
        wrapper.classList.remove("pi-invalid");
      }

    });


    field.addEventListener("change", () => {

      calculateProgress();

    });


    field.addEventListener("blur", () => {

      if (
        field.hasAttribute("required") &&
        !String(field.value || "").trim()
      ) {

        const wrapper =
          field.closest(".pi-field");

        if (wrapper) {
          wrapper.classList.add("pi-invalid");
        }

      }

    });

  });


  /* ==========================================================
     FOCUS ANIMATION
  ========================================================== */

  fields.forEach((field) => {

    field.addEventListener("focus", () => {

      const wrapper =
        field.closest(".pi-input-wrap");

      if (wrapper) {
        wrapper.style.transform =
          "translateY(-1px)";
      }

    });


    field.addEventListener("blur", () => {

      const wrapper =
        field.closest(".pi-input-wrap");

      if (wrapper) {
        wrapper.style.transform =
          "";
      }

    });

  });


  /* ==========================================================
     SUBMIT VISUAL STATE
     ----------------------------------------------------------
     diet-planner.js remains responsible for the actual
     submission/API operation.
  ========================================================== */

  form.addEventListener("submit", () => {

    if (!continueButton) return;

    continueButton.classList.add("pi-loading");

    const label =
      continueButton.querySelector("span");

    const arrow =
      continueButton.querySelector("strong");

    if (label) {
      label.textContent = "Saving...";
    }

    if (arrow) {
      arrow.textContent = "⟳";
    }

  });


  /* ==========================================================
     INITIAL PROGRESS
  ========================================================== */

  calculateProgress();


  /* ==========================================================
     EXISTING PROFILE SUPPORT
     ----------------------------------------------------------
     diet-planner.js loads saved profile data asynchronously.
     We periodically check the fields briefly so the visual
     progress ring updates after those values arrive.
  ========================================================== */

  let checks = 0;

  const profileCheck =
    setInterval(() => {

      calculateProgress();

      checks++;

      if (checks >= 10) {
        clearInterval(profileCheck);
      }

    }, 500);

});