document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();
});
async function loadSidebar(activePageKey) {
  const container = document.getElementById("sidebar-container");
  if (!container) {
    return;
  }
  try {
    const response = await fetch("../../Doctor/navigationbar/sidebar.html");
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const html = await response.text();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const logoutModal = tempDiv.querySelector("#logoutModalBackdrop");
    if (logoutModal) {
      logoutModal.remove();
    }
    container.innerHTML = tempDiv.innerHTML;
    loadActiveStaffProfile();
    if (!document.getElementById("logoutModalBackdrop") && logoutModal) {
      document.body.appendChild(logoutModal);
    }
    let pageKey = activePageKey;
    if (!pageKey) {
      const currentPath = window.location.pathname;
      if (currentPath.includes("dashboard")) {
        pageKey = "dashboard";
      } else if (currentPath.includes("appointment")) {
        pageKey = "appointment";
      } else if (currentPath.includes("patient")) {
        pageKey = "patients";
      } else if (currentPath.includes("finance")) {
        pageKey = "finance";
      }
    }
    if (pageKey) {
      const activeLink = container.querySelector(`[data-page="${pageKey}"]`);
      if (activeLink) {
        activeLink.classList.add("active");
      }
    }
    applySavedSidebarState();
    initSidebarLogic();
  } catch (error) {
    console.error("Failed to load sidebar navigation:", error);
  }
}
function loadActiveStaffProfile() {
  const staffName = document.getElementById("activeStaffName");
  const staffImage = document.getElementById("activeStaffImage");
  const staffInitials = document.getElementById("activeStaffInitials");
  if (!staffName) {
    return;
  }
  const activeUser = getLoggedInUser();
  if (!activeUser) {
    staffName.textContent = "User";
    staffInitials.textContent = "U";
    if (staffImage) {
      staffImage.style.display = "none";
    }
    if (staffInitials) {
      staffInitials.style.display = "block";
    }
    return;
  }
  const name =
    activeUser.name ||
    activeUser.full_name ||
    activeUser.fullName ||
    activeUser.fullname ||
    activeUser.displayName ||
    activeUser.username ||
    "User";
  const image =
    activeUser.image ||
    activeUser.profileImage ||
    activeUser.profile_image ||
    activeUser.photo ||
    activeUser.photoURL ||
    activeUser.avatar ||
    "";
  const initials = getInitials(name);
  staffName.textContent = name;
  if (image && staffImage) {
    staffImage.src = image;
    staffImage.style.display = "block";
    if (staffInitials) {
      staffInitials.style.display = "none";
    }
  } else {
    if (staffImage) {
      staffImage.removeAttribute("src");
      staffImage.style.display = "none";
    }
    if (staffInitials) {
      staffInitials.textContent = initials;
      staffInitials.style.display = "block";
    }
  }
}
function getLoggedInUser() {
  const storageKeys = [
    "currentUser",
    "loggedInUser",
    "user",
    "authUser",
    "activeUser",
    "sessionUser",
    "userData",
    "current_user",
    "loggedInUserData",
    "loginUser",
  ];
  for (const key of storageKeys) {
    const localValue = localStorage.getItem(key);
    if (localValue) {
      const user = parseUserData(localValue);
      if (user) {
        return user;
      }
    }
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue) {
      const user = parseUserData(sessionValue);
      if (user) {
        return user;
      }
    }
  }
  return null;
}
function parseUserData(value) {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      if (parsed.user && typeof parsed.user === "object") {
        return parsed.user;
      }
      if (parsed.data && typeof parsed.data === "object") {
        if (parsed.data.user && typeof parsed.data.user === "object") {
          return parsed.data.user;
        }
        return parsed.data;
      }
      return parsed;
    }
  } catch (error) {
    return {
      name: value,
    };
  }
  return null;
}
function getInitials(name) {
  if (!name) {
    return "U";
  }
  const cleanName = String(name).trim();
  if (!cleanName) {
    return "U";
  }
  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
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
function initSidebarLogic() {
  const sidebar = document.getElementById("sidebar");
  const sidebarToggle = document.getElementById("sidebarToggle");
  const toggleIcon = document.getElementById("toggleIcon");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const mobileMenuToggle = document.getElementById("mobileMenuToggle");
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
  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
      if (sidebarOverlay) {
        sidebarOverlay.classList.toggle("active");
      }
    });
  }
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("mobile-open");
      sidebarOverlay.classList.remove("active");
    });
  }
}
document.addEventListener("click", (e) => {
  const logoutBtn = e.target.closest(".btn-logout");
  const cancelBtn = e.target.closest("#logoutCancelBtn");
  const confirmBtn = e.target.closest("#logoutConfirmBtn");
  const backdrop = document.getElementById("logoutModalBackdrop");
  if (logoutBtn) {
    e.preventDefault();
    if (backdrop) {
      backdrop.classList.add("active");
    }
  }
  if (cancelBtn) {
    e.preventDefault();
    if (backdrop) {
      backdrop.classList.remove("active");
    }
  }
  if (confirmBtn) {
    e.preventDefault();
    localStorage.removeItem("isLoggedIn");
    window.location.href = "../../homepage/homepage.html";
  }
});
