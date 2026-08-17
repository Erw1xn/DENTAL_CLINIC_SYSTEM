document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

const APPOINTMENTS_STORAGE_KEY = "appointments";
const PATIENTS_STORAGE_KEY = "dentanueva_patients";
const TRANSACTIONS_STORAGE_KEY = "transactions";
const INVENTORY_STORAGE_KEY = "dentanueva_inventory_items";

function initializeDashboard() {
  updateDateTime();

  setInterval(updateDateTime, 1000);

  renderDashboard();

  setupRefreshButton();
  setupQuickActions();
  setupAppointmentInteractions();
  setupInventoryInteractions();
  setupDentistInteractions();

  window.addEventListener("focus", () => {
    renderDashboard();
  });

  window.addEventListener("storage", (event) => {
    if (
      event.key === APPOINTMENTS_STORAGE_KEY ||
      event.key === PATIENTS_STORAGE_KEY ||
      event.key === TRANSACTIONS_STORAGE_KEY ||
      event.key === INVENTORY_STORAGE_KEY
    ) {
      renderDashboard();
    }
  });

  window.addEventListener("inventory:data-changed", () => {
    renderDashboard();
  });

  window.addEventListener("appointmentStatusChanged", () => {
    renderDashboard();
  });

  window.addEventListener("appointmentsUpdated", () => {
    renderDashboard();
  });

  window.addEventListener("patientsUpdated", () => {
    renderDashboard();
  });

  window.addEventListener("patientAdded", () => {
    renderDashboard();
  });

  window.addEventListener("patientUpdated", () => {
    renderDashboard();
  });

  window.addEventListener("patientDeleted", () => {
    renderDashboard();
  });
}

const dashboardData = {
  patients: [],

  appointments: [],

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

  inventory: [],

  transactions: [],
};

function loadDashboardData() {
  dashboardData.appointments = getStoredAppointments();

  dashboardData.patients = getStoredPatients();

  dashboardData.inventory = getStoredInventory();

  dashboardData.transactions = getStoredTransactions();
}

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
      status: "scheduled",
    };
  }

  const details =
    appointment.appointmentDetails ||
    appointment.details ||
    appointment.appointment_details ||
    {};

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

  const date =
    appointment.appointmentDate ||
    appointment.appointment_date ||
    appointment.date ||
    details.appointmentDate ||
    details.appointment_date ||
    details.date ||
    "";

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

  const rawStatus = appointment.status || details.status || "scheduled";

  const status = normalizeAppointmentStatus(rawStatus);

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

    dentist: String(dentist).trim(),

    dentistRaw: String(rawDentist).trim(),

    service: String(service).trim(),

    date: normalizeAppointmentDate(date),

    time: normalizeAppointmentTime(time),

    status,
  };
}

function normalizeAppointmentStatus(status) {
  const value = String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");

  if (
    value === "" ||
    value === "scheduled" ||
    value === "schedule" ||
    value === "waiting" ||
    value === "pending" ||
    value === "confirmed"
  ) {
    return "scheduled";
  }

  if (
    value === "checkedin" ||
    value === "checked in" ||
    value === "check in" ||
    value === "check-in"
  ) {
    return "checkedin";
  }

  if (value === "in consultation" || value === "inconsultation") {
    return "in consultation";
  }

  if (
    value === "complete" ||
    value === "ready complete" ||
    value === "readycomplete"
  ) {
    return "complete";
  }

  if (value === "completed" || value === "done") {
    return "completed";
  }

  if (value === "cancelled" || value === "canceled") {
    return "cancelled";
  }

  if (value === "no show" || value === "noshow") {
    return "no-show";
  }

  return "scheduled";
}

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

  if (
    /^dr\./i.test(original) ||
    /^dr\s/i.test(original) ||
    /^doctor\s/i.test(original)
  ) {
    return original;
  }

  return capitalizeDentistName(original);
}

function capitalizeDentistName(value) {
  return String(value)
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (!part) {
        return "";
      }

      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
}

function getStoredPatients() {
  const primaryPatients = readLocalStorageJSON(PATIENTS_STORAGE_KEY);

  if (primaryPatients === null) {
    return [];
  }

  const patients = extractPatientCollection(primaryPatients);

  return removeDuplicatePatients(patients);
}

function readLocalStorageJSON(key) {
  try {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return null;
    }

    return JSON.parse(stored);
  } catch (error) {
    console.error(`Unable to read "${key}" from localStorage:`, error);

    return null;
  }
}

function extractPatientCollection(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data.filter(isPatientRecord);
  }

  if (typeof data !== "object") {
    return [];
  }

  const preferredProperties = [
    "patients",
    "patientRecords",
    "patient_records",
    "patientList",
    "patientsList",
    "records",
    "data",
    "items",
    "list",
  ];

  for (const property of preferredProperties) {
    if (Array.isArray(data[property])) {
      const patients = data[property].filter(isPatientRecord);

      if (patients.length > 0) {
        return patients;
      }

      if (data[property].length === 0) {
        return [];
      }
    }
  }

  const objectValues = Object.values(data);

  const directPatientValues = objectValues.filter(isPatientRecord);

  if (directPatientValues.length > 0) {
    return directPatientValues;
  }

  let bestNestedCollection = [];

  for (const value of objectValues) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const nestedPatients = extractPatientCollection(value);

    if (nestedPatients.length > bestNestedCollection.length) {
      bestNestedCollection = nestedPatients;
    }
  }

  return bestNestedCollection;
}

function isPatientRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return false;
  }

  const patientFields = [
    "patientId",
    "patientID",
    "patient_id",
    "id",
    "firstName",
    "first_name",
    "lastName",
    "last_name",
    "fullName",
    "full_name",
    "name",
    "dob",
    "dateOfBirth",
    "date_of_birth",
    "birthDate",
    "birth_date",
    "contact",
    "phone",
    "email",
  ];

  return patientFields.some((field) => {
    return (
      Object.prototype.hasOwnProperty.call(record, field) &&
      record[field] !== null &&
      record[field] !== undefined &&
      String(record[field]).trim() !== ""
    );
  });
}

function removeDuplicatePatients(patients) {
  const unique = [];
  const seen = new Set();

  patients.forEach((patient) => {
    if (!patient || typeof patient !== "object") {
      return;
    }

    const identity = getPatientIdentity(patient);

    if (seen.has(identity)) {
      return;
    }

    seen.add(identity);
    unique.push(patient);
  });

  return unique;
}

function getPatientIdentity(patient) {
  const patientId =
    patient.patientId ??
    patient.patientID ??
    patient.patient_id ??
    patient.id ??
    patient.recordId ??
    patient.recordID ??
    patient.record_id ??
    "";

  if (String(patientId).trim() !== "") {
    return `id:${String(patientId).trim().toLowerCase()}`;
  }

  const firstName = patient.firstName ?? patient.first_name ?? "";

  const lastName = patient.lastName ?? patient.last_name ?? "";

  const fullName = patient.fullName ?? patient.full_name ?? patient.name ?? "";

  const dob =
    patient.dob ??
    patient.dateOfBirth ??
    patient.date_of_birth ??
    patient.birthDate ??
    patient.birth_date ??
    "";

  const fallbackIdentity = `${firstName}|${lastName}|${fullName}|${dob}`
    .trim()
    .toLowerCase();

  if (fallbackIdentity.replace(/\|/g, "") !== "") {
    return `profile:${fallbackIdentity}`;
  }

  return `record:${JSON.stringify(patient)}`;
}

function getStoredInventory() {
  try {
    const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item === "object")
      .map((item) => {
        const stock = Number(item.stock) || 0;

        const minimum = Number(item.minimum) || 0;

        let status = "normal";

        if (stock <= 0) {
          status = "out";
        } else if (stock <= minimum) {
          status = "low";
        }

        return {
          ...item,
          stock,
          minimum,
          status,
        };
      });
  } catch (error) {
    console.error("Unable to read inventory from localStorage:", error);

    return [];
  }
}

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

function renderDashboard() {
  loadDashboardData();

  updateSummaryCards();

  renderUpcomingAppointments();

  renderDentistAvailability();

  renderInventoryAlerts();
}

function updateSummaryCards() {
  const totalPatients = getTotalPatients();

  const todayAppointments = getTodayAppointments();

  const todayPayments = getTodayPaidTransactions();

  const todayRevenueTotal = getTodayRevenue();

  const monthlyRevenue = getMonthlyRevenue();

  const activeTodayAppointments = todayAppointments.filter(
    (appointment) => !isExcludedFromToday(appointment.status),
  );

  setText("statTotalPatients", formatNumber(totalPatients));

  setText(
    "statTodayAppointments",
    formatNumber(activeTodayAppointments.length),
  );

  setText("statTodayRevenue", formatCurrency(todayRevenueTotal));

  setText("statMonthlyRevenue", formatCurrency(monthlyRevenue));

  updatePatientTrend();

  updateAppointmentTrend(activeTodayAppointments);

  updateTodayRevenueTrend(todayPayments);

  updateMonthlyRevenueTrend();

  updateClinicSummary(todayAppointments);
}

function updateClinicSummary(todayAppointments) {
  const scheduledCount = todayAppointments.filter(
    (appointment) => appointment.status === "scheduled",
  ).length;

  const checkedInCount = todayAppointments.filter(
    (appointment) =>
      appointment.status === "checkedin" ||
      appointment.status === "in consultation",
  ).length;

  const inConsultationCount = todayAppointments.filter(
    (appointment) => appointment.status === "in consultation",
  ).length;

  const completedCount = todayAppointments.filter(
    (appointment) => appointment.status === "completed",
  ).length;

  setText("summaryScheduled", formatNumber(scheduledCount));

  setText("summaryCheckedIn", formatNumber(checkedInCount));

  setText("summaryInConsultation", formatNumber(inConsultationCount));

  setText("summaryCompleted", formatNumber(completedCount));
}

function getTotalPatients() {
  return Array.isArray(dashboardData.patients)
    ? dashboardData.patients.length
    : 0;
}

function updatePatientTrend() {
  const element = document.getElementById("statPatientsTrend");

  if (!element) {
    return;
  }

  element.className = "stat-trend up";

  element.textContent = "Patients in System";
}

function getTodayAppointments() {
  const today = getTodayDate();

  return dashboardData.appointments.filter(
    (appointment) => normalizeAppointmentDate(appointment.date) === today,
  );
}

function isExcludedFromToday(status) {
  const normalized = normalizeAppointmentStatus(status);

  return normalized === "cancelled" || normalized === "no-show";
}

function renderUpcomingAppointments() {
  const container = document.getElementById("appointmentsList");

  if (!container) {
    return;
  }

  const today = getTodayDate();

  const appointments = dashboardData.appointments
    .filter((appointment) => {
      const appointmentDate = normalizeAppointmentDate(appointment.date);

      return (
        appointmentDate === today && !isExcludedFromToday(appointment.status)
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

function createAppointmentHTML(appointment) {
  const initials = getInitials(appointment.patientName);

  const statusClass = getAppointmentBadgeClass(appointment.status);

  const statusText = getAppointmentStatusLabel(appointment.status);

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

function getAppointmentStatusLabel(status) {
  switch (normalizeAppointmentStatus(status)) {
    case "scheduled":
      return "Scheduled";

    case "checkedin":
      return "Checked In";

    case "in consultation":
      return "In Consultation";

    case "complete":
      return "Complete";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "no-show":
      return "No Show";

    default:
      return "Scheduled";
  }
}

function formatDisplayTime(value) {
  if (!value) {
    return "--:--";
  }

  const text = String(value).trim();

  const twelveHourMatch = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    const hour = parseInt(twelveHourMatch[1], 10);

    const minute = twelveHourMatch[2];

    const period = twelveHourMatch[3].toUpperCase();

    return `${String(hour).padStart(2, "0")}:${minute} ${period}`;
  }

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

function renderDentistAvailability() {
  const container = document.getElementById("dentistList");

  if (!container) {
    return;
  }

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

      <span
        class="dentist-status ${statusInfo.className}"
      >

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

function renderInventoryAlerts() {
  const container = document.getElementById("inventoryAlerts");

  if (!container) {
    return;
  }

  const alerts = dashboardData.inventory
    .filter((item) => {
      const status = getInventoryStatus(item.status);

      return (
        status.key === "low" ||
        status.key === "critical" ||
        status.key === "out"
      );
    })
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

  const quantity = Number(item.stock) || 0;

  const minimum = Number(item.minimum) || 0;

  return `
    <div
      class="inv-item"
      data-inventory-id="${escapeHTML(item.id)}"
      role="button"
      tabindex="0"
    >

      <div class="inv-left">

        <div class="inv-icon">
          <i class="fa-solid ${status.icon}"></i>
        </div>

        <div class="inv-info">

          <div class="inv-name">
            ${escapeHTML(item.name)}
          </div>

          <div class="inv-sub">
            ${quantity} remaining
            • Minimum: ${minimum}
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
  switch (String(status || "").toLowerCase()) {
    case "low":
      return {
        key: "low",
        label: "Low Stock",
        className: "status-low",
        icon: "fa-triangle-exclamation",
      };

    case "critical":
      return {
        key: "critical",
        label: "Critical",
        className: "status-critical",
        icon: "fa-circle-exclamation",
      };

    case "out":
      return {
        key: "out",
        label: "Out of Stock",
        className: "status-out",
        icon: "fa-circle-xmark",
      };

    default:
      return {
        key: "normal",
        label: "Normal",
        className: "badge-confirmed",
        icon: "fa-circle-check",
      };
  }
}

function getInventoryPriority(status) {
  switch (String(status || "").toLowerCase()) {
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

function updateTodayRevenueTrend() {
  const element = document.getElementById("statTodayRevenueTrend");

  if (!element) {
    return;
  }

  element.className = "stat-trend neutral";

  element.textContent = "Today's collection";
}

function updateMonthlyRevenueTrend() {
  const element = document.getElementById("statMonthlyRevenueTrend");

  if (!element) {
    return;
  }

  const monthName = new Date().toLocaleDateString("en-US", {
    month: "long",
  });

  element.className = "stat-trend up";

  element.innerHTML = `
    <i class="fa-solid fa-calendar"></i>
    ${escapeHTML(monthName)} revenue
  `;
}

function updateAppointmentTrend(todayAppointments) {
  const element = document.getElementById("statAppointmentsTrend");

  if (!element) {
    return;
  }

  if (todayAppointments.length === 0) {
    element.className = "stat-trend neutral";

    element.textContent = "No Appointments Today";

    return;
  }

  const scheduledCount = todayAppointments.filter(
    (appointment) => appointment.status === "scheduled",
  ).length;

  if (scheduledCount > 0) {
    element.className = "stat-trend neutral";

    element.textContent = `${scheduledCount} scheduled`;
  } else {
    element.className = "stat-trend up";

    element.textContent = "Patients Scheduled Today";
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

  if (!refreshButton) {
    return;
  }

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
  if (!target) {
    return;
  }

  window.location.href = target;
}

function setupAppointmentInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".appt-item");

    if (!item) {
      return;
    }

    const appointmentId = item.dataset.appointmentId;

    openAppointment(appointmentId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const item = event.target.closest(".appt-item");

    if (!item) {
      return;
    }

    event.preventDefault();

    const appointmentId = item.dataset.appointmentId;

    openAppointment(appointmentId);
  });
}

function openAppointment(appointmentId) {
  const appointment = dashboardData.appointments.find(
    (item) => String(item.id) === String(appointmentId),
  );

  if (!appointment) {
    return;
  }

  const appointmentPage = "../appointment/appointment.html";

  const url =
    `${appointmentPage}?appointmentId=` +
    `${encodeURIComponent(appointmentId)}`;

  window.location.href = url;
}

function setupInventoryInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".inv-item");

    if (!item) {
      return;
    }

    const inventoryId = item.dataset.inventoryId;

    openInventoryItem(inventoryId);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const item = event.target.closest(".inv-item");

    if (!item) {
      return;
    }

    event.preventDefault();

    const inventoryId = item.dataset.inventoryId;

    openInventoryItem(inventoryId);
  });
}

function openInventoryItem(inventoryId) {
  const inventoryItem = dashboardData.inventory.find(
    (item) => String(item.id) === String(inventoryId),
  );

  if (!inventoryItem) {
    return;
  }

  const inventoryPage = "../inventory/inventory.html";

  const url =
    `${inventoryPage}?inventoryId=` + `${encodeURIComponent(inventoryId)}`;

  window.location.href = url;
}

function setupDentistInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".dentist-item");

    if (!item) {
      return;
    }

    const dentistId = Number(item.dataset.dentistId);

    const dentist = dashboardData.dentists.find(
      (doctor) => doctor.id === dentistId,
    );

    if (!dentist) {
      return;
    }

    console.log("Selected dentist:", dentist);
  });
}

function createEmptyState(icon, message) {
  return `
    <div class="empty-state">

      <i class="fa-solid ${escapeHTML(icon)}"></i>

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

    <span>
      ${escapeHTML(message)}
    </span>
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

function normalizeAppointmentDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const text = String(value).trim();

  const directMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (directMatch) {
    return `${directMatch[1]}-` + `${directMatch[2]}-` + `${directMatch[3]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return formatDateForComparison(date);
}

function normalizeAppointmentTime(value) {
  if (!value) {
    return "";
  }

  return String(value).trim();
}

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

function convertTimeTo24Hour(time) {
  if (!time) {
    return "00:00";
  }

  const text = String(time).trim();

  const match = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
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

function getInitials(name) {
  if (!name) {
    return "?";
  }

  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAppointmentBadgeClass(status) {
  switch (normalizeAppointmentStatus(status)) {
    case "scheduled":
      return "badge-pending";

    case "checkedin":
      return "badge-checkedin";

    case "in consultation":
      return "badge-consultation";

    case "complete":
      return "badge-completed";

    case "completed":
      return "badge-completed";

    case "cancelled":
      return "badge-cancelled";

    case "no-show":
      return "badge-no-show";

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

  updateClinicSummary,
};
