document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

const dashboardData = {
  patients: [
    {
      id: 1,
      firstName: "Juan",
      lastName: "Dela Cruz",
      phone: "09171234567",
      status: "active",
    },
    {
      id: 2,
      firstName: "Maria",
      lastName: "Santos",
      phone: "09181234567",
      status: "active",
    },
    {
      id: 3,
      firstName: "Carlos",
      lastName: "Reyes",
      phone: "09191234567",
      status: "active",
    },
    {
      id: 4,
      firstName: "Angela",
      lastName: "Garcia",
      phone: "09201234567",
      status: "active",
    },
  ],
  appointments: [
    {
      id: 1,
      patientName: "Juan Dela Cruz",
      dentist: "Dr. Santos",
      service: "Dental Cleaning",
      date: getTodayDate(),
      time: "09:00 AM",
      status: "confirmed",
    },
    {
      id: 2,
      patientName: "Maria Santos",
      dentist: "Dr. Reyes",
      service: "Tooth Extraction",
      date: getTodayDate(),
      time: "10:30 AM",
      status: "confirmed",
    },
    {
      id: 3,
      patientName: "Carlos Reyes",
      dentist: "Dr. Santos",
      service: "Dental Filling",
      date: getTodayDate(),
      time: "01:00 PM",
      status: "confirmed",
    },
    {
      id: 4,
      patientName: "Angela Garcia",
      dentist: "Dr. Garcia",
      service: "Oral Examination",
      date: getTomorrowDate(),
      time: "09:30 AM",
      status: "confirmed",
    },
  ],
  dentists: [
    {
      id: 1,
      name: "Dr. Santos",
      specialization: "General Dentistry",
      status: "available",
    },
    {
      id: 2,
      name: "Dr. Reyes",
      specialization: "Orthodontics",
      status: "withpatient",
    },
    {
      id: 3,
      name: "Dr. Garcia",
      specialization: "General Dentistry",
      status: "offduty",
    },
  ],
  inventory: [
    {
      id: 1,
      name: "Dental Gloves",
      quantity: 8,
      minimum: 20,
      status: "low",
    },
    {
      id: 2,
      name: "Face Masks",
      quantity: 5,
      minimum: 20,
      status: "critical",
    },
    {
      id: 3,
      name: "Composite Resin",
      quantity: 0,
      minimum: 5,
      status: "out",
    },
  ],
  transactions: [
    {
      id: 1,
      appointmentId: 1,
      amount: 800,
      date: getTodayDate(),
      status: "paid",
    },
    {
      id: 2,
      appointmentId: 2,
      amount: 1500,
      date: getTodayDate(),
      status: "paid",
    },
    {
      id: 3,
      appointmentId: 3,
      amount: 1000,
      date: getTodayDate(),
      status: "paid",
    },
  ],
};

function initializeDashboard() {
  updateDateTime();
  setInterval(updateDateTime, 1000);
  renderDashboard();
  setupRefreshButton();
  setupQuickActions();
  setupAppointmentInteractions();
  setupInventoryInteractions();
  setupDentistInteractions();
}

function renderDashboard() {
  updateSummaryCards();
  renderUpcomingAppointments();
  renderDentistAvailability();
  renderInventoryAlerts();
}

function updateSummaryCards() {
  const totalPatients = getTotalPatients();
  const todayAppointments = getTodayAppointments();
  const confirmedTodayAppointments = getTodayConfirmedAppointments();
  const todayPayments = getTodayPaidTransactions();
  const todayRevenueTotal = getTodayRevenue();
  const monthlyRevenue = getMonthlyRevenue();

  setText("statTotalPatients", formatNumber(totalPatients));
  setText(
    "statTodayAppointments",
    formatNumber(confirmedTodayAppointments.length),
  );
  setText("statTodayRevenue", formatCurrency(todayRevenueTotal));
  setText("statMonthlyRevenue", formatCurrency(monthlyRevenue));

  updatePatientTrend();
  updateAppointmentTrend(todayAppointments);
  updateTodayRevenueTrend(todayPayments);
  updateMonthlyRevenueTrend();
  updateClinicSummary(todayAppointments);
}

function updateClinicSummary(todayAppointments) {
  const waitingCount = todayAppointments.filter(
    (appointment) => appointment.status.toLowerCase() === "pending",
  ).length;
  const checkedInCount = todayAppointments.filter(
    (appointment) => appointment.status.toLowerCase() === "confirmed",
  ).length;
  const inConsultationCount = todayAppointments.filter(
    (appointment) => appointment.status.toLowerCase() === "inconsultation",
  ).length;
  const completedCount = todayAppointments.filter(
    (appointment) => appointment.status.toLowerCase() === "completed",
  ).length;

  setText("summaryWaiting", formatNumber(waitingCount));
  setText("summaryCheckedIn", formatNumber(checkedInCount));
  setText("summaryInConsultation", formatNumber(inConsultationCount));
  setText("summaryCompleted", formatNumber(completedCount));
}

function getTotalPatients() {
  return dashboardData.patients.length;
}

function updatePatientTrend() {
  const element = document.getElementById("statPatientsTrend");
  if (!element) return;
  element.className = "stat-trend up";
  element.innerHTML = `
     Patients in System
  `;
}

function getTodayAppointments() {
  const today = getTodayDate();
  return dashboardData.appointments.filter(
    (appointment) => appointment.date === today,
  );
}

function getTodayConfirmedAppointments() {
  const today = getTodayDate();
  return dashboardData.appointments.filter(
    (appointment) =>
      appointment.date === today &&
      appointment.status.toLowerCase() === "confirmed",
  );
}

function getTodayPaidTransactions() {
  const today = getTodayDate();
  return dashboardData.transactions.filter(
    (transaction) =>
      transaction.date === today && transaction.status.toLowerCase() === "paid",
  );
}

function updateAppointmentTrend(todayAppointments) {
  const element = document.getElementById("statAppointmentsTrend");
  if (!element) return;
  const pendingCount = todayAppointments.filter(
    (appointment) => appointment.status.toLowerCase() === "pending",
  ).length;
  if (pendingCount > 0) {
    element.className = "stat-trend neutral";
    element.innerHTML = `
      ${pendingCount} pending
    `;
  } else {
    element.className = "stat-trend up";
    element.innerHTML = `
      Confirmed Today
    `;
  }
}

function getTodayRevenue() {
  const today = getTodayDate();
  return dashboardData.transactions
    .filter(
      (transaction) =>
        transaction.date === today &&
        transaction.status.toLowerCase() === "paid",
    )
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function getMonthlyRevenue() {
  const currentMonth = getCurrentMonth();
  return dashboardData.transactions
    .filter((transaction) => {
      return (
        transaction.date.startsWith(currentMonth) &&
        transaction.status.toLowerCase() === "paid"
      );
    })
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function updateTodayRevenueTrend(todayPayments) {
  const element = document.getElementById("statTodayRevenueTrend");
  if (!element) return;
  element.className = "stat-trend neutral";
  element.innerHTML = `
    Today's Revenue
  `;
}

function updateMonthlyRevenueTrend() {
  const element = document.getElementById("statMonthlyRevenueTrend");
  if (!element) return;
  const monthName = new Date().toLocaleDateString("en-US", {
    month: "long",
  });
  element.className = "stat-trend neutral";
  element.innerHTML = `
    ${monthName} revenue
  `;
}

function renderUpcomingAppointments() {
  const container = document.getElementById("appointmentsList");
  if (!container) return;
  const appointments = [...dashboardData.appointments]
    .filter((appointment) => {
      return appointment.status.toLowerCase() === "confirmed";
    })
    .sort((a, b) => {
      return compareAppointments(a, b);
    })
    .slice(0, 5);
  if (appointments.length === 0) {
    container.innerHTML = createEmptyState(
      "fa-calendar-xmark",
      "No upcoming appointments",
    );
    return;
  }
  container.innerHTML = appointments
    .map((appointment) => {
      return createAppointmentHTML(appointment);
    })
    .join("");
}

function createAppointmentHTML(appointment) {
  const initials = getInitials(appointment.patientName);
  const statusClass = getAppointmentBadgeClass(appointment.status);
  const statusText = capitalizeFirstLetter(appointment.status);
  const appointmentDate = formatAppointmentDate(appointment.date);
  return `
    <div
      class="appt-item"
      data-appointment-id="${appointment.id}"
      role="button"
      tabindex="0"
    >
      <div class="appt-avatar">
        ${initials}
      </div>
      <div class="appt-info">
        <div class="appt-name">
          ${escapeHTML(appointment.patientName)}
        </div>
        <div class="appt-meta">
          <strong>${appointmentDate}</strong>
          • ${escapeHTML(appointment.time)}
        </div>
        <div class="appt-service">
          ${escapeHTML(appointment.service)}
          • ${escapeHTML(appointment.dentist)}
        </div>
      </div>
      <span class="badge ${statusClass}">
        ${statusText}
      </span>
    </div>
  `;
}

function renderDentistAvailability() {
  const container = document.getElementById("dentistList");
  if (!container) return;
  if (dashboardData.dentists.length === 0) {
    container.innerHTML = createEmptyState(
      "fa-user-doctor",
      "No dentist information available",
    );
    return;
  }
  container.innerHTML = dashboardData.dentists
    .map((dentist) => {
      return createDentistHTML(dentist);
    })
    .join("");
}

function createDentistHTML(dentist) {
  const statusInfo = getDentistStatus(dentist.status);
  const initials = getInitials(dentist.name);
  return `
    <div
      class="dentist-item"
      data-dentist-id="${dentist.id}"
      role="button"
      tabindex="0"
    >
      <div class="dentist-avatar">
        ${initials}
      </div>
      <div class="dentist-info">
        <div class="dentist-name">
          ${escapeHTML(dentist.name)}
        </div>
        <div class="dentist-spec">
          ${escapeHTML(dentist.specialization)}
        </div>
      </div>
      <span class="badge ${statusInfo.className}">
        <span class="status-dot"></span>
        ${statusInfo.label}
      </span>
    </div>
  `;
}

function getDentistStatus(status) {
  switch (status) {
    case "available":
      return {
        label: "Available",
        className: "status-available",
      };
    case "withpatient":
      return {
        label: "With Patient",
        className: "status-withpatient",
      };
    case "offduty":
      return {
        label: "Off Duty",
        className: "status-offduty",
      };
    default:
      return {
        label: "Unknown",
        className: "status-offduty",
      };
  }
}

function renderInventoryAlerts() {
  const container = document.getElementById("inventoryAlerts");
  if (!container) return;
  const alerts = dashboardData.inventory
    .filter((item) => {
      return (
        item.status === "low" ||
        item.status === "critical" ||
        item.status === "out"
      );
    })
    .sort((a, b) => {
      return getInventoryPriority(b.status) - getInventoryPriority(a.status);
    });
  if (alerts.length === 0) {
    container.innerHTML = createEmptyState(
      "fa-box-open",
      "All inventory levels are normal",
    );
    return;
  }
  container.innerHTML = alerts
    .slice(0, 5)
    .map((item) => {
      return createInventoryHTML(item);
    })
    .join("");
}

function createInventoryHTML(item) {
  const status = getInventoryStatus(item.status);
  return `
    <div
      class="inv-item"
      data-inventory-id="${item.id}"
      role="button"
      tabindex="0"
    >
      <div
        style="
          display:flex;
          align-items:center;
          gap:12px;
          min-width:0;
        "
      >
        <div class="inv-icon">
          <i class="fa-solid ${status.icon}"></i>
        </div>
        <div>
          <div class="inv-name">
            ${escapeHTML(item.name)}
          </div>
          <div class="inv-sub">
            ${item.quantity} remaining
            • Minimum: ${item.minimum}
          </div>
        </div>
      </div>
      <span class="badge ${status.className}">
        ${status.label}
      </span>
    </div>
  `;
}

function getInventoryStatus(status) {
  switch (status) {
    case "low":
      return {
        label: "Low Stock",
        className: "status-low",
        icon: "fa-triangle-exclamation",
      };
    case "critical":
      return {
        label: "Critical",
        className: "status-critical",
        icon: "fa-circle-exclamation",
      };
    case "out":
      return {
        label: "Out of Stock",
        className: "status-out",
        icon: "fa-circle-xmark",
      };
    default:
      return {
        label: "Normal",
        className: "badge-confirmed",
        icon: "fa-circle-check",
      };
  }
}

function getInventoryPriority(status) {
  switch (status) {
    case "out":
      return 3;
    case "critical":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

function updateDateTime() {
  const now = new Date();
  const dateElement = document.getElementById("currentDate");
  const timeElement = document.getElementById("currentTime");
  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (timeElement) {
    timeElement.textContent = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}

function setupRefreshButton() {
  const refreshButton = document.querySelector(".btn-refresh-pill");
  if (!refreshButton) return;
  refreshButton.addEventListener("click", async () => {
    if (refreshButton.classList.contains("spinning")) {
      return;
    }
    refreshButton.classList.add("spinning");
    refreshButton.disabled = true;
    try {
      await refreshDashboardData();
      renderDashboard();
      showDashboardNotification("Dashboard updated successfully.", "success");
    } catch (error) {
      console.error("Dashboard refresh failed:", error);
      showDashboardNotification("Unable to refresh dashboard.", "error");
    } finally {
      setTimeout(() => {
        refreshButton.classList.remove("spinning");
        refreshButton.disabled = false;
      }, 500);
    }
  });
}

async function refreshDashboardData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 500);
  });
}

function setupQuickActions() {
  const quickActionButtons = document.querySelectorAll(".qa-btn, .qa-btn-pill");
  quickActionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.target || button.getAttribute("data-page");
      if (target) {
        navigateTo(target);
      }
    });
  });
}

function navigateTo(target) {
  if (!target) return;
  window.location.href = target;
}

function setupAppointmentInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".appt-item");
    if (!item) return;
    const appointmentId = Number(item.dataset.appointmentId);
    openAppointment(appointmentId);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const item = event.target.closest(".appt-item");
    if (!item) return;
    event.preventDefault();
    const appointmentId = Number(item.dataset.appointmentId);
    openAppointment(appointmentId);
  });
}

function openAppointment(appointmentId) {
  const appointment = dashboardData.appointments.find(
    (item) => item.id === appointmentId,
  );
  if (!appointment) return;
  const appointmentPage = "../appointment/appointment.html";
  const url = `${appointmentPage}?appointmentId=${encodeURIComponent(
    appointmentId,
  )}`;
  window.location.href = url;
}

function setupInventoryInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".inv-item");
    if (!item) return;
    const inventoryId = Number(item.dataset.inventoryId);
    openInventoryItem(inventoryId);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    const item = event.target.closest(".inv-item");
    if (!item) return;
    event.preventDefault();
    const inventoryId = Number(item.dataset.inventoryId);
    openInventoryItem(inventoryId);
  });
}

function openInventoryItem(inventoryId) {
  const inventoryItem = dashboardData.inventory.find(
    (item) => item.id === inventoryId,
  );
  if (!inventoryItem) return;
  const inventoryPage = "../inventory/inventory.html";
  const url = `${inventoryPage}?inventoryId=${encodeURIComponent(inventoryId)}`;
  window.location.href = url;
}

function setupDentistInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".dentist-item");
    if (!item) return;
    const dentistId = Number(item.dataset.dentistId);
    const dentist = dashboardData.dentists.find(
      (doctor) => doctor.id === dentistId,
    );
    if (!dentist) return;
    console.log("Selected dentist:", dentist);
  });
}

function createEmptyState(icon, message) {
  return `
    <div class="empty-state">
      <i class="fa-solid ${icon}"></i>
      <p>
        ${escapeHTML(message)}
      </p>
    </div>
  `;
}

function showDashboardNotification(message, type = "success") {
  const existing = document.querySelector(".dashboard-notification");
  if (existing) {
    existing.remove();
  }
  const notification = document.createElement("div");
  notification.className = `dashboard-notification ${type}`;
  const icon = type === "success" ? "fa-circle-check" : "fa-circle-exclamation";
  notification.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span>${escapeHTML(message)}</span>
  `;
  document.body.appendChild(notification);
  requestAnimationFrame(() => {
    notification.classList.add("show");
  });
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      notification.remove();
    }, 250);
  }, 2500);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function formatNumber(number) {
  return Number(number || 0).toLocaleString("en-US");
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  });
}

function getTodayDate() {
  const now = new Date();
  return formatDateForComparison(now);
}

function getTomorrowDate() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateForComparison(tomorrow);
}

function getCurrentMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDateForComparison(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAppointmentDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  const today = getTodayDate();
  const tomorrow = getTomorrowDate();
  if (dateString === today) {
    return "Today";
  }
  if (dateString === tomorrow) {
    return "Tomorrow";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function compareAppointments(a, b) {
  const dateA = new Date(`${a.date} ${convertTimeTo24Hour(a.time)}`).getTime();
  const dateB = new Date(`${b.date} ${convertTimeTo24Hour(b.time)}`).getTime();
  return dateA - dateB;
}

function convertTimeTo24Hour(time) {
  if (!time) return "00:00";
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return time;
  }
  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const period = match[3].toUpperCase();
  if (period === "PM" && hour !== 12) {
    hour += 12;
  }
  if (period === "AM" && hour === 12) {
    hour = 0;
  }
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function capitalizeFirstLetter(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function getAppointmentBadgeClass(status) {
  switch (String(status).toLowerCase()) {
    case "confirmed":
      return "badge-confirmed";
    case "pending":
      return "badge-pending";
    case "completed":
      return "badge-completed";
    case "cancelled":
      return "badge-cancelled";
    default:
      return "badge-pending";
  }
}

function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.DentalClinicDashboard = {
  data: dashboardData,
  refresh: () => {
    renderDashboard();
  },
  update: () => {
    renderDashboard();
  },
  getTodayAppointments,
  getTodayRevenue,
  getMonthlyRevenue,
  getTotalPatients,
};
