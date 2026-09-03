const intro = document.getElementById("intro");
const introVideo = document.getElementById("introVideo");
const skipBtn = document.getElementById("skipBtn");
const registerPage = document.getElementById("registerPage");
const form = document.getElementById("registerForm");
const message = document.getElementById("formMessage");
const phoneInput = document.getElementById("phone");

phoneInput.addEventListener("input", () => {
  phoneInput.value = phoneInput.value.replace(/\D/g, "").slice(0, 10);
});
const signInLink = document.getElementById("signInLink");

let introClosed = false;

// -----------------------------
// INTRO VIDEO
// -----------------------------

function showRegistration() {
  if (introClosed) return;

  introClosed = true;

  intro.classList.add("hide");
  registerPage.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "auto";

  setTimeout(() => {
    intro.remove();
  }, 950);
}

introVideo.addEventListener("ended", showRegistration);
skipBtn.addEventListener("click", showRegistration);

introVideo.addEventListener("error", () => {
  showRegistration();
});

// -----------------------------
// REGISTRATION
// -----------------------------

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fullName = document.getElementById("fullName").value.trim();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const phone = phoneInput.value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const terms = document.getElementById("terms").checked;

  // Empty fields
  if (!fullName || !email || !phone || !password || !confirmPassword) {
    message.textContent = "Please fill in all required fields.";
    return;
  }

  // Mobile number validation
  if (!/^\d{10}$/.test(phone)) {
    message.textContent = "Mobile number must contain exactly 10 digits.";
    phoneInput.focus();
    return;
  }

  // Email validation
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    message.textContent = "Please enter a valid email address.";
    return;
  }
// Email validation

if (!/^\S+@\S+\.\S+$/.test(email)) {

  message.textContent = "Please enter a valid email address.";

  return;
}


// Strong Password Validation

const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

if (!strongPassword.test(password)) {

  message.textContent =
    "Password must have at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.";

  return;
}


// Password confirmation

if (password !== confirmPassword) {

  message.textContent = "Passwords do not match.";

  return;
}
  // Password confirmation
  if (password !== confirmPassword) {
    message.textContent = "Passwords do not match.";
    return;
  }

  // Terms
  if (!terms) {
    message.textContent = "Please accept the terms to continue.";
    return;
  }

  try {
    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, password })
    });
    const result = await response.json();

    if (!response.ok) {
      message.textContent = result.message || "Registration failed.";
      return;
    }

    message.textContent = result.message;
    setTimeout(showLoginForm, 1200);
  } catch (error) {
    message.textContent = "Unable to connect to the server. Please try again.";
  }
});

signInLink.addEventListener("click", (event) => {
  event.preventDefault();
  showLoginForm();
});

// -----------------------------
// LOGIN FORM
// -----------------------------

function showLoginForm() {
  const registerCard = document.querySelector(".register-shell");

  if (!registerCard) return;

  registerCard.innerHTML = `
    <div class="brand-mark login-brand">
      <div class="brand-symbol"></div>
      <p>Traditional Wisdom • Modern Wellness</p>
      <h1>SANJEEVANI</h1>
    </div>

    <div class="login-section">
      <h2>Welcome Back</h2>
      <p class="login-subtitle">
        Login to continue your Sanjeevani journey
      </p>

      <form id="loginForm" class="register-card" novalidate>

        <label for="loginEmail">Email Address</label>
        <input
          type="email"
          id="loginEmail"
          placeholder="Enter your email"
          required
        >

        <label for="loginPassword">Password</label>
        <input
          type="password"
          id="loginPassword"
          placeholder="Enter your password"
          required
        >
        <button type="button" id="forgotPassword">
            Forgot Password?
        </button>

        <p id="loginMessage" class="form-message"></p>

        <button type="submit" class="register-btn">
          Login
        </button>

        <p class="switch-text">
          New to Sanjeevani?
          <button type="button" id="backToRegister">
            Create an account
          </button>
        </p>

      </form>
    </div>
  `;
// -----------------------------
// FORGOT PASSWORD
// -----------------------------

const forgotPassword = document.getElementById("forgotPassword");

forgotPassword.addEventListener("click", () => {

    const savedUser = JSON.parse(
        localStorage.getItem("sanjeevaniUser")
    );

    if (!savedUser) {
        loginMessage.textContent =
            "No account found. Please register first.";
        return;
    }

    const email = prompt(
        "Enter your registered email:"
    );

    if (!email) {
        return;
    }

    if (email.trim().toLowerCase() !== savedUser.email) {
        loginMessage.textContent =
            "Email does not match our records.";
        return;
    }

    const newPassword = prompt(
        "Enter your new password:"
    );

    if (!newPassword) {
        return;
    }

   const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

if (!strongPassword.test(newPassword)) {

  loginMessage.textContent =
    "Password must have at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.";

  return;
}

    savedUser.password = newPassword;

    localStorage.setItem(
        "sanjeevaniUser",
        JSON.stringify(savedUser)
    );

    loginMessage.textContent =
        "Password changed successfully. You can now login.";
}); 
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const backToRegister = document.getElementById("backToRegister");

  // Login
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document
      .getElementById("loginEmail")
      .value.trim()
      .toLowerCase();

    const password = document.getElementById("loginPassword").value;

    if (!email || !password) {
      loginMessage.textContent = "Please enter your email and password.";
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();

      if (!response.ok) {
        loginMessage.textContent = result.message || "Incorrect email or password.";
        return;
      }

      loginMessage.textContent = result.message;
      setTimeout(() => {
        window.location.href = "home.html";
      }, 1000);
    } catch (error) {
      loginMessage.textContent = "Unable to connect to the server. Please try again.";
    }
  });

  // Back to registration
  backToRegister.addEventListener("click", () => {
    location.reload();
  });
}

// -----------------------------
// SIMPLE HOME PAGE
// -----------------------------

function showHomePage(fullName) {
  const registerCard = document.querySelector(".register-shell");

  if (!registerCard) return;

  registerCard.innerHTML = `
    <div class="brand-mark">
      <div class="brand-symbol">🌿</div>

      <h1>SANJEEVANI</h1>

      <p>Traditional Wisdom • Modern Wellness</p>
    </div>

    <div class="welcome-section">
      <h2>Welcome, ${fullName}! 🌿</h2>

      <p>
        Your Sanjeevani journey begins here.
      </p>

      <div class="home-options">

        <div class="home-option">
          <span>🌿</span>
          <h3>Ayurveda</h3>
          <p>Explore Ayurvedic knowledge and natural wellness.</p>
        </div>

        <div class="home-option">
          <span>🥗</span>
          <h3>Diet Planner</h3>
          <p>Create a personalized healthy diet plan.</p>
        </div>

        <div class="home-option">
          <span>🛍️</span>
          <h3>Ayurvedic Products</h3>
          <p>Explore traditional wellness products.</p>
        </div>

      </div>
    </div>
  `;
}

// -----------------------------
// KEEP INTRO LOCKED
// -----------------------------

document.body.style.overflow = "hidden";