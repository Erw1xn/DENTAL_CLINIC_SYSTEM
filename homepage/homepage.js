document.addEventListener("DOMContentLoaded", () => {
  const navToggleBtn = document.getElementById("navToggleBtn");
  const navMenuWrapper = document.getElementById("navMenuWrapper");
  const navOverlay = document.getElementById("navOverlay");
  const pageBlurWrapper = document.getElementById("pageBlurWrapper");
  const navToggleIcon = document.getElementById("navToggleIcon");
  const navBrand = document.getElementById("navBrand");
  const homeNavbar = document.getElementById("homeNavbar");

  function toggleMobileMenu() {
    const isOpen = navMenuWrapper.classList.toggle("mobile-open");
    if (navOverlay) navOverlay.classList.toggle("active", isOpen);
    if (pageBlurWrapper) pageBlurWrapper.classList.toggle("is-blurred", isOpen);
    if (navBrand) navBrand.classList.toggle("hidden", isOpen);
    if (homeNavbar) homeNavbar.classList.toggle("nav-active-bg", isOpen);

    if (navToggleIcon) {
      navToggleIcon.className = isOpen
        ? "fa-solid fa-xmark"
        : "fa-solid fa-bars";
    }
  }

  if (navToggleBtn) {
    navToggleBtn.addEventListener("click", toggleMobileMenu);
  }

  if (navOverlay) {
    navOverlay.addEventListener("click", toggleMobileMenu);
  }

  // Close menu when clicking a link inside mobile drawer
  const mobileLinks = document.querySelectorAll(".nav-links a");
  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (navMenuWrapper.classList.contains("mobile-open")) {
        toggleMobileMenu();
      }
    });
  });

  // Login Modal Interactivity Logic
  const openLoginBtn = document.getElementById("openLoginBtn");
  const loginModalOverlay = document.getElementById("loginModalOverlay");
  const modalCloseBtn = document.getElementById("modalCloseBtn");

  if (openLoginBtn && loginModalOverlay) {
    openLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      loginModalOverlay.classList.add("active");
    });
  }

  if (modalCloseBtn && loginModalOverlay) {
    modalCloseBtn.addEventListener("click", () => {
      loginModalOverlay.classList.remove("active");
    });
  }

  if (loginModalOverlay) {
    loginModalOverlay.addEventListener("click", (e) => {
      if (e.target === loginModalOverlay) {
        loginModalOverlay.classList.remove("active");
      }
    });
  }
});
