document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

/* =========================================================
   STORAGE
========================================================= */

/*
 * IMPORTANT:
 * The Patients page stores patient records using:
 *
 *     dentanueva_patients
 *
 * This MUST be the primary key used by the dashboard.
 */
const APPOINTMENTS_STORAGE_KEY = "appointments";
const PATIENTS_STORAGE_KEY = "dentanueva_patients";
const TRANSACTIONS_STORAGE_KEY = "transactions";

/*
 * Additional patient storage keys are supported ONLY as
 * fallbacks in case the Patients page uses one of these.
 *
 * "patients" is kept as a fallback for compatibility.
 */
const PATIENT_STORAGE_FALLBACK_KEYS = [
  "patients",
  "patientRecords",
  "patient_records",
  "patientList",
  "patientsList",
  "clinicPatients",
  "dentaNuevaPatients",
];

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

  window.addEventListener("focus", () => {
    renderDashboard();
  });

  window.addEventListener("storage", (event) => {
    if (
      event.key === APPOINTMENTS_STORAGE_KEY ||
      event.key === PATIENTS_STORAGE_KEY ||
      event.key === TRANSACTIONS_STORAGE_KEY ||
      PATIENT_STORAGE_FALLBACK_KEYS.includes(event.key)
    ) {
      renderDashboard();
    }
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
}

/* =========================================================
   DASHBOARD DATA
========================================================= */

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
   APPOINTMENTS
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

/* =========================================================
   NORMALIZE STATUS
========================================================= */

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

/* =========================================================
   RESOLVE DENTIST
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

/* =========================================================
   PATIENTS
========================================================= */

function getStoredPatients() {
  const possibleSources = [];

  /* -------------------------------------------------------
     PRIMARY PATIENT STORAGE
  ------------------------------------------------------- */

  const primaryPatients = readLocalStorageJSON(PATIENTS_STORAGE_KEY);

  if (primaryPatients !== null) {
    possibleSources.push({
      key: PATIENTS_STORAGE_KEY,
      data: primaryPatients,
    });
  }

  /* -------------------------------------------------------
     FALLBACK PATIENT STORAGE KEYS
  ------------------------------------------------------- */

  PATIENT_STORAGE_FALLBACK_KEYS.forEach((key) => {
    /*
     * Do not read the primary key twice.
     */
    if (key === PATIENTS_STORAGE_KEY) {
      return;
    }

    const data = readLocalStorageJSON(key);

    if (data !== null) {
      possibleSources.push({
        key,
        data,
      });
    }
  });

  /* -------------------------------------------------------
     FIND THE BEST PATIENT COLLECTION
  ------------------------------------------------------- */

  let bestPatients = [];

  possibleSources.forEach((source) => {
    const extracted = extractPatientCollection(source.data);

    if (extracted.length > bestPatients.length) {
      bestPatients = extracted;
    }
  });

  /*
   * Remove duplicate records only when the same patient
   * appears in more than one storage source.
   */
  return removeDuplicatePatients(bestPatients);
}

/* =========================================================
   READ JSON FROM LOCAL STORAGE
========================================================= */

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

/* =========================================================
   EXTRACT PATIENT COLLECTION
========================================================= */

function extractPatientCollection(data) {
  if (!data) {
    return [];
  }

  /*
   * Direct array
   */
  if (Array.isArray(data)) {
    return data.filter(isPatientRecord);
  }

  /*
   * Object
   */
  if (typeof data !== "object") {
    return [];
  }

  /*
   * Common patient array property names.
   */
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
    }
  }

  /*
   * Object keyed by patient ID.
   */
  const objectValues = Object.values(data);

  const directPatientValues = objectValues.filter(isPatientRecord);

  if (directPatientValues.length > 0) {
    return directPatientValues;
  }

  /*
   * Recursive fallback.
   */
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

/* =========================================================
   IDENTIFY PATIENT RECORD
========================================================= */

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

/* =========================================================
   REMOVE DUPLICATE PATIENTS
========================================================= */

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

/* =========================================================
   PATIENT IDENTITY
========================================================= */

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

/* =========================================================
   TRANSACTIONS
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

/* =========================================================
   TODAY'S CLINIC SUMMARY
========================================================= */

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

/* =========================================================
   PATIENTS
========================================================= */

function getTotalPatients() {
  /*
   * The Patients page stores its records under:
   *
   *     dentanueva_patients
   *
   * getStoredPatients() now reads that key as the
   * PRIMARY patient source.
   */
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

/* =========================================================
   TODAY'S APPOINTMENTS
========================================================= */

function getTodayAppointments() {
  const today = getTodayDate();

  return dashboardData.appointments.filter(
    (appointment) => normalizeAppointmentDate(appointment.date) === today,
  );
}

/* =========================================================
   EXCLUDED STATUS
========================================================= */

function isExcludedFromToday(status) {
  const normalized = normalizeAppointmentStatus(status);

  return normalized === "cancelled" || normalized === "no-show";
}

/* =========================================================
   UPCOMING APPOINTMENTS
========================================================= */

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

/* =========================================================
   APPOINTMENT HTML
========================================================= */

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

/* =========================================================
   STATUS LABEL
========================================================= */

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

/* =========================================================
   DISPLAY TIME
========================================================= */

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

/* =========================================================
   DENTIST AVAILABILITY
========================================================= */

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

/* =========================================================
   INVENTORY
========================================================= */

function renderInventoryAlerts() {
  const container = document.getElementById("inventoryAlerts");

  if (!container) {
    return;
  }

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

      <div class="inv-left">

        <div class="inv-icon">
          <i class="fa-solid ${status.icon}"></i>
        </div>

        <div class="inv-info">

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

/* =========================================================
   APPOINTMENT TREND
========================================================= */

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
  if (!target) {
    return;
  }

  window.location.href = target;
}

/* =========================================================
   APPOINTMENT CLICK
========================================================= */

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

/* =========================================================
   INVENTORY CLICK
========================================================= */

function setupInventoryInteractions() {
  document.addEventListener("click", (event) => {
    const item = event.target.closest(".inv-item");

    if (!item) {
      return;
    }

    const inventoryId = Number(item.dataset.inventoryId);

    openInventoryItem(inventoryId);
  });
}

function openInventoryItem(inventoryId) {
  const inventoryItem = dashboardData.inventory.find(
    (item) => item.id === inventoryId,
  );

  if (!inventoryItem) {
    return;
  }

  const inventoryPage = "../inventory/inventory.html";

  const url =
    `${inventoryPage}?inventoryId=` + `${encodeURIComponent(inventoryId)}`;

  window.location.href = url;
}

/* =========================================================
   DENTIST
========================================================= */

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

/* =========================================================
   EMPTY STATE
========================================================= */

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

/* =========================================================
   NOTIFICATION
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

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
   NORMALIZE DATE
========================================================= */

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

/* =========================================================
   NORMALIZE TIME
========================================================= */

function normalizeAppointmentTime(value) {
  if (!value) {
    return "";
  }

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
   SORT
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

/* =========================================================
   INITIALS
========================================================= */

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

/* =========================================================
   APPOINTMENT BADGE
========================================================= */

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

  updateClinicSummary,
};
