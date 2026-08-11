document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

/* =========================================================
   STORAGE
   ========================================================= */

const APPOINTMENTS_STORAGE_KEY = "appointments";
const PATIENTS_STORAGE_KEY = "patients";
const TRANSACTIONS_STORAGE_KEY = "transactions";

/* =========================================================
   DASHBOARD INITIALIZATION
   ========================================================= */

function initializeDashboard() {
  updateDateTime();
  setInterval(updateDateTime, 1000);

  renderDashboard();

  setupRefreshButton();
  setupQuickActions();
  setupAppointmentInteractions();
  setupInventoryInteractions();
  setupDentistInteractions();

  // Refresh dashboard when returning to the page
  window.addEventListener("focus", () => {
    renderDashboard();
  });

  // Refresh when localStorage changes from another page/tab
  window.addEventListener("storage", (event) => {
    if (
      event.key === APPOINTMENTS_STORAGE_KEY ||
      event.key === PATIENTS_STORAGE_KEY ||
      event.key === TRANSACTIONS_STORAGE_KEY
    ) {
      renderDashboard();
    }
  });
}

/* =========================================================
   DASHBOARD DATA
   ========================================================= */

const dashboardData = {
  patients: [],
  appointments: [],

  /*
    Dentist information is also used to convert values such as:

    santos
    cruz
    ramos

    into:

    Dr. Santos
    Dr. Cruz
    Dr. Ramos
  */

  dentists: [
    {
      id: 1,
      key: "santos",
      name: "Dr. Santos",
      specialization: "General Dentistry",
      status: "available",
    },
    {
      id: 2,
      key: "reyes",
      name: "Dr. Reyes",
      specialization: "Orthodontics",
      status: "withpatient",
    },
    {
      id: 3,
      key: "garcia",
      name: "Dr. Garcia",
      specialization: "General Dentistry",
      status: "offduty",
    },
    {
      id: 4,
      key: "cruz",
      name: "Dr. Cruz",
      specialization: "General Dentistry",
      status: "available",
    },
    {
      id: 5,
      key: "ramos",
      name: "Dr. Ramos",
      specialization: "Oral Surgery",
      status: "available",
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

  transactions: [],
};

/* =========================================================
   LOAD LOCAL STORAGE DATA
   ========================================================= */

function loadDashboardData() {
  dashboardData.appointments = getStoredAppointments();
  dashboardData.patients = getStoredPatients();
  dashboardData.transactions = getStoredTransactions();
}

/* =========================================================
   APPOINTMENTS FROM APPOINTMENT PAGE
   ========================================================= */

function getStoredAppointments() {
  try {
    const primaryData = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);

    if (!primaryData) {
      return [];
    }

    const parsed = JSON.parse(primaryData);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeDashboardAppointment);
  } catch (error) {
    console.error("Unable to read appointments from localStorage:", error);

    return [];
  }
}

/* =========================================================
   NORMALIZE APPOINTMENT
   ========================================================= */

function normalizeDashboardAppointment(appointment) {
  if (!appointment || typeof appointment !== "object") {
    return {
      id: "",
      patientName: "Unknown Patient",
      dentist: "Unassigned",
      dentistRaw: "",
      service: "Appointment",
      date: "",
      time: "",
      status: "pending",
    };
  }

  /*
    Some Appointment page versions may store information
    directly on the appointment object.

    Others may store it inside:

    appointment.details
    appointment.appointmentDetails

    This checks all common locations.
  */

  const details =
    appointment.appointmentDetails ||
    appointment.details ||
    appointment.appointment_details ||
    {};

  /* =======================================================
     PATIENT NAME
     ======================================================= */

  const patientName =
    appointment.patientName ||
    appointment.patient ||
    appointment.patient_name ||
    appointment.name ||
    appointment.fullName ||
    appointment.full_name ||
    details.patientName ||
    details.patient ||
    details.patient_name ||
    details.name ||
    details.fullName ||
    "Unknown Patient";

  /* =======================================================
     DENTIST
     ======================================================= */

  /*
    IMPORTANT FIX:

    If the Appointment page stores:

      dentist: "santos"

    Dashboard will now convert it to:

      Dr. Santos

    It also supports:

      dentistId
      doctorId
      assignedDentist
      assignedDoctor
      dentistName
      doctorName
  */

  const rawDentist =
    appointment.dentistName ||
    appointment.doctorName ||
    appointment.dentist ||
    appointment.doctor ||
    appointment.assignedDentist ||
    appointment.assignedDoctor ||
    appointment.dentistId ||
    appointment.doctorId ||
    appointment.assignedDentistId ||
    appointment.assignedDoctorId ||
    details.dentistName ||
    details.doctorName ||
    details.dentist ||
    details.doctor ||
    details.assignedDentist ||
    details.assignedDoctor ||
    details.dentistId ||
    details.doctorId ||
    "";

  const dentist = resolveDentistName(rawDentist);

  /* =======================================================
     SERVICE TYPE

     FIX: The Appointment page (appointment.js) saves the
     service under the "type" field (e.g. type: "Consultation"),
     not "service" or "serviceType". That field was never
     being checked, so this always fell through to the
     "Appointment" default. Added appointment.type / details.type.
     ======================================================= */

  const service =
    appointment.serviceType ||
    appointment.service ||
    appointment.service_type ||
    appointment.type ||
    appointment.procedure ||
    appointment.procedureType ||
    appointment.treatment ||
    details.serviceType ||
    details.service ||
    details.service_type ||
    details.type ||
    details.procedure ||
    details.procedureType ||
    details.treatment ||
    "Appointment";

  /* =======================================================
     DATE
     ======================================================= */

  const date =
    appointment.appointmentDate ||
    appointment.appointment_date ||
    appointment.date ||
    details.appointmentDate ||
    details.appointment_date ||
    details.date ||
    "";

  /* =======================================================
     TIME

     FIX: The Appointment page (appointment.js) saves the
     start time under the "start" field (e.g. start: "10:00"),
     not "time" / "startTime" / "start_time". That field was
     never being checked, so this always resolved to "" and
     displayed as "--:--" on the dashboard. Added
     appointment.start / details.start.
     ======================================================= */

  const time =
    appointment.appointmentTime ||
    appointment.appointment_time ||
    appointment.time ||
    appointment.startTime ||
    appointment.start_time ||
    appointment.start ||
    details.appointmentTime ||
    details.appointment_time ||
    details.time ||
    details.startTime ||
    details.start_time ||
    details.start ||
    "";

  /* =======================================================
     STATUS
     ======================================================= */

  const status = appointment.status || details.status || "confirmed";

  return {
    ...appointment,

    id:
      appointment.id ??
      appointment.appointmentId ??
      appointment.appointment_id ??
      details.id ??
      details.appointmentId ??
      "",

    patientName: String(patientName).trim(),

    /*
      Keep both values.
      dentist = display name
      dentistRaw = original Appointment page value
    */
    dentist: String(dentist).trim(),
    dentistRaw: String(rawDentist).trim(),

    service: String(service).trim(),

    date: normalizeAppointmentDate(date),

    time: normalizeAppointmentTime(time),

    status: String(status).toLowerCase().trim(),
  };
}

/* =========================================================
   RESOLVE DENTIST NAME
   ========================================================= */

function resolveDentistName(value) {
  if (!value) {
    return "Unassigned";
  }

  const original = String(value).trim();

  if (!original) {
    return "Unassigned";
  }

  const normalized = original
    .toLowerCase()
    .replace(/^dr\.\s*/i, "")
    .replace(/^dr\s+/i, "")
    .replace(/\s+/g, "")
    .replace(/[-_]/g, "");

  /*
    Check Dashboard dentist list.
  */

  const dentist = dashboardData.dentists.find((doctor) => {
    const doctorName = String(doctor.name || "")
      .toLowerCase()
      .replace(/^dr\.\s*/i, "")
      .replace(/^dr\s+/i, "")
      .replace(/\s+/g, "")
      .replace(/[-_]/g, "");

    const doctorKey = String(doctor.key || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[-_]/g, "");

    const doctorId = String(doctor.id || "")
      .toLowerCase()
      .replace(/\s+/g, "");

    return (
      normalized === doctorName ||
      normalized === doctorKey ||
      normalized === doctorId
    );
  });

  if (dentist) {
    return dentist.name;
  }

  /*
    Additional fallback mapping.

    This specifically handles appointment values
    such as "santos", "cruz", and "ramos".
  */

  const dentistMap = {
    santos: "Dr. Santos",
    msantos: "Dr. Santos",
    drsantos: "Dr. Santos",

    reyes: "Dr. Reyes",
    mreyes: "Dr. Reyes",
    drreyes: "Dr. Reyes",

    garcia: "Dr. Garcia",
    mgarcia: "Dr. Garcia",
    drgarcia: "Dr. Garcia",

    cruz: "Dr. Cruz",
    lcruz: "Dr. Cruz",
    drcruz: "Dr. Cruz",

    ramos: "Dr. Ramos",
    jramos: "Dr. Ramos",
    drramos: "Dr. Ramos",
  };

  if (dentistMap[normalized]) {
    return dentistMap[normalized];
  }

  /*
    If the value already looks like a proper doctor name,
    keep it instead of showing "Unassigned".
  */

  if (
    /^dr\./i.test(original) ||
    /^dr\s/i.test(original) ||
    /^doctor\s/i.test(original)
  ) {
    return original;
  }

  /*
    Last fallback:
    Capitalize the dentist value.

    Example:
      santos -> Santos

    But normally the mapping above will return:
      Dr. Santos
  */

  return capitalizeDentistName(original);
}

function capitalizeDentistName(value) {
  return String(value)
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (!part) return "";

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

/* =========================================================
   PATIENT STORAGE
   ========================================================= */

function getStoredPatients() {
  try {
    const stored = localStorage.getItem(PATIENTS_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read patients:", error);

    return [];
  }
}

/* =========================================================
   TRANSACTION STORAGE
   ========================================================= */

function getStoredTransactions() {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read transactions:", error);

    return [];
  }
}

/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

function renderDashboard() {
  /*
    Always reload the latest Appointment page data.

    This is what connects:

    Appointment Page
           ↓
       localStorage
           ↓
       Dashboard
  */

  loadDashboardData();

  updateSummaryCards();
  renderUpcomingAppointments();
  renderDentistAvailability();
  renderInventoryAlerts();
}

/* =========================================================
   SUMMARY CARDS
   ========================================================= */

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

/* =========================================================
   CLINIC SUMMARY
   ========================================================= */

function updateClinicSummary(todayAppointments) {
  const waitingCount = todayAppointments.filter((appointment) => {
    const status = String(appointment.status).toLowerCase();

    return status === "pending" || status === "waiting";
  }).length;

  const checkedInCount = todayAppointments.filter((appointment) => {
    const status = String(appointment.status).toLowerCase();

    return (
      status === "confirmed" ||
      status === "checkedin" ||
      status === "checked-in"
    );
  }).length;

  const inConsultationCount = todayAppointments.filter((appointment) => {
    const status = String(appointment.status).toLowerCase();

    return status === "inconsultation" || status === "in consultation";
  }).length;

  const completedCount = todayAppointments.filter(
    (appointment) => String(appointment.status).toLowerCase() === "completed",
  ).length;

  setText("summaryWaiting", formatNumber(waitingCount));

  setText("summaryCheckedIn", formatNumber(checkedInCount));

  setText("summaryInConsultation", formatNumber(inConsultationCount));

  setText("summaryCompleted", formatNumber(completedCount));
}

/* =========================================================
   PATIENTS
   ========================================================= */

function getTotalPatients() {
  return dashboardData.patients.length;
}

function updatePatientTrend() {
  const element = document.getElementById("statPatientsTrend");

  if (!element) return;

  element.className = "stat-trend up";

  element.textContent = "Patients in System";
}

/* =========================================================
   TODAY'S APPOINTMENTS
   ========================================================= */

function getTodayAppointments() {
  const today = getTodayDate();

  return dashboardData.appointments.filter(
    (appointment) => normalizeAppointmentDate(appointment.date) === today,
  );
}

function getTodayConfirmedAppointments() {
  const today = getTodayDate();

  return dashboardData.appointments.filter((appointment) => {
    const status = String(appointment.status).toLowerCase();

    return (
      normalizeAppointmentDate(appointment.date) === today &&
      status !== "cancelled" &&
      status !== "canceled" &&
      status !== "no-show" &&
      status !== "noshow"
    );
  });
}

/* =========================================================
   UPCOMING APPOINTMENTS
   ========================================================= */

/*
  IMPORTANT:

  The Dashboard does NOT use any fixed/sample appointment.

  It gets the appointment directly from:

      localStorage["appointments"]

  It only displays appointments scheduled for TODAY.

  Display format:

      Juan Dela Cruz
      Today • 09:00 AM
      Dental Cleaning • Dr. Santos

  Data comes from Appointment Details:

      Patient Name
      Date
      Time
      Service Type
      Assigned Dentist
*/

function renderUpcomingAppointments() {
  const container = document.getElementById("appointmentsList");

  if (!container) return;

  const today = getTodayDate();

  const appointments = dashboardData.appointments
    .filter((appointment) => {
      const appointmentDate = normalizeAppointmentDate(appointment.date);

      const status = String(appointment.status).toLowerCase();

      return (
        appointmentDate === today &&
        status !== "cancelled" &&
        status !== "canceled" &&
        status !== "no-show" &&
        status !== "noshow"
      );
    })
    .sort((a, b) => compareAppointments(a, b))
    .slice(0, 5);

  if (appointments.length === 0) {
    container.innerHTML = createEmptyState(
      "fa-calendar-xmark",
      "No appointments scheduled for today",
    );

    return;
  }

  container.innerHTML = appointments
    .map((appointment) => createAppointmentHTML(appointment))
    .join("");
}

/* =========================================================
   APPOINTMENT HTML
   ========================================================= */

function createAppointmentHTML(appointment) {
  const initials = getInitials(appointment.patientName);

  const statusClass = getAppointmentBadgeClass(appointment.status);

  const statusText = capitalizeFirstLetter(appointment.status);

  /*
    IMPORTANT DISPLAY:

    Patient Name
    Today • Time
    Service Type • Dentist

    Example:

    Juan Dela Cruz
    Today • 09:00 AM
    Dental Cleaning • Dr. Santos
  */

  const displayDate = formatAppointmentDate(appointment.date);

  const displayTime = formatDisplayTime(appointment.time);

  const displayService = appointment.service || "Appointment";

  const displayDentist = appointment.dentist || "Unassigned";

  return `
    <div
      class="appt-item"
      data-appointment-id="${escapeHTML(appointment.id)}"
      role="button"
      tabindex="0"
    >

      <div class="appt-avatar">
        ${escapeHTML(initials)}
      </div>

      <div class="appt-info">

        <div class="appt-name">
          ${escapeHTML(appointment.patientName)}
        </div>

        <div class="appt-meta">

          <strong>
            ${escapeHTML(displayDate)}
          </strong>

          <span> • </span>

          <strong>
            ${escapeHTML(displayTime)}
          </strong>

        </div>

        <div class="appt-service">

          ${escapeHTML(displayService)}

          <span> • </span>

          ${escapeHTML(displayDentist)}

        </div>

      </div>

      <span class="badge ${statusClass}">
        ${escapeHTML(statusText)}
      </span>

    </div>
  `;
}

/* =========================================================
   FORMAT DISPLAY TIME
   ========================================================= */

function formatDisplayTime(value) {
  if (!value) {
    return "--:--";
  }

  const text = String(value).trim();

  /*
    Already formatted:

      09:00 AM
      2:30 PM
  */

  const twelveHourMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    let hour = parseInt(twelveHourMatch[1], 10);

    const minute = twelveHourMatch[2];

    const period = twelveHourMatch[3].toUpperCase();

    return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
  }

  /*
    24-hour format:

      09:00
      14:30

    Convert to:

      09:00 AM
      02:30 PM
  */

  const twentyFourHourMatch = text.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    let hour = parseInt(twentyFourHourMatch[1], 10);

    const minute = twentyFourHourMatch[2];

    const period = hour >= 12 ? "PM" : "AM";

    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
    }

    return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
  }

  return text;
}

/* =========================================================
   DENTIST AVAILABILITY
   ========================================================= */

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
    .map((dentist) => createDentistHTML(dentist))
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
        ${escapeHTML(initials)}
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
  switch (String(status).toLowerCase()) {
    case "available":
      return {
        label: "Available",
        className: "status-available",
      };

    case "withpatient":
    case "with patient":
      return {
        label: "With Patient",
        className: "status-withpatient",
      };

    case "offduty":
    case "off duty":
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

/* =========================================================
   INVENTORY
   ========================================================= */

function renderInventoryAlerts() {
  const container = document.getElementById("inventoryAlerts");

  if (!container) return;

  const alerts = dashboardData.inventory
    .filter(
      (item) =>
        item.status === "low" ||
        item.status === "critical" ||
        item.status === "out",
    )
    .sort(
      (a, b) => getInventoryPriority(b.status) - getInventoryPriority(a.status),
    );

  if (alerts.length === 0) {
    container.innerHTML = createEmptyState(
      "fa-box-open",
      "All inventory levels are normal",
    );

    return;
  }

  container.innerHTML = alerts
    .slice(0, 5)
    .map((item) => createInventoryHTML(item))
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

/* =========================================================
   REVENUE
   ========================================================= */

function getTodayPaidTransactions() {
  const today = getTodayDate();

  return dashboardData.transactions.filter(
    (transaction) =>
      normalizeAppointmentDate(transaction.date) === today &&
      String(transaction.status).toLowerCase() === "paid",
  );
}

function getTodayRevenue() {
  const today = getTodayDate();

  return dashboardData.transactions
    .filter(
      (transaction) =>
        normalizeAppointmentDate(transaction.date) === today &&
        String(transaction.status).toLowerCase() === "paid",
    )
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function getMonthlyRevenue() {
  const currentMonth = getCurrentMonth();

  return dashboardData.transactions
    .filter(
      (transaction) =>
        String(transaction.date).startsWith(currentMonth) &&
        String(transaction.status).toLowerCase() === "paid",
    )
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function updateTodayRevenueTrend(todayPayments) {
  const element = document.getElementById("statTodayRevenueTrend");

  if (!element) return;

  element.className = "stat-trend neutral";

  element.textContent = "Today's collection";
}

function updateMonthlyRevenueTrend() {
  const element = document.getElementById("statMonthlyRevenueTrend");

  if (!element) return;

  const monthName = new Date().toLocaleDateString("en-US", {
    month: "long",
  });

  element.className = "stat-trend up";

  element.innerHTML = `
    <i class="fa-solid fa-calendar"></i>
    ${monthName} revenue
  `;
}

/* =========================================================
   APPOINTMENT TREND
   ========================================================= */

function updateAppointmentTrend(todayAppointments) {
  const element = document.getElementById("statAppointmentsTrend");

  if (!element) return;

  const pendingCount = todayAppointments.filter(
    (appointment) => String(appointment.status).toLowerCase() === "pending",
  ).length;

  if (pendingCount > 0) {
    element.className = "stat-trend neutral";

    element.textContent = `${pendingCount} pending`;
  } else {
    element.className = "stat-trend up";

    element.textContent = "Patients Scheduled Today";
  }
}

/* =========================================================
   DATE / TIME
   ========================================================= */

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

/* =========================================================
   REFRESH
   ========================================================= */

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
      loadDashboardData();

      resolve();
    }, 300);
  });
}

/* =========================================================
   QUICK ACTIONS
   ========================================================= */

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

/* =========================================================
   APPOINTMENT CLICK
   ========================================================= */

function setupAppointmentInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".appt-item");

    if (!item) return;

    const appointmentId = item.dataset.appointmentId;

    openAppointment(appointmentId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const item = event.target.closest(".appt-item");

    if (!item) return;

    event.preventDefault();

    const appointmentId = item.dataset.appointmentId;

    openAppointment(appointmentId);
  });
}

function openAppointment(appointmentId) {
  const appointment = dashboardData.appointments.find(
    (item) => String(item.id) === String(appointmentId),
  );

  if (!appointment) return;

  const appointmentPage = "../appointment/appointment.html";

  const url = `${appointmentPage}?appointmentId=${encodeURIComponent(
    appointmentId,
  )}`;

  window.location.href = url;
}

/* =========================================================
   INVENTORY CLICK
   ========================================================= */

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

/* =========================================================
   DENTIST INTERACTION
   ========================================================= */

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

/* =========================================================
   HELPERS
   ========================================================= */

function createEmptyState(icon, message) {
  return `
    <div class="empty-state">
      <i class="fa-solid ${icon}"></i>
      <p>${escapeHTML(message)}</p>
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

/* =========================================================
   DATE HELPERS
   ========================================================= */

function getTodayDate() {
  return formatDateForComparison(new Date());
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

/* =========================================================
   NORMALIZE APPOINTMENT DATE
   ========================================================= */

function normalizeAppointmentDate(value) {
  if (!value) return "";

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  /*
    Handle Date strings such as:

      August 11, 2026
      2026-08-11T00:00:00
  */

  const text = String(value).trim();

  /*
    Prevent timezone conversion
    for YYYY-MM-DD values.
  */

  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatDateForComparison(date);
}

/* =========================================================
   NORMALIZE TIME
   ========================================================= */

function normalizeAppointmentTime(value) {
  if (!value) return "";

  return String(value).trim();
}

/* =========================================================
   FORMAT APPOINTMENT DATE
   ========================================================= */

function formatAppointmentDate(dateString) {
  if (!dateString) {
    return "No date";
  }

  const normalized = normalizeAppointmentDate(dateString);

  const today = getTodayDate();

  const tomorrow = getTomorrowDate();

  if (normalized === today) {
    return "Today";
  }

  if (normalized === tomorrow) {
    return "Tomorrow";
  }

  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* =========================================================
   SORT APPOINTMENTS
   ========================================================= */

function compareAppointments(a, b) {
  const dateA = getAppointmentTimestamp(a);

  const dateB = getAppointmentTimestamp(b);

  return dateA - dateB;
}

function getAppointmentTimestamp(appointment) {
  const date = normalizeAppointmentDate(appointment.date);

  const time = convertTimeTo24Hour(appointment.time);

  const timestamp = new Date(`${date}T${time}:00`).getTime();

  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

/* =========================================================
   CONVERT TIME
   ========================================================= */

function convertTimeTo24Hour(time) {
  if (!time) {
    return "00:00";
  }

  const text = String(time).trim();

  /*
    Handles:

      9:00 AM
      09:00 AM
      2:30 PM
      02:30 PM
  */

  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    /*
      Also handle 24-hour values:

        09:00
        14:30
    */

    if (/^\d{1,2}:\d{2}$/.test(text)) {
      return text;
    }

    return "00:00";
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

/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(name) {
  if (!name) return "?";

  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* =========================================================
   STATUS
   ========================================================= */

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
    case "canceled":
      return "badge-cancelled";

    case "checkedin":
    case "checked-in":
      return "badge-checkedin";

    default:
      return "badge-pending";
  }
}

/* =========================================================
   SECURITY
   ========================================================= */

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

/* =========================================================
   GLOBAL DASHBOARD API
   ========================================================= */

window.DentalClinicDashboard = {
  data: dashboardData,

  refresh: () => {
    loadDashboardData();
    renderDashboard();
  },

  update: () => {
    loadDashboardData();
    renderDashboard();
  },

  getTodayAppointments,

  getTodayRevenue,

  getMonthlyRevenue,

  getTotalPatients,
};
