// Password Visibility Toggle for Password Field
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

// Password Visibility Toggle for Confirm Password Field
const toggleConfirmBtn = document.getElementById("toggleConfirmBtn");
const confirmInput = document.getElementById("confirm_password");
const eyeIconConfirm = document.getElementById("eyeIconConfirm");

if (toggleConfirmBtn) {
  toggleConfirmBtn.addEventListener("click", function () {
    const type =
      confirmInput.getAttribute("type") === "password" ? "text" : "password";
    confirmInput.setAttribute("type", type);
    eyeIconConfirm.classList.toggle("fa-eye");
    eyeIconConfirm.classList.toggle("fa-eye-slash");
  });
}

// Live Requirements Tracker & Auto-Hide Logic
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.querySelector(".auth-form");
  const passwordField = document.getElementById("password");
  const confirmPasswordField = document.getElementById("confirm_password");
  const emailField = document.getElementById("email");

  const requirementsBox = document.getElementById("passwordRequirements");
  const lengthRule = document.getElementById("lengthRule");
  const upperRule = document.getElementById("upperRule");
  const numberRule = document.getElementById("numberRule");
  const specialRule = document.getElementById("specialRule");

  function checkPasswordRequirements(pwd) {
    const minLength = pwd.length >= 8;
    const hasUppercase = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[^a-zA-Z0-9]/.test(pwd); // Accepts special characters like underscores (_)

    // Update visual check marks
    if (lengthRule) lengthRule.className = minLength ? "valid" : "invalid";
    if (upperRule) upperRule.className = hasUppercase ? "valid" : "invalid";
    if (numberRule) numberRule.className = hasNumber ? "valid" : "invalid";
    if (specialRule)
      specialRule.className = hasSpecialChar ? "valid" : "invalid";

    const allMet = minLength && hasUppercase && hasNumber && hasSpecialChar;

    // Automatically hide requirement list when all rules are met, show if not
    if (requirementsBox) {
      requirementsBox.style.display = allMet ? "none" : "flex";
    }

    return allMet;
  }

  // Real-time listener updating checklist and visibility as user types
  if (passwordField) {
    passwordField.addEventListener("input", () => {
      checkPasswordRequirements(passwordField.value);
      passwordField.setCustomValidity("");
    });
  }

  [confirmPasswordField, emailField].forEach((field) => {
    if (field) {
      field.addEventListener("input", () => {
        field.setCustomValidity("");
      });
    }
  });

  if (signupForm) {
    signupForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const firstname = document.getElementById("firstname").value.trim();
      const lastname = document.getElementById("lastname").value.trim();
      const email = emailField.value.trim().toLowerCase();
      const password = passwordField.value;
      const confirmPassword = confirmPasswordField.value;

      // 1. Password Strength Validation
      if (!checkPasswordRequirements(password)) {
        passwordField.setCustomValidity(
          "Please meet all password requirements listed below.",
        );
        passwordField.reportValidity();
        return;
      }

      // 2. Confirm Password Match Validation
      if (password !== confirmPassword) {
        confirmPasswordField.setCustomValidity(
          "Passwords do not match. Please try again.",
        );
        confirmPasswordField.reportValidity();
        return;
      }

      // Retrieve existing users or initialize empty array
      let users = JSON.parse(localStorage.getItem("dentanueva_users")) || [];

      // 3. Email Already Exists Validation
      const existingUser = users.find((user) => user.email === email);
      if (existingUser) {
        emailField.setCustomValidity(
          "An account with this email already exists! Please log in.",
        );
        emailField.reportValidity();
        return;
      }

      // 4. Save new user object and redirect directly to login page
      users.push({ firstname, lastname, email, password });
      localStorage.setItem("dentanueva_users", JSON.stringify(users));

      window.location.href = "../login/login.html";
    });
  }
});
