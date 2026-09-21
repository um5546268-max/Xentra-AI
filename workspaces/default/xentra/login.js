// ─── Element refs ───
const form = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const emailError = document.getElementById("email-error");
const passwordError = document.getElementById("password-error");
const submitBtn = document.getElementById("submit");
const messageEl = document.getElementById("message");
const toggleBtn = document.getElementById("toggle-password");

// ─── Live validation ───
function validateEmail(value) {
  if (!value.trim()) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email";
  return "";
}

function validatePassword(value) {
  if (!value) return "Password is required";
  if (value.length < 6) return "Password must be at least 6 characters";
  return "";
}

emailInput.addEventListener("input", () => {
  const err = validateEmail(emailInput.value);
  emailError.textContent = err;
  emailInput.classList.toggle("error", !!err);
});

passwordInput.addEventListener("input", () => {
  const err = validatePassword(passwordInput.value);
  passwordError.textContent = err;
  passwordInput.classList.toggle("error", !!err);
});

// ─── Password toggle ───
toggleBtn.addEventListener("click", () => {
  const isPassword = passwordInput.type === "password";
  passwordInput.type = isPassword ? "text" : "password";
  toggleBtn.textContent = isPassword ? "🙈" : "👁";
  toggleBtn.setAttribute(
    "aria-label",
    isPassword ? "Hide password" : "Show password"
  );
});

// ─── Form submit ───
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  messageEl.textContent = "";
  messageEl.className = "message";

  // Validate everything
  const emailErr = validateEmail(emailInput.value);
  const passwordErr = validatePassword(passwordInput.value);

  emailError.textContent = emailErr;
  passwordError.textContent = passwordErr;
  emailInput.classList.toggle("error", !!emailErr);
  passwordInput.classList.toggle("error", !!passwordErr);

  if (emailErr || passwordErr) return;

  // Simulate a login request
  submitBtn.disabled = true;
  submitBtn.classList.add("loading");

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Fake credential check
    if (
      emailInput.value === "demo@xentra.ai" &&
      passwordInput.value === "password123"
    ) {
      messageEl.textContent = "✓ Signed in! Redirecting…";
      messageEl.classList.add("success");
    } else {
      messageEl.textContent = "✗ Invalid credentials. Try demo@xentra.ai / password123";
      messageEl.classList.add("failure");
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.classList.remove("loading");
  }
});

// Prefill for convenience (delete these two lines for a fresh form)
emailInput.value = "demo@xentra.ai";
passwordInput.value = "password123";

console.log("✅ Login screen ready — try typing while preview is open");