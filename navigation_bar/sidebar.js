document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});

/* =========================================================
   LOAD SIDEBAR
   ========================================================= */

async function loadSidebar(activePageKey) {
  const container = document.getElementById("sidebar-container");

  if (!container) {
    return;
  }

  try {
    const response = await fetch("../../navigation_bar/sidebar.html");

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const html = await response.text();

    const tempDiv = document.createElement("div");

    tempDiv.innerHTML = html;

    /* =====================================================
       REMOVE LOGOUT MODAL FROM SIDEBAR CONTAINER
       ===================================================== */

    const logoutModal = tempDiv.querySelector("#logoutModalBackdrop");

    if (logoutModal) {
      logoutModal.remove();
    }

    /* Insert sidebar */

    container.innerHTML = tempDiv.innerHTML;

    /* =====================================================
       LOAD ACTIVE STAFF
       ===================================================== */

    loadActiveStaffProfile();

    /* =====================================================
       ADD LOGOUT MODAL TO BODY
       ===================================================== */

    if (!document.getElementById("logoutModalBackdrop") && logoutModal) {
      document.body.appendChild(logoutModal);
    }

    /* =====================================================
       DETERMINE CURRENT PAGE
       ===================================================== */

    let pageKey = activePageKey;

    if (!pageKey) {
      const currentPath = window.location.pathname;

      if (currentPath.includes("dashboard")) {
        pageKey = "dashboard";
      } else if (currentPath.includes("appointment")) {
        pageKey = "appointment";
      } else if (currentPath.includes("patient")) {
        pageKey = "patients";
      } else if (currentPath.includes("inventory")) {
        pageKey = "inventory";
      } else if (currentPath.includes("sms")) {
        pageKey = "sms";
      } else if (currentPath.includes("finance")) {
        pageKey = "finance";
      }
    }

    /* =====================================================
       APPLY ACTIVE PAGE
       ===================================================== */

    if (pageKey) {
      const activeLink = container.querySelector(`[data-page="${pageKey}"]`);

      if (activeLink) {
        activeLink.classList.add("active");
      }
    }

    /* =====================================================
       APPLY SIDEBAR STATE
       ===================================================== */

    applySavedSidebarState();

    /* =====================================================
       INITIALIZE SIDEBAR EVENTS
       ===================================================== */

    initSidebarLogic();
  } catch (error) {
    console.error("Failed to load sidebar navigation:", error);
  }
}

/* =========================================================
   LOAD ACTIVE STAFF PROFILE
   ========================================================= */

function loadActiveStaffProfile() {
  const staffName = document.getElementById("activeStaffName");

  const staffImage = document.getElementById("activeStaffImage");

  const staffInitials = document.getElementById("activeStaffInitials");

  if (!staffName) {
    return;
  }

  /*
   * Current logged-in staff.
   *
   * This can later be connected
   * to your database/session.
   */

  const activeStaff = {
    name: "Erwin Jacaba",

    initials: "EJ",

    image: "",
  };

  /* =====================================================
     STAFF NAME
     ===================================================== */

  staffName.textContent = activeStaff.name;

  /* =====================================================
     STAFF IMAGE
     ===================================================== */

  if (activeStaff.image && staffImage) {
    staffImage.src = activeStaff.image;

    staffImage.style.display = "block";

    if (staffInitials) {
      staffInitials.style.display = "none";
    }
  } else {
    if (staffImage) {
      staffImage.style.display = "none";
    }

    if (staffInitials) {
      staffInitials.textContent = activeStaff.initials;

      staffInitials.style.display = "block";
    }
  }
}

/* =========================================================
   APPLY SAVED SIDEBAR STATE
   ========================================================= */

function applySavedSidebarState() {
  const sidebar = document.getElementById("sidebar");

  const toggleIcon = document.getElementById("toggleIcon");

  const savedState = localStorage.getItem("sidebarState");

  if (!sidebar) {
    return;
  }

  if (window.innerWidth > 768) {
    if (savedState === "collapsed") {
      sidebar.classList.add("collapsed");

      if (toggleIcon) {
        toggleIcon.className = "fa-solid fa-chevron-right";
      }
    } else {
      sidebar.classList.remove("collapsed");

      if (toggleIcon) {
        toggleIcon.className = "fa-solid fa-chevron-left";
      }
    }
  }
}

/* =========================================================
   SIDEBAR LOGIC
   ========================================================= */

function initSidebarLogic() {
  const sidebar = document.getElementById("sidebar");

  const sidebarToggle = document.getElementById("sidebarToggle");

  const toggleIcon = document.getElementById("toggleIcon");

  const sidebarOverlay = document.getElementById("sidebarOverlay");

  const mobileMenuToggle = document.getElementById("mobileMenuToggle");

  /* =======================================================
     DESKTOP TOGGLE
     ======================================================= */

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");

      if (sidebar.classList.contains("collapsed")) {
        localStorage.setItem("sidebarState", "collapsed");

        if (toggleIcon) {
          toggleIcon.className = "fa-solid fa-chevron-right";
        }
      } else {
        localStorage.setItem("sidebarState", "expanded");

        if (toggleIcon) {
          toggleIcon.className = "fa-solid fa-chevron-left";
        }
      }
    });
  }

  /* =======================================================
     MOBILE MENU
     ======================================================= */

  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");

      if (sidebarOverlay) {
        sidebarOverlay.classList.toggle("active");
      }
    });
  }

  /* =======================================================
     MOBILE OVERLAY
     ======================================================= */

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");

      sidebarOverlay.classList.remove("active");
    });
  }
}

/* =========================================================
   GLOBAL LOGOUT MODAL
   ========================================================= */

document.addEventListener("click", (e) => {
  const logoutBtn = e.target.closest(".btn-logout");

  const cancelBtn = e.target.closest("#logoutCancelBtn");

  const confirmBtn = e.target.closest("#logoutConfirmBtn");

  const backdrop = document.getElementById("logoutModalBackdrop");

  /* =====================================================
       OPEN MODAL
       ===================================================== */

  if (logoutBtn) {
    e.preventDefault();

    if (backdrop) {
      backdrop.classList.add("active");
    }
  }

  /* =====================================================
       CANCEL LOGOUT
       ===================================================== */

  if (cancelBtn) {
    e.preventDefault();

    if (backdrop) {
      backdrop.classList.remove("active");
    }
  }

  /* =====================================================
       CONFIRM LOGOUT
       ===================================================== */

  if (confirmBtn) {
    e.preventDefault();

    localStorage.removeItem("isLoggedIn");

    window.location.href = "../../homepage/homepage.html";
  }
});
