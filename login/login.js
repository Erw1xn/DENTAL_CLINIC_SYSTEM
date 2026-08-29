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

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.querySelector(".auth-form");
  const errorBox = document.getElementById("loginErrorMsg");
  const errorText = document.getElementById("errorText");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = document.getElementById("email").value.trim().toLowerCase();

      const password = document.getElementById("password").value;

      let users = [];

      try {
        users = JSON.parse(localStorage.getItem("dentanueva_users")) || [];
      } catch (error) {
        users = [];
      }

      const userWithEmail = users.find(
        (user) => user.email && user.email.toLowerCase() === email,
      );

      if (!userWithEmail) {
        if (errorBox && errorText) {
          errorText.textContent = "Account not found. Please try again.";

          errorBox.style.display = "flex";
        }

        return;
      }

      const validUser = users.find(
        (user) =>
          user.email &&
          user.email.toLowerCase() === email &&
          user.password === password,
      );

      if (validUser) {
        if (errorBox) {
          errorBox.style.display = "none";
        }

        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", JSON.stringify(validUser));

        window.top.location.href = "../staff/dashboard/dashboard.html";
      } else {
        if (errorBox && errorText) {
          errorText.textContent =
            "Email or Password is incorrect. Please try again.";

          errorBox.style.display = "flex";
        }
      }
    });
  }
});
