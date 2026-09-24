document.addEventListener("DOMContentLoaded", () => {
  const navToggleBtn = document.getElementById("navToggleBtn");
  const navMenuWrapper = document.getElementById("navMenuWrapper");
  const navOverlay = document.getElementById("navOverlay");
  const pageBlurWrapper = document.getElementById("pageBlurWrapper");
  const navToggleIcon = document.getElementById("navToggleIcon");
  const navBrand = document.getElementById("navBrand");
  const homeNavbar = document.getElementById("homeNavbar");

  function toggleMobileMenu(forceState) {
    if (!navMenuWrapper) {
      return;
    }

    const currentState = navMenuWrapper.classList.contains("mobile-open");
    const isOpen = typeof forceState === "boolean" ? forceState : !currentState;

    navMenuWrapper.classList.toggle("mobile-open", isOpen);

    navToggleBtn?.setAttribute("aria-expanded", String(isOpen));

    navOverlay?.classList.toggle("active", isOpen);
    pageBlurWrapper?.classList.toggle("is-blurred", isOpen);
    navBrand?.classList.toggle("hidden", isOpen);
    homeNavbar?.classList.toggle("nav-active-bg", isOpen);

    if (navToggleIcon) {
      navToggleIcon.className = isOpen
        ? "fa-solid fa-xmark"
        : "fa-solid fa-bars";
    }

    document.body.classList.toggle("mobile-menu-open", isOpen);
  }

  navToggleBtn?.addEventListener("click", () => {
    toggleMobileMenu();
  });

  navOverlay?.addEventListener("click", () => {
    toggleMobileMenu(false);
  });

  const mobileLinks = document.querySelectorAll(".nav-links a");

  mobileLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (navMenuWrapper?.classList.contains("mobile-open")) {
        toggleMobileMenu(false);
      }
    });
  });

  const loginModalOverlay = document.getElementById("loginModalOverlay");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const loginIframe = document.getElementById("loginIframe");

  let lastFocusedElement = null;

  function openLoginModal(event) {
    event.preventDefault();

    if (!loginModalOverlay) {
      return;
    }

    lastFocusedElement = document.activeElement;

    loginModalOverlay.classList.add("active");
    loginModalOverlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

    modalCloseBtn?.focus();
  }

  function closeLoginModal() {
    if (!loginModalOverlay) {
      return;
    }

    loginModalOverlay.classList.remove("active");
    loginModalOverlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
      lastFocusedElement.focus();
    }
  }

  document
    .querySelectorAll('a[href*="login/login.html"]')
    .forEach((loginLink) => {
      loginLink.addEventListener("click", openLoginModal);
    });

  modalCloseBtn?.addEventListener("click", closeLoginModal);

  loginModalOverlay?.addEventListener("click", (event) => {
    if (event.target === loginModalOverlay) {
      closeLoginModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      loginModalOverlay?.classList.contains("active")
    ) {
      closeLoginModal();
    }

    if (
      event.key === "Escape" &&
      navMenuWrapper?.classList.contains("mobile-open")
    ) {
      toggleMobileMenu(false);
    }
  });

  loginIframe?.addEventListener("load", () => {
    if (loginModalOverlay?.classList.contains("active")) {
      modalCloseBtn?.focus();
    }
  });

  const heroSlides = document.querySelectorAll(".hero-slide");
  const heroSlider = document.getElementById("heroSlider");
  const heroSliderDots = document.getElementById("heroSliderDots");

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  );

  let currentHeroSlide = 0;
  let heroSlideInterval = null;

  function showHeroSlide(index) {
    if (!heroSlides.length) {
      return;
    }

    if (index < 0 || index >= heroSlides.length) {
      index = 0;
    }

    heroSlides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === index);
    });

    heroSliderDots?.querySelectorAll("button").forEach((dot, dotIndex) => {
      const isActive = dotIndex === index;

      dot.classList.toggle("active", isActive);
      dot.setAttribute("aria-current", isActive ? "true" : "false");
    });

    currentHeroSlide = index;
  }

  function startHeroSlider() {
    clearInterval(heroSlideInterval);

    if (heroSlides.length > 1 && !prefersReducedMotion.matches) {
      heroSlideInterval = setInterval(() => {
        const nextSlide = (currentHeroSlide + 1) % heroSlides.length;

        showHeroSlide(nextSlide);
      }, 4500);
    }
  }

  if (heroSliderDots && heroSlides.length > 1) {
    heroSlides.forEach((_, slideIndex) => {
      const dot = document.createElement("button");

      dot.type = "button";
      dot.className = "hero-slider-dot";

      dot.setAttribute("aria-label", `Show hero image ${slideIndex + 1}`);

      dot.setAttribute("aria-current", slideIndex === 0 ? "true" : "false");

      dot.addEventListener("click", () => {
        showHeroSlide(slideIndex);
        startHeroSlider();
      });

      heroSliderDots.appendChild(dot);
    });
  }

  heroSlider?.addEventListener("mouseenter", () => {
    clearInterval(heroSlideInterval);
  });

  heroSlider?.addEventListener("mouseleave", () => {
    startHeroSlider();
  });

  heroSlider?.addEventListener("focusin", () => {
    clearInterval(heroSlideInterval);
  });

  heroSlider?.addEventListener("focusout", () => {
    startHeroSlider();
  });

  if (typeof prefersReducedMotion.addEventListener === "function") {
    prefersReducedMotion.addEventListener("change", startHeroSlider);
  }

  if (heroSlides.length > 0) {
    showHeroSlide(0);
    startHeroSlider();
  }

  const navLinks = document.querySelectorAll(".nav-link");

  const sections = Array.from(navLinks)
    .map((link) => {
      const target = link.getAttribute("href");

      if (!target || !target.startsWith("#")) {
        return null;
      }

      return document.querySelector(target);
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          navLinks.forEach((link) => {
            const target = link.getAttribute("href");

            const isActive = target === `#${entry.target.id}`;

            link.classList.toggle("active", isActive);

            if (isActive) {
              link.setAttribute("aria-current", "page");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      {
        rootMargin: "-25% 0px -65% 0px",
        threshold: 0,
      },
    );

    sections.forEach((section) => {
      sectionObserver.observe(section);
    });
  }

  const internalLinks = document.querySelectorAll('a[href^="#"]');

  internalLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") {
        return;
      }

      const targetElement = document.querySelector(targetId);

      if (!targetElement) {
        return;
      }

      setTimeout(() => {
        targetElement.setAttribute("tabindex", "-1");

        targetElement.addEventListener(
          "blur",
          () => {
            targetElement.removeAttribute("tabindex");
          },
          {
            once: true,
          },
        );

        targetElement.focus({
          preventScroll: true,
        });
      }, 500);
    });
  });
});
