// Simple toggle script for password visibility
const togglePasswordBtn = document.getElementById("togglePasswordBtn");
const passwordInput = document.getElementById("password");
const eyeIcon = document.getElementById("eyeIcon");

if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", function () {
    const type =
      passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    eyeIcon.classList.toggle("fa-eye");
    eyeIcon.classList.toggle("fa-eye-slash");
  });
}

// Authentication, Validation, & Redirect Logic
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector(".auth-form");
  const errorBox = document.getElementById("loginErrorMsg");
  const errorText = document.getElementById("errorText");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim().toLowerCase();
      const password = document.getElementById("password").value;

      // Retrieve stored users from localStorage
      let users = JSON.parse(localStorage.getItem("dentanueva_users")) || [];

      // 1. Check if the email address exists in registered accounts
      const userWithEmail = users.find((user) => user.email === email);

      if (!userWithEmail) {
        // Condition A: No account found with this email
        if (errorBox && errorText) {
          errorText.textContent = "Account not found. Please try again.";
          errorBox.style.display = "flex";
        }
        return;
      }

      // 2. Check if the password matches the registered email
      const validUser = users.find(
        (user) => user.email === email && user.password === password,
      );

      if (validUser) {
        // Condition B: Success - Hide error box, save session, and redirect
        if (errorBox) errorBox.style.display = "none";

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", JSON.stringify(validUser));

        // Break out of the modal iframe and redirect main browser window to dashboard
        window.top.location.href = "../staff/dashboard/dashboard.html";
      } else {
        // Condition C: Email exists, but password is incorrect
        if (errorBox && errorText) {
          errorText.textContent =
            "Email or Password is incorrect. Please try again.";
          errorBox.style.display = "flex";
        }
      }
    });
  }
});
