const APPOINTMENTS_STORAGE_KEY = "appointments";
const LEGACY_STORAGE_KEY = "dentanueva_appointments";
const PATIENTS_STORAGE_KEY = "dentanueva_patients";
const START_HOUR = 10;
const FIRST_BOOKABLE_HOUR = 10.5;
const END_HOUR = 20;
const SLOT_MIN = 30;
const NO_SHOW_GRACE_PERIOD_MIN = 15;
const NO_SHOW_TESTING_MODE = false;
const FINANCE_PAGE_URL = "../../finance/finance.html";
const FINANCE_PENDING_PAYMENT_KEY = "dentaNuevaPendingPayment";
const RESCHEDULE_REQUESTS_STORAGE_KEY = "dentanueva_reschedule_requests";
const SERVICE_DURATIONS = {
  Consultation: 30,
  "Dental Cleaning": 45,
  "Tooth Filling / Pasta": 45,
  "Tooth Extraction": 60,
  "Root Canal": 90,
  "Braces Adjustment": 30,
  "Teeth Whitening": 60,
  "Dental X-Ray": 15,
  "Scaling and Polishing": 45,
  "Denture Fitting": 60,
  "Wisdom Tooth Extraction": 75,
  "Dental Implant Consultation": 30,
  "Oral Prophylaxis": 45,
  "Retainer Fitting": 30,
};
const DEFAULT_SERVICE_SUGGESTIONS = [
  "Consultation",
  "Dental Cleaning",
  "Tooth Filling / Pasta",
  "Tooth Extraction",
  "Root Canal",
  "Braces Adjustment",
];
const dentists = {
  santos: {
    name: "Dr. M. Santos",
    specialty: "Orthodontics",
    color: "#166F63",
  },
  cruz: {
    name: "Dr. L. Cruz",
    specialty: "General Dentistry",
    color: "#E8A93B",
  },
  ramos: {
    name: "Dr. J. Ramos",
    specialty: "Oral Surgery",
    color: "#FF6B57",
  },
};
const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  IN_CONSULTATION: "in_consultation",
  READY_COMPLETE: "ready_complete",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
};
let appointments = [];
let patients = [];
let currentCalendarDate = new Date();
let selectedDate = new Date();
let editingId = null;
let deleteTargetId = null;
let modalMode = "new";
let statusActionTargetId = null;
let statusActionType = null;
let toastTimer = null;
let selectedDentistFilter = "santos";
let rescheduleRequestTargetId = null;
document.addEventListener("DOMContentLoaded", () => {
  loadPatients();
  loadAppointments();
  initializeDate();
  setupEvents();
  const dentistFilter = document.getElementById("dentistFilter");
  if (dentistFilter) {
    dentistFilter.querySelector('option[value="all"]')?.remove();
    selectedDentistFilter = dentistFilter.value || "santos";
  }
  renderAll();
  setInterval(() => {
    updateAutomaticAppointmentStatuses();
    renderTimeline();
    renderWaitingQueue();
    renderRealtimeDentistsDuty();
    if (
      ["new", "edit", "reschedule"].includes(modalMode) &&
      document.getElementById("overlay")?.classList.contains("show")
    ) {
      checkCurrentFormConflict();
    }
  }, 1000);
  window.addEventListener("storage", handleStorageChange);
  openAppointmentFromURL();
});
function handleStorageChange(event) {
  if (event.key === PATIENTS_STORAGE_KEY) {
    loadPatients();
    removeAppointmentsForDeletedPatients();
    refreshPatientSelector();
    renderAll();
  }
  if (
    event.key === APPOINTMENTS_STORAGE_KEY ||
    event.key === LEGACY_STORAGE_KEY
  ) {
    loadAppointments();
    renderAll();
  }
}
function initializeDate() {
  const today = new Date();
  selectedDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  currentCalendarDate = new Date(selectedDate);
}
function openAppointmentFromURL() {
  const params = new URLSearchParams(window.location.search);
  const appointmentId = params.get("appointmentId");
  if (!appointmentId) return;
  const appointment = appointments.find(
    (item) => String(item.id) === String(appointmentId),
  );
  if (!appointment) return;
  selectedDate = keyToDate(appointment.date);
  currentCalendarDate = new Date(selectedDate);
  renderAll();
  openViewModal(appointment.id);
}
function setupEvents() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderTimeline();
      renderWaitingQueue();
    });
  }
  const dentistFilter = document.getElementById("dentistFilter");
  if (dentistFilter) {
    dentistFilter.addEventListener("change", () => {
      selectedDentistFilter = dentistFilter.value || "santos";
      renderScheduleOverview();
      renderTimeline();
      renderWaitingQueue();
      renderRealtimeDentistsDuty();
    });
  }
  const serviceInput = document.getElementById("f_type");
  if (serviceInput) {
    serviceInput.addEventListener("input", () => {
      handleServiceChange();
      renderServiceDropdown(serviceInput.value);
      openServiceDropdown();
    });
    serviceInput.addEventListener("change", handleServiceChange);
    serviceInput.addEventListener("focus", openServiceDropdown);
  }
  const serviceArrow = document.querySelector(".service-select-arrow");
  if (serviceArrow) {
    serviceArrow.addEventListener("click", () => {
      const wrapper = document.getElementById("serviceSelectWrapper");
      if (!wrapper) return;
      if (wrapper.classList.contains("open")) {
        closeServiceDropdown();
      } else {
        serviceInput?.focus();
        openServiceDropdown();
      }
    });
  }
  const dateInput = document.getElementById("f_date");
  if (dateInput) {
    dateInput.addEventListener("change", handleModalDateChange);
  }
  const timeTrigger = document.getElementById("f_time_trigger");
  if (timeTrigger) {
    timeTrigger.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleTimePicker();
    });
  }
  const dentistInput = document.getElementById("f_dentist");
  if (dentistInput) {
    dentistInput.addEventListener("change", () => {
      updateAvailableTimeSlots();
      checkCurrentFormConflict();
    });
  }
  const durationInput = document.getElementById("f_duration");
  if (durationInput) {
    durationInput.addEventListener("input", () => {
      updateAvailableTimeSlots();
      checkCurrentFormConflict();
    });
  }
  const patientInput = document.getElementById("f_patient");
  if (patientInput) {
    patientInput.addEventListener("input", handlePatientInputChange);
    patientInput.addEventListener("focus", openPatientDropdown);
    patientInput.addEventListener("keydown", handlePatientInputKeydown);
  }
  const patientArrow = document.querySelector(".patient-select-arrow");
  if (patientArrow) {
    patientArrow.addEventListener("click", () => {
      const wrapper = document.getElementById("patientSelectWrapper");
      if (!wrapper) return;
      if (wrapper.classList.contains("open")) {
        closePatientDropdown();
      } else {
        document.getElementById("f_patient")?.focus();
        openPatientDropdown();
      }
    });
  }
  const rescheduleReasonInput = document.getElementById("rescheduleReason");
  if (rescheduleReasonInput) {
    rescheduleReasonInput.addEventListener("change", () => {
      const messageInput = document.getElementById("rescheduleMessage");
      if (!messageInput) return;
      if (rescheduleReasonInput.value === "dentist_unavailable") {
        messageInput.value = getDefaultRescheduleMessage("dentist_unavailable");
      } else {
        messageInput.value = "";
      }
    });
  }
}
function loadPatients() {
  const stored = localStorage.getItem(PATIENTS_STORAGE_KEY);
  if (!stored) {
    patients = [];
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    patients = Array.isArray(parsed) ? parsed.map(normalizePatient) : [];
  } catch (error) {
    console.error("Unable to load patients:", error);
    patients = [];
  }
}
function normalizePatient(patient) {
  return {
    ...patient,
    id: patient.id || `P${String(Date.now()).slice(-6)}`,
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    dateOfBirth: patient.dateOfBirth || "",
    gender: patient.gender || "",
    phone: patient.phone || "",
    email: patient.email || "",
    address: patient.address || "",
    emergencyName: patient.emergencyName || "",
    emergencyContact: patient.emergencyContact || "",
    medicalForm: patient.medicalForm || {},
    appointments: Array.isArray(patient.appointments)
      ? patient.appointments
      : [],
  };
}
function savePatientsToStorage() {
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}
function getPatientFullName(patient) {
  if (!patient) return "Unknown Patient";
  const first = String(patient.firstName || "").trim();
  const last = String(patient.lastName || "").trim();
  return `${first} ${last}`.trim() || "Unknown Patient";
}
function findPatientById(patientId) {
  if (!patientId) return null;
  return (
    patients.find((patient) => String(patient.id) === String(patientId)) || null
  );
}
function findPatientByName(name) {
  if (!name) return null;
  const target = String(name).trim().toLowerCase();
  return (
    patients.find(
      (patient) => getPatientFullName(patient).trim().toLowerCase() === target,
    ) || null
  );
}
function setupPatientDatalist() {
  refreshPatientSelector();
}
function getPatientMatches(query) {
  const trimmed = String(query || "")
    .trim()
    .toLowerCase();
  const sortedPatients = patients
    .slice()
    .sort((a, b) => getPatientFullName(a).localeCompare(getPatientFullName(b)));
  if (!trimmed) {
    return sortedPatients.slice(0, 5);
  }
  return sortedPatients.filter((patient) => {
    const name = getPatientFullName(patient).toLowerCase();
    const id = String(patient.id || "").toLowerCase();
    const phone = String(
      patient.phone || patient.contactNumber || patient.contact || "",
    ).toLowerCase();
    const email = String(patient.email || "").toLowerCase();
    return (
      name.includes(trimmed) ||
      id.includes(trimmed) ||
      phone.includes(trimmed) ||
      email.includes(trimmed)
    );
  });
}
function renderPatientDropdown(query = "") {
  const dropdown = document.getElementById("patientDropdown");
  if (!dropdown) return;
  const matches = getPatientMatches(query);
  dropdown.innerHTML = "";
  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "patient-dropdown-empty";
    empty.textContent = patients.length
      ? "No matching patient found."
      : "No patients available.";
    dropdown.appendChild(empty);
    return;
  }
  matches.forEach((patient, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "patient-dropdown-item";
    item.setAttribute("role", "option");
    item.dataset.patientId = String(patient.id);
    if (index === 0) {
      item.classList.add("active");
    }
    item.innerHTML = `<span class="patient-dropdown-name">${escapeHtml(getPatientFullName(patient))}</span><span class="patient-dropdown-id">${escapeHtml(String(patient.id))}</span>`;
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectPatientOption(patient);
    });
    dropdown.appendChild(item);
  });
}
function openPatientDropdown() {
  const wrapper = document.getElementById("patientSelectWrapper");
  const input = document.getElementById("f_patient");
  if (!wrapper || !input || input.disabled) {
    return;
  }
  renderPatientDropdown(input.value);
  wrapper.classList.add("open");
  input.setAttribute("aria-expanded", "true");
}
function closePatientDropdown() {
  const wrapper = document.getElementById("patientSelectWrapper");
  const input = document.getElementById("f_patient");
  if (!wrapper) return;
  wrapper.classList.remove("open");
  if (input) {
    input.setAttribute("aria-expanded", "false");
  }
}
function selectPatientOption(patient) {
  const input = document.getElementById("f_patient");
  const wrapper = document.getElementById("patientSelectWrapper");
  if (!input || !patient) return;
  input.value = `${getPatientFullName(patient)} · ${patient.id}`;
  input.dataset.patientId = String(patient.id);
  input.setAttribute("aria-expanded", "false");
  wrapper?.classList.remove("open");
  input.focus();
}
function refreshPatientSelector() {
  const patientInput = document.getElementById("f_patient");
  if (!patientInput) return;
  const currentPatientId = patientInput.dataset.patientId || "";
  const currentPatient = currentPatientId
    ? findPatientById(currentPatientId)
    : null;
  if (currentPatient) {
    patientInput.value = `${getPatientFullName(currentPatient)} · ${currentPatient.id}`;
  } else if (!findPatientByName(patientInput.value)) {
    patientInput.value = "";
    patientInput.dataset.patientId = "";
  }
  renderPatientDropdown(patientInput.value);
}
function handlePatientInputChange() {
  const patientInput = document.getElementById("f_patient");
  if (!patientInput || patientInput.disabled) {
    return;
  }
  patientInput.dataset.patientId = "";
  renderPatientDropdown(patientInput.value);
  openPatientDropdown();
}
function handlePatientInputKeydown(event) {
  if (event.key === "Escape") {
    closePatientDropdown();
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    document.querySelector("#patientDropdown .patient-dropdown-item")?.focus();
    return;
  }
  if (event.key === "Enter") {
    const firstItem = document.querySelector(
      "#patientDropdown .patient-dropdown-item",
    );
    if (
      firstItem &&
      document
        .getElementById("patientSelectWrapper")
        ?.classList.contains("open")
    ) {
      event.preventDefault();
      const patient = findPatientById(firstItem.dataset.patientId);
      if (patient) {
        selectPatientOption(patient);
      }
    }
  }
}
function getCurrentFormPatient() {
  const patientInput = document.getElementById("f_patient");
  if (!patientInput) return null;
  const patientId = patientInput.dataset.patientId || "";
  if (patientId) {
    return findPatientById(patientId);
  }
  return findPatientByName(patientInput.value.split(" · ")[0]);
}
function loadAppointments() {
  let stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
  if (!stored) {
    stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  }
  if (!stored) {
    appointments = [];
    return;
  }
  try {
    const parsed = JSON.parse(stored);
    appointments = Array.isArray(parsed)
      ? parsed.map(normalizeAppointment)
      : [];
  } catch (error) {
    console.error("Unable to load appointments:", error);
    appointments = [];
  }
  removeAppointmentsForDeletedPatients();
  linkExistingAppointmentsToPatients();
}
function saveAppointmentsToStorage() {
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
}
function removeAppointmentsForDeletedPatients() {
  if (!Array.isArray(appointments) || !Array.isArray(patients)) {
    return;
  }
  const beforeCount = appointments.length;
  appointments = appointments.filter((appt) => {
    if (appt.patientId) {
      return !!findPatientById(appt.patientId);
    }
    if (appt.patient) {
      return !!findPatientByName(appt.patient);
    }
    return false;
  });
  const removedCount = beforeCount - appointments.length;
  if (removedCount > 0) {
    saveAppointmentsToStorage();
    synchronizeAllPatientAppointments();
  }
}
function normalizeAppointment(appt) {
  let patientId = appt.patientId || appt.patient_id || "";
  if (!patientId && appt.patient) {
    const matchedPatient = findPatientByName(appt.patient);
    if (matchedPatient) {
      patientId = matchedPatient.id;
    }
  }
  const linkedPatient = findPatientById(patientId);
  const patientName = linkedPatient
    ? getPatientFullName(linkedPatient)
    : appt.patient || "Unknown Patient";
  const normalized = {
    ...appt,
    id:
      appt.id || `appt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    patientId: patientId || null,
    patient: patientName,
    date: appt.date || "",
    start: appt.start || appt.time || "10:00",
    type: appt.type || appt.service || "Consultation",
    dentist: appt.dentist || "santos",
    duration: Number(
      appt.duration ||
        SERVICE_DURATIONS[appt.type] ||
        SERVICE_DURATIONS[appt.service] ||
        30,
    ),
    status: appt.status || APPOINTMENT_STATUS.SCHEDULED,
    checkedIn: appt.checkedIn === true,
    checkedInAt: appt.checkedInAt || null,
    consultationStarted: appt.consultationStarted === true,
    manualReadyComplete: appt.manualReadyComplete === true,
    paymentStatus: appt.paymentStatus || "unpaid",
    paymentAmount: Number(appt.paymentAmount) || 0,
    rescheduleRequest: appt.rescheduleRequest || null,
  };
  if (!dentists[normalized.dentist]) {
    normalized.dentist = "santos";
  }
  if (!Number.isFinite(normalized.duration) || normalized.duration <= 0) {
    normalized.duration = 30;
  }
  if (!Object.values(APPOINTMENT_STATUS).includes(normalized.status)) {
    normalized.status = APPOINTMENT_STATUS.SCHEDULED;
  }
  if (
    normalized.status === APPOINTMENT_STATUS.IN_CONSULTATION ||
    normalized.status === APPOINTMENT_STATUS.READY_COMPLETE ||
    normalized.status === APPOINTMENT_STATUS.COMPLETED
  ) {
    normalized.checkedIn = true;
  }
  return normalized;
}
function linkExistingAppointmentsToPatients() {
  let changed = false;
  appointments.forEach((appt) => {
    if (appt.patientId) {
      const patient = findPatientById(appt.patientId);
      if (patient) {
        const officialName = getPatientFullName(patient);
        if (appt.patient !== officialName) {
          appt.patient = officialName;
          changed = true;
        }
      }
      return;
    }
    const patient = findPatientByName(appt.patient);
    if (patient) {
      appt.patientId = patient.id;
      appt.patient = getPatientFullName(patient);
      changed = true;
    }
  });
  if (changed) {
    saveAppointmentsToStorage();
  }
  synchronizeAllPatientAppointments();
}
function synchronizeAllPatientAppointments() {
  if (!patients.length) return;
  let changed = false;
  patients.forEach((patient) => {
    if (!Array.isArray(patient.appointments)) {
      patient.appointments = [];
      changed = true;
    }
    const linkedAppointments = appointments.filter(
      (appt) => String(appt.patientId) === String(patient.id),
    );
    const appointmentRecords = linkedAppointments.map((appt) => ({
      id: appt.id,
      appointmentId: appt.id,
      date: appt.date,
      time: appt.start,
      type: appt.type,
      service: appt.type,
      dentist: appt.dentist,
      duration: appt.duration,
      status: appt.status,
      checkedIn: appt.checkedIn === true,
      checkedInAt: appt.checkedInAt || null,
      consultationStarted: appt.consultationStarted === true,
      manualReadyComplete: appt.manualReadyComplete === true,
      paymentStatus: appt.paymentStatus || "unpaid",
      paymentAmount: Number(appt.paymentAmount) || 0,
      rescheduleRequest: appt.rescheduleRequest || null,
    }));
    const oldValue = JSON.stringify(patient.appointments);
    const newValue = JSON.stringify(appointmentRecords);
    if (oldValue !== newValue) {
      patient.appointments = appointmentRecords;
      changed = true;
    }
    updatePatientNextAppointment(patient, linkedAppointments);
  });
  if (changed) {
    savePatientsToStorage();
  }
}
function updatePatientNextAppointment(patient, linkedAppointments = null) {
  const source =
    linkedAppointments ||
    appointments.filter(
      (appt) => String(appt.patientId) === String(patient.id),
    );
  const todayKey = dateToKey(new Date());
  const futureAppointments = source
    .filter(
      (appt) =>
        appt.date >= todayKey &&
        appt.status !== APPOINTMENT_STATUS.COMPLETED &&
        appt.status !== APPOINTMENT_STATUS.NO_SHOW,
    )
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return timeToMinutes(a.start) - timeToMinutes(b.start);
    });
  const next = futureAppointments[0] || null;
  patient.nextAppointment = next
    ? {
        id: next.id,
        appointmentId: next.id,
        date: next.date,
        time: next.start,
        type: next.type,
        dentist: next.dentist,
        status: next.status,
      }
    : null;
}
function syncAppointmentToPatient(appt) {
  if (!appt || !appt.patientId) {
    return;
  }
  const patient = findPatientById(appt.patientId);
  if (!patient) return;
  if (!Array.isArray(patient.appointments)) {
    patient.appointments = [];
  }
  const record = {
    id: appt.id,
    appointmentId: appt.id,
    date: appt.date,
    time: appt.start,
    type: appt.type,
    service: appt.type,
    dentist: appt.dentist,
    duration: appt.duration,
    status: appt.status,
    checkedIn: appt.checkedIn === true,
    checkedInAt: appt.checkedInAt || null,
    consultationStarted: appt.consultationStarted === true,
    manualReadyComplete: appt.manualReadyComplete === true,
    paymentStatus: appt.paymentStatus || "unpaid",
    paymentAmount: Number(appt.paymentAmount) || 0,
    rescheduleRequest: appt.rescheduleRequest || null,
  };
  const index = patient.appointments.findIndex(
    (item) => String(item.appointmentId || item.id) === String(appt.id),
  );
  if (index === -1) {
    patient.appointments.push(record);
  } else {
    patient.appointments[index] = record;
  }
  updatePatientNextAppointment(patient);
  savePatientsToStorage();
}
function removeAppointmentFromPatient(appt) {
  if (!appt || !appt.patientId) {
    return;
  }
  const patient = findPatientById(appt.patientId);
  if (!patient) return;
  if (!Array.isArray(patient.appointments)) {
    patient.appointments = [];
  }
  patient.appointments = patient.appointments.filter(
    (item) => String(item.appointmentId || item.id) !== String(appt.id),
  );
  updatePatientNextAppointment(patient);
  savePatientsToStorage();
}
function dateToKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function keyToDate(key) {
  const parts = key.split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}
function isToday(dateOrKey) {
  const todayKey = dateToKey(new Date());
  const key = typeof dateOrKey === "string" ? dateOrKey : dateToKey(dateOrKey);
  return key === todayKey;
}
function isPastDate(dateOrKey) {
  if (!dateOrKey) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date =
    typeof dateOrKey === "string" ? keyToDate(dateOrKey) : new Date(dateOrKey);
  date.setHours(0, 0, 0, 0);
  return date < today;
}
function isFutureDate(dateOrKey) {
  return !isToday(dateOrKey) && !isPastDate(dateOrKey);
}
function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
function timeToMinutes(time) {
  if (!time) return 0;
  const parts = time.split(":");
  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
}
function minutesToTime(totalMinutes) {
  totalMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return (
    String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0")
  );
}
function fmtTime(time) {
  const minutes = timeToMinutes(time);
  let hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }
  return `${hours}:${String(mins).padStart(2, "0")} ${suffix}`;
}
function formatDateLong(dateKey) {
  return keyToDate(dateKey).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function getAppointmentEnd(appt) {
  return timeToMinutes(appt.start) + (Number(appt.duration) || 30);
}
function getAppointmentEndTime(appt) {
  return minutesToTime(getAppointmentEnd(appt));
}
function isNoShowEligible(appt) {
  return appt.status === APPOINTMENT_STATUS.SCHEDULED && isToday(appt.date);
}
function appointmentsOverlap(
  newStart,
  newDuration,
  existingStart,
  existingDuration,
) {
  const newStartMinutes = timeToMinutes(newStart);
  const newEndMinutes = newStartMinutes + Number(newDuration);
  const existingStartMinutes = timeToMinutes(existingStart);
  const existingEndMinutes = existingStartMinutes + Number(existingDuration);
  return (
    newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes
  );
}
function findDentistConflict(date, start, duration, dentist, ignoreId = null) {
  return (
    appointments.find((appt) => {
      if (appt.id === ignoreId) {
        return false;
      }
      if (appt.date !== date) {
        return false;
      }
      if (appt.dentist !== dentist) {
        return false;
      }
      if (
        appt.status === APPOINTMENT_STATUS.COMPLETED ||
        appt.status === APPOINTMENT_STATUS.NO_SHOW
      ) {
        return false;
      }
      return appointmentsOverlap(start, duration, appt.start, appt.duration);
    }) || null
  );
}
function updateAutomaticAppointmentStatuses() {
  let changed = false;
  const todayKey = dateToKey(new Date());
  const currentTime = getCurrentTimeMinutes();
  appointments.forEach((appt) => {
    if (appt.status !== APPOINTMENT_STATUS.IN_CONSULTATION) return;
    const appointmentEnd = getAppointmentEnd(appt);
    const hasEnded =
      appt.date < todayKey ||
      (appt.date === todayKey && currentTime >= appointmentEnd);
    if (!hasEnded) return;
    appt.status = APPOINTMENT_STATUS.READY_COMPLETE;
    appt.consultationStarted = false;
    appt.manualReadyComplete = true;
    syncAppointmentToPatient(appt);
    changed = true;
  });
  if (changed) {
    saveAppointmentsToStorage();
  }
  return changed;
}
function getStatusLabel(status) {
  switch (status) {
    case APPOINTMENT_STATUS.SCHEDULED:
      return "Scheduled";
    case APPOINTMENT_STATUS.IN_CONSULTATION:
      return "In Consultation";
    case APPOINTMENT_STATUS.READY_COMPLETE:
      return "Complete";
    case APPOINTMENT_STATUS.COMPLETED:
      return "Completed";
    case APPOINTMENT_STATUS.NO_SHOW:
      return "No Show";
    default:
      return "Scheduled";
  }
}
function handleServiceChange() {
  const service = document.getElementById("f_type").value.trim();
  const durationInput = document.getElementById("f_duration");
  if (SERVICE_DURATIONS[service] && durationInput) {
    durationInput.value = SERVICE_DURATIONS[service];
  }
  updateAvailableTimeSlots();
  checkCurrentFormConflict();
}
function getServiceMatches(query) {
  const allServices = Object.keys(SERVICE_DURATIONS);
  const trimmed = (query || "").trim().toLowerCase();
  if (!trimmed) {
    return DEFAULT_SERVICE_SUGGESTIONS.filter((name) =>
      allServices.includes(name),
    );
  }
  return allServices.filter((name) => name.toLowerCase().includes(trimmed));
}
function renderServiceDropdown(query) {
  const dropdown = document.getElementById("serviceDropdown");
  if (!dropdown) return;
  const matches = getServiceMatches(query);
  dropdown.innerHTML = "";
  if (!matches.length) {
    const empty = document.createElement("div");
    empty.className = "service-dropdown-empty";
    empty.textContent =
      "No matching service. You can keep this as a custom service name.";
    dropdown.appendChild(empty);
    return;
  }
  matches.forEach((name) => {
    const item = document.createElement("div");
    item.className = "service-dropdown-item";
    item.innerHTML = `<span class="service-dropdown-name">${escapeHtml(name)}</span><span class="service-dropdown-duration">${SERVICE_DURATIONS[name]} min</span>`;
    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectServiceOption(name);
    });
    dropdown.appendChild(item);
  });
}
function openServiceDropdown() {
  const wrapper = document.getElementById("serviceSelectWrapper");
  const input = document.getElementById("f_type");
  if (!wrapper || !input || input.disabled) {
    return;
  }
  renderServiceDropdown(input.value);
  wrapper.classList.add("open");
}
function closeServiceDropdown() {
  const wrapper = document.getElementById("serviceSelectWrapper");
  if (!wrapper) return;
  wrapper.classList.remove("open");
}
function selectServiceOption(name) {
  const input = document.getElementById("f_type");
  if (!input) return;
  input.value = name;
  closeServiceDropdown();
  handleServiceChange();
  input.focus();
}
function handleModalDateChange() {
  const date = document.getElementById("f_date").value;
  const pastNotice = document.getElementById("pastRecordNotice");
  if (
    ["new", "edit", "reschedule"].includes(modalMode) &&
    date &&
    isPastDate(date)
  ) {
    pastNotice.classList.add("show");
  } else {
    pastNotice.classList.remove("show");
  }
  updateAvailableTimeSlots();
  checkCurrentFormConflict();
}
function getCurrentFormTime() {
  return document.getElementById("f_time")?.value || "";
}
function formatSlotLabel(time) {
  return fmtTime(time);
}
function getAvailableTimeSlots(date, dentist, duration) {
  const safeDuration = Number(duration) > 0 ? Number(duration) : SLOT_MIN;
  const clinicStart = FIRST_BOOKABLE_HOUR * 60;
  const clinicEnd = END_HOUR * 60;
  const slots = [];
  for (
    let minutes = clinicStart;
    minutes + safeDuration <= clinicEnd;
    minutes += SLOT_MIN
  ) {
    slots.push(minutesToTime(minutes));
  }
  return slots;
}
function getScheduledTimeConflict(date, time, dentist, duration) {
  return findDentistConflict(date, time, duration, dentist, null);
}
function classifyTimePeriod(minutes) {
  if (minutes < 12 * 60) return "Morning";
  if (minutes < 18 * 60) return "Afternoon";
  return "Evening";
}
function renderTimePicker(slots, currentValue, date, dentist, duration) {
  const dropdown = document.getElementById("f_time_dropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  const groups = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach((slot) => {
    groups[classifyTimePeriod(timeToMinutes(slot))].push(slot);
  });
  let availableCount = 0;
  Object.keys(groups).forEach((period) => {
    if (!groups[period].length) return;
    const label = document.createElement("div");
    label.className = "time-picker-group-label";
    label.textContent = period;
    dropdown.appendChild(label);
    const grid = document.createElement("div");
    grid.className = "time-picker-grid";
    groups[period].forEach((slot) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-picker-option";
      btn.dataset.value = slot;
      const conflict = getScheduledTimeConflict(date, slot, dentist, duration);
      const isScheduled = !!conflict;
      const isPast =
        isToday(date) && timeToMinutes(slot) <= getCurrentTimeMinutes();
      if (slot === currentValue) {
        btn.classList.add("selected");
      }
      if (isScheduled) {
        btn.classList.add("scheduled");
        btn.disabled = true;
        btn.title = "This time is already scheduled.";
        btn.setAttribute(
          "aria-label",
          `${formatSlotLabel(slot)}. This time is already scheduled.`,
        );
        btn.innerHTML = `<i class="fa-solid fa-ban time-unavailable-icon" aria-hidden="true"></i><span>${formatSlotLabel(slot)}</span>`;
      } else if (isPast) {
        btn.classList.add("disabled");
        btn.disabled = true;
        btn.title = "This time has already passed.";
        btn.setAttribute(
          "aria-label",
          `${formatSlotLabel(slot)}. This time has already passed.`,
        );
        btn.innerHTML = `<i class="fa-solid fa-clock time-past-icon" aria-hidden="true"></i><span>${formatSlotLabel(slot)}</span>`;
      } else {
        availableCount += 1;
        btn.textContent = formatSlotLabel(slot);
        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          selectTimeOption(slot);
        });
      }
      grid.appendChild(btn);
    });
    dropdown.appendChild(grid);
  });
  if (
    !availableCount &&
    !dropdown.querySelector(".time-picker-option.selected")
  ) {
    const empty = document.createElement("div");
    empty.className = "time-picker-empty";
    empty.textContent = "No available times";
    dropdown.appendChild(empty);
  }
}
function forceTimeSelection(time) {
  const timeInput = document.getElementById("f_time");
  const triggerLabel = document.getElementById("f_time_trigger_label");
  if (!timeInput || !time) return;
  timeInput.value = time;
  if (triggerLabel) {
    triggerLabel.textContent = formatSlotLabel(time);
  }
}
function selectTimeOption(value) {
  const timeInput = document.getElementById("f_time");
  const triggerLabel = document.getElementById("f_time_trigger_label");
  if (!timeInput) return;
  timeInput.value = value;
  if (triggerLabel) {
    triggerLabel.textContent = value
      ? formatSlotLabel(value)
      : "Select an available time";
  }
  closeTimePicker();
  checkCurrentFormConflict();
  updateAvailableTimeSummary(
    [],
    getCurrentFormTime(),
    Number(document.getElementById("f_duration")?.value) || SLOT_MIN,
  );
}
function openTimePicker() {
  const trigger = document.getElementById("f_time_trigger");
  const dropdown = document.getElementById("f_time_dropdown");
  if (!trigger || !dropdown || trigger.disabled) {
    return;
  }
  dropdown.classList.add("open");
  trigger.classList.add("open");
}
function closeTimePicker() {
  const trigger = document.getElementById("f_time_trigger");
  const dropdown = document.getElementById("f_time_dropdown");
  if (!dropdown) return;
  dropdown.classList.remove("open");
  trigger?.classList.remove("open");
}
function toggleTimePicker() {
  const dropdown = document.getElementById("f_time_dropdown");
  if (!dropdown) return;
  if (dropdown.classList.contains("open")) {
    closeTimePicker();
  } else {
    openTimePicker();
  }
}
function updateAvailableTimeSlots(preferredTime = null) {
  const timeInput = document.getElementById("f_time");
  const trigger = document.getElementById("f_time_trigger");
  const triggerLabel = document.getElementById("f_time_trigger_label");
  const date = document.getElementById("f_date")?.value || "";
  const dentist = document.getElementById("f_dentist")?.value || "";
  const duration =
    Number(document.getElementById("f_duration")?.value) || SLOT_MIN;
  if (!timeInput || !date || !dentist) {
    return;
  }
  const currentValue = preferredTime || timeInput.value || "";
  if (isPastDate(date) && modalMode === "view") {
    timeInput.value = currentValue || "";
    if (triggerLabel) {
      triggerLabel.textContent = currentValue
        ? formatSlotLabel(currentValue)
        : "Historical time";
    }
    if (trigger) trigger.disabled = true;
    closeTimePicker();
    return;
  }
  if (isPastDate(date)) {
    return;
  }
  if (trigger) trigger.disabled = false;
  const slots = getAvailableTimeSlots(date, dentist, duration);
  renderTimePicker(slots, currentValue, date, dentist, duration);
  const validCurrent = currentValue && slots.includes(currentValue);
  if (validCurrent) {
    timeInput.value = currentValue;
    if (triggerLabel) {
      triggerLabel.textContent = formatSlotLabel(currentValue);
    }
  } else {
    const firstAvailable = slots.find((slot) => {
      const isPast =
        isToday(date) && timeToMinutes(slot) <= getCurrentTimeMinutes();
      const conflict = getScheduledTimeConflict(date, slot, dentist, duration);
      return !isPast && !conflict;
    });
    timeInput.value = firstAvailable || "";
    if (triggerLabel) {
      triggerLabel.textContent = firstAvailable
        ? formatSlotLabel(firstAvailable)
        : "No available times";
    }
  }
  updateAvailableTimeSummary(
    slots.filter((slot) => {
      const isPast =
        isToday(date) && timeToMinutes(slot) <= getCurrentTimeMinutes();
      const conflict = getScheduledTimeConflict(date, slot, dentist, duration);
      return !isPast && !conflict;
    }),
    getCurrentFormTime(),
    duration,
  );
}
function updateAvailableTimeSummary(slots, selectedTime = "", duration = null) {
  const summary = document.getElementById("availableTimeSummary");
  if (!summary) return;
  const safeDuration = Number(duration) > 0 ? Number(duration) : SLOT_MIN;
  const actualTime = selectedTime || getCurrentFormTime();
  if (actualTime) {
    const endTime = minutesToTime(timeToMinutes(actualTime) + safeDuration);
    summary.textContent = `Appointment time: ${fmtTime(actualTime)} – ${fmtTime(endTime)} · Predicted duration: ${safeDuration} minutes.`;
    summary.classList.remove("warning");
    return;
  }
  if (!slots.length) {
    summary.textContent =
      "No available slots for this dentist, date, and duration.";
    summary.classList.add("warning");
    return;
  }
  summary.textContent = `${slots.length} available start time${slots.length !== 1 ? "s" : ""} based on dentist availability, duration, clinic hours, and existing appointments.`;
  summary.classList.remove("warning");
}
function handleTimeSelectionChange() {
  checkCurrentFormConflict();
  updateAvailableTimeSummary(
    [],
    getCurrentFormTime(),
    Number(document.getElementById("f_duration")?.value) || SLOT_MIN,
  );
}
function openNewModal(date = null, time = null) {
  loadPatients();
  removeAppointmentsForDeletedPatients();
  refreshPatientSelector();
  modalMode = "new";
  editingId = null;
  const overlay = document.getElementById("overlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const requestRescheduleBtn = document.getElementById("requestRescheduleBtn");
  const viewNotice = document.getElementById("viewOnlyNotice");
  const pastNotice = document.getElementById("pastRecordNotice");
  const conflictNotice = document.getElementById("scheduleConflictNotice");
  modalTitle.textContent = "New Appointment";
  modalSubtitle.textContent = "Create a new appointment";
  saveBtn.style.display = "inline-flex";
  saveBtn.textContent = "Save Appointment";
  saveBtn.disabled = false;
  deleteBtn.style.display = "none";
  requestRescheduleBtn.style.display = "none";
  viewNotice.classList.remove("show");
  conflictNotice.classList.remove("show");
  resetFormEditable();
  const selectedKey = date || dateToKey(selectedDate);
  const patientInput = document.getElementById("f_patient");
  const dateInput = document.getElementById("f_date");
  const typeInput = document.getElementById("f_type");
  const durationInput = document.getElementById("f_duration");
  const dentistInput = document.getElementById("f_dentist");
  patientInput.value = "";
  patientInput.dataset.patientId = "";
  dateInput.value = selectedKey;
  typeInput.value = "Consultation";
  durationInput.value = SERVICE_DURATIONS.Consultation;
  dentistInput.value = selectedDentistFilter || "santos";
  dentistInput.disabled = true;
  updateAvailableTimeSlots(time);
  if (isPastDate(selectedKey)) {
    pastNotice.classList.add("show");
    saveBtn.disabled = true;
  } else {
    pastNotice.classList.remove("show");
  }
  closeServiceDropdown();
  closePatientDropdown();
  closeTimePicker();
  overlay.classList.add("show");
  handleServiceChange();
}
function openViewModal(id) {
  const appt = appointments.find((item) => item.id === id);
  if (!appt) return;
  modalMode = "view";
  editingId = id;
  const overlay = document.getElementById("overlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const requestRescheduleBtn = document.getElementById("requestRescheduleBtn");
  const viewNotice = document.getElementById("viewOnlyNotice");
  const pastNotice = document.getElementById("pastRecordNotice");
  const conflictNotice = document.getElementById("scheduleConflictNotice");
  if (!appt.patientId) {
    const matched = findPatientByName(appt.patient);
    if (matched) {
      appt.patientId = matched.id;
      appt.patient = getPatientFullName(matched);
      saveAppointmentsToStorage();
      syncAppointmentToPatient(appt);
    }
  }
  if (appt.patientId && !findPatientById(appt.patientId)) {
    removeAppointmentsForDeletedPatients();
    renderAll();
    showToast("This appointment belongs to a deleted patient.");
    return;
  }
  refreshPatientSelector();
  modalTitle.textContent = "Appointment Details";
  modalSubtitle.textContent = `${formatDateLong(appt.date)} · ${fmtTime(appt.start)}–${fmtTime(getAppointmentEndTime(appt))}`;
  const patientInput = document.getElementById("f_patient");
  const linkedPatient = appt.patientId
    ? findPatientById(appt.patientId)
    : findPatientByName(appt.patient);
  if (patientInput) {
    if (linkedPatient) {
      patientInput.value = `${getPatientFullName(linkedPatient)} · ${linkedPatient.id}`;
      patientInput.dataset.patientId = String(linkedPatient.id);
    } else {
      patientInput.value = appt.patient || "";
      patientInput.dataset.patientId = "";
    }
  }
  document.getElementById("f_date").value = appt.date;
  document.getElementById("f_type").value = appt.type;
  document.getElementById("f_duration").value = appt.duration;
  document.getElementById("f_dentist").value = appt.dentist;
  updateAvailableTimeSlots(appt.start);
  forceTimeSelection(appt.start);
  setFormReadOnly(true);
  saveBtn.style.display = "none";
  deleteBtn.style.display = "flex";
  requestRescheduleBtn.style.display =
    appt.status === APPOINTMENT_STATUS.SCHEDULED && !isPastDate(appt.date)
      ? "inline-flex"
      : "none";
  viewNotice.classList.add("show");
  conflictNotice.classList.remove("show");
  if (isPastDate(appt.date)) {
    pastNotice.classList.add("show");
  } else {
    pastNotice.classList.remove("show");
  }
  closeServiceDropdown();
  closePatientDropdown();
  closeTimePicker();
  overlay.classList.add("show");
}
function prepareAppointmentEdit(id, mode) {
  const appt = appointments.find((item) => item.id === id);
  if (!appt) return;
  if (appt.status !== APPOINTMENT_STATUS.SCHEDULED || isPastDate(appt.date)) {
    showToast("Only active scheduled appointments can be changed.");
    return;
  }
  modalMode = mode;
  editingId = id;
  const overlay = document.getElementById("overlay");
  const modalTitle = document.getElementById("modalTitle");
  const modalSubtitle = document.getElementById("modalSubtitle");
  const saveBtn = document.getElementById("saveBtn");
  const deleteBtn = document.getElementById("deleteBtn");
  const requestRescheduleBtn = document.getElementById("requestRescheduleBtn");
  const viewNotice = document.getElementById("viewOnlyNotice");
  const pastNotice = document.getElementById("pastRecordNotice");
  const conflictNotice = document.getElementById("scheduleConflictNotice");
  const patientInput = document.getElementById("f_patient");
  const dateInput = document.getElementById("f_date");
  const typeInput = document.getElementById("f_type");
  const durationInput = document.getElementById("f_duration");
  const dentistInput = document.getElementById("f_dentist");
  modalTitle.textContent =
    mode === "reschedule" ? "Reschedule Appointment" : "Edit Appointment";
  modalSubtitle.textContent =
    mode === "reschedule"
      ? "Update the appointment date, dentist, or available time"
      : "Update the appointment details";
  saveBtn.textContent =
    mode === "reschedule" ? "Save Reschedule" : "Save Changes";
  saveBtn.style.display = "inline-flex";
  saveBtn.disabled = false;
  deleteBtn.style.display = "flex";
  requestRescheduleBtn.style.display = "none";
  viewNotice.classList.remove("show");
  pastNotice.classList.remove("show");
  conflictNotice.classList.remove("show");
  if (appt.patientId) {
    const linkedPatient = findPatientById(appt.patientId);
    if (linkedPatient) {
      patientInput.value = `${getPatientFullName(linkedPatient)} · ${linkedPatient.id}`;
      patientInput.dataset.patientId = String(linkedPatient.id);
    }
  } else {
    patientInput.value = appt.patient || "";
    patientInput.dataset.patientId = "";
  }
  dateInput.value = appt.date;
  typeInput.value = appt.type;
  durationInput.value = appt.duration;
  dentistInput.value = appt.dentist;
  dentistInput.disabled = false;
  resetFormEditable();
  if (mode === "reschedule") {
    patientInput.disabled = true;
    typeInput.disabled = true;
    durationInput.disabled = true;
  }
  updateAvailableTimeSlots(appt.start);
  forceTimeSelection(appt.start);
  closeServiceDropdown();
  closePatientDropdown();
  closeTimePicker();
  overlay.classList.add("show");
  checkCurrentFormConflict();
}
function beginEditAppointment() {
  if (!editingId) return;
  prepareAppointmentEdit(editingId, "edit");
}
function beginRescheduleAppointment() {
  if (!editingId) return;
  openRescheduleRequestModal();
}
function setFormReadOnly(readOnly) {
  [
    "f_patient",
    "f_date",
    "f_time",
    "f_time_trigger",
    "f_type",
    "f_duration",
    "f_dentist",
  ].forEach((id) => {
    const element = document.getElementById(id);
    if (element) {
      element.disabled = readOnly;
    }
  });
}
function resetFormEditable() {
  setFormReadOnly(false);
}
function closeModal() {
  const overlay = document.getElementById("overlay");
  if (overlay) {
    overlay.classList.remove("show");
  }
  editingId = null;
  modalMode = "new";
  resetFormEditable();
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) {
    saveBtn.textContent = "Save Appointment";
  }
  closeServiceDropdown();
  closePatientDropdown();
  closeTimePicker();
}
function checkCurrentFormConflict() {
  if (!["new", "edit", "reschedule"].includes(modalMode)) {
    return;
  }
  const date = document.getElementById("f_date")?.value || "";
  const start = getCurrentFormTime();
  const dentist = document.getElementById("f_dentist")?.value || "";
  const duration = Number(document.getElementById("f_duration")?.value);
  const notice = document.getElementById("scheduleConflictNotice");
  const text = document.getElementById("scheduleConflictText");
  const saveBtn = document.getElementById("saveBtn");
  if (!notice || !text || !saveBtn) {
    return;
  }
  notice.classList.remove("show");
  if (!date || !start || !dentist || !duration) {
    if (date && isPastDate(date)) {
      saveBtn.disabled = true;
      return;
    }
    if (date && isToday(date) && getCurrentTimeMinutes() >= END_HOUR * 60) {
      text.textContent =
        "Online appointment booking is closed for today because the clinic has already reached its closing time (8:00 PM).";
      notice.classList.add("show");
      saveBtn.disabled = true;
      return;
    }
    saveBtn.disabled = false;
    return;
  }
  if (isPastDate(date)) {
    saveBtn.disabled = true;
    return;
  }
  const startMinutes = timeToMinutes(start);
  const currentTime = getCurrentTimeMinutes();
  const clinicStart = START_HOUR * 60;
  const clinicEnd = END_HOUR * 60;
  const appointmentEnd = startMinutes + duration;
  if (isToday(date) && startMinutes <= currentTime) {
    text.textContent =
      "The selected appointment time has already passed. Please choose a future available time.";
    notice.classList.add("show");
    saveBtn.disabled = true;
    return;
  }
  if (
    startMinutes < clinicStart ||
    appointmentEnd > clinicEnd ||
    startMinutes % SLOT_MIN !== 0
  ) {
    text.textContent = `The selected time must start on a ${SLOT_MIN}-minute slot and stay within clinic hours (${fmtTime("10:00")}–${fmtTime("20:00")}).`;
    notice.classList.add("show");
    saveBtn.disabled = true;
    return;
  }
  const conflict = findDentistConflict(
    date,
    start,
    duration,
    dentist,
    editingId || null,
  );
  if (conflict) {
    const dentistName = dentists[conflict.dentist]?.name || conflict.dentist;
    const end = getAppointmentEndTime(conflict);
    text.textContent = `${dentistName} already has an appointment from ${fmtTime(conflict.start)} to ${fmtTime(end)}.`;
    notice.classList.add("show");
    saveBtn.disabled = true;
    return;
  }
  saveBtn.disabled = false;
}
function saveAppt() {
  if (!["new", "edit", "reschedule"].includes(modalMode)) {
    return;
  }
  loadPatients();
  removeAppointmentsForDeletedPatients();
  const patientInput = document.getElementById("f_patient");
  const patientId =
    patientInput?.dataset.patientId ||
    findPatientByName(patientInput?.value?.split(" · ")[0] || "")?.id ||
    "";
  const patient = findPatientById(patientId);
  const date = document.getElementById("f_date").value;
  const start = getCurrentFormTime();
  const type = document.getElementById("f_type").value.trim();
  const duration = Number(document.getElementById("f_duration").value);
  const dentist = document.getElementById("f_dentist").value;
  if (!patientId || !patient) {
    showToast("Please select an existing patient.");
    return;
  }
  if (!date) {
    showToast("Please select a date.");
    return;
  }
  if (!start) {
    showToast("Please select an available appointment time.");
    return;
  }
  if (!type) {
    showToast("Please select or enter a service type.");
    return;
  }
  if (!duration || duration < 5) {
    showToast("Please enter a valid duration.");
    return;
  }
  if (!dentists[dentist]) {
    showToast("Please select a valid dentist.");
    return;
  }
  if (isPastDate(date)) {
    showToast(
      "Past dates are historical records only. New or changed appointments cannot use past dates.",
    );
    return;
  }
  const startMinutes = timeToMinutes(start);
  const clinicStart = START_HOUR * 60;
  const clinicEnd = END_HOUR * 60;
  const appointmentEnd = startMinutes + duration;
  const currentTime = getCurrentTimeMinutes();
  if (isToday(date) && currentTime >= END_HOUR * 60) {
    showToast(
      "Appointment booking is closed for today. The clinic closes at 8:00 PM.",
    );
    return;
  }
  if (isToday(date) && startMinutes <= currentTime) {
    showToast(
      "That appointment time has already passed. Please select a future available time.",
    );
    return;
  }
  if (
    startMinutes < clinicStart ||
    appointmentEnd > clinicEnd ||
    startMinutes % SLOT_MIN !== 0
  ) {
    showToast(
      `Appointment must start on a ${SLOT_MIN}-minute slot and remain within clinic hours (${fmtTime("10:00")}–${fmtTime("20:00")}).`,
    );
    return;
  }
  const conflict = findDentistConflict(
    date,
    start,
    duration,
    dentist,
    editingId || null,
  );
  if (conflict) {
    const conflictEnd = getAppointmentEndTime(conflict);
    const dentistName = dentists[conflict.dentist].name;
    document.getElementById("scheduleConflictText").textContent =
      `${dentistName} is already occupied from ${fmtTime(conflict.start)} to ${fmtTime(conflictEnd)}.`;
    document.getElementById("scheduleConflictNotice").classList.add("show");
    showToast("Cannot save. The dentist is already occupied during this time.");
    return;
  }
  if (modalMode === "new") {
    const newAppointment = {
      id: `appt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      patientId: patient.id,
      patient: getPatientFullName(patient),
      date,
      start,
      type,
      dentist,
      duration,
      status: APPOINTMENT_STATUS.SCHEDULED,
      checkedIn: false,
      checkedInAt: null,
      consultationStarted: false,
      manualReadyComplete: false,
      paymentStatus: "unpaid",
      paymentAmount: 0,
    };
    appointments.push(newAppointment);
    saveAppointmentsToStorage();
    syncAppointmentToPatient(newAppointment);
    closeModal();
    selectedDate = keyToDate(date);
    currentCalendarDate = new Date(selectedDate);
    renderAll();
    showToast(
      `Appointment saved for ${getPatientFullName(patient)}: ${fmtTime(start)}–${fmtTime(getAppointmentEndTime(newAppointment))}`,
    );
    return;
  }
  const existing = appointments.find((item) => item.id === editingId);
  if (!existing) {
    showToast("The appointment could not be found.");
    return;
  }
  const saveMode = modalMode;
  const oldDate = existing.date;
  const oldStart = existing.start;
  const oldDentist = existing.dentist;
  const oldPatient = existing.patient;
  existing.patientId = patient.id;
  existing.patient = getPatientFullName(patient);
  existing.date = date;
  existing.start = start;
  existing.type = type;
  existing.dentist = dentist;
  existing.duration = duration;
  saveAppointmentsToStorage();
  syncAppointmentToPatient(existing);
  closeModal();
  selectedDate = keyToDate(date);
  currentCalendarDate = new Date(selectedDate);
  renderAll();
  const changedSchedule =
    oldDate !== date || oldStart !== start || oldDentist !== dentist;
  if (saveMode === "edit") {
    showToast(
      changedSchedule
        ? `${oldPatient}'s appointment was updated and rescheduled.`
        : `${oldPatient}'s appointment details were updated.`,
    );
  } else {
    showToast(
      `${oldPatient}'s appointment was rescheduled to ${formatDateLong(date)} at ${fmtTime(start)}.`,
    );
  }
}
function loadRescheduleRequests() {
  const stored = localStorage.getItem(RESCHEDULE_REQUESTS_STORAGE_KEY);
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}
function saveRescheduleRequests(requests) {
  localStorage.setItem(
    RESCHEDULE_REQUESTS_STORAGE_KEY,
    JSON.stringify(requests),
  );
}
function getRescheduleReasonLabel(reason) {
  const labels = {
    dentist_unavailable: "Dentist unavailable",
    other: "Other",
  };
  return labels[reason] || "Other";
}
function getDefaultRescheduleMessage(reason) {
  if (reason === "dentist_unavailable") {
    return "The dentist is unavailable on your scheduled date. Please select a new preferred appointment schedule.";
  }
  return "";
}
function openRescheduleRequestModal() {
  const appointment = appointments.find((item) => item.id === editingId);
  if (!appointment) {
    showToast("The appointment could not be found.");
    return;
  }
  if (
    appointment.status !== APPOINTMENT_STATUS.SCHEDULED ||
    isPastDate(appointment.date)
  ) {
    showToast("Only active scheduled appointments can request a reschedule.");
    return;
  }
  const patient = appointment.patientId
    ? findPatientById(appointment.patientId)
    : findPatientByName(appointment.patient);
  if (!patient) {
    showToast("The patient record could not be found.");
    return;
  }
  rescheduleRequestTargetId = appointment.id;
  const patientLabel = document.getElementById("rescheduleRequestPatient");
  const scheduleLabel = document.getElementById("rescheduleRequestSchedule");
  const dentistLabel = document.getElementById("rescheduleRequestDentist");
  const reasonInput = document.getElementById("rescheduleReason");
  const messageInput = document.getElementById("rescheduleMessage");
  const overlay = document.getElementById("rescheduleRequestOverlay");
  const existingRequest = loadRescheduleRequests().find(
    (request) =>
      String(request.appointmentId) === String(appointment.id) &&
      request.status === "pending",
  );
  if (patientLabel) {
    patientLabel.textContent = getPatientFullName(patient);
  }
  if (scheduleLabel) {
    scheduleLabel.textContent = `${formatDateLong(appointment.date)} · ${fmtTime(appointment.start)}–${fmtTime(getAppointmentEndTime(appointment))}`;
  }
  if (dentistLabel) {
    dentistLabel.textContent =
      dentists[appointment.dentist]?.name || appointment.dentist;
  }
  if (reasonInput) {
    reasonInput.value = existingRequest?.reason || "dentist_unavailable";
  }
  if (messageInput) {
    if (reasonInput?.value === "dentist_unavailable") {
      messageInput.value =
        existingRequest?.message ||
        getDefaultRescheduleMessage("dentist_unavailable");
    } else {
      messageInput.value = "";
    }
  }
  const sendButton = document.getElementById("sendRescheduleRequestBtn");
  if (sendButton) {
    sendButton.innerHTML = existingRequest
      ? '<i class="fa-solid fa-paper-plane"></i> Send'
      : '<i class="fa-solid fa-paper-plane"></i> Send Request';
  }
  overlay?.classList.add("show");
}
function closeRescheduleRequestModal() {
  const overlay = document.getElementById("rescheduleRequestOverlay");
  overlay?.classList.remove("show");
  rescheduleRequestTargetId = null;
}
function submitRescheduleRequest() {
  if (!rescheduleRequestTargetId) {
    return;
  }
  const appointment = appointments.find(
    (item) => item.id === rescheduleRequestTargetId,
  );
  if (!appointment) {
    closeRescheduleRequestModal();
    showToast("The appointment could not be found.");
    return;
  }
  if (
    appointment.status !== APPOINTMENT_STATUS.SCHEDULED ||
    isPastDate(appointment.date)
  ) {
    closeRescheduleRequestModal();
    showToast("Only active scheduled appointments can request a reschedule.");
    return;
  }
  const patient = appointment.patientId
    ? findPatientById(appointment.patientId)
    : findPatientByName(appointment.patient);
  if (!patient) {
    showToast("The patient record could not be found.");
    return;
  }
  const reasonInput = document.getElementById("rescheduleReason");
  const messageInput = document.getElementById("rescheduleMessage");
  const reason = reasonInput?.value || "";
  let message = messageInput?.value.trim() || "";
  if (!reason) {
    showToast("Please select a reschedule reason.");
    reasonInput?.focus();
    return;
  }
  if (reason === "dentist_unavailable" && !message) {
    message = getDefaultRescheduleMessage(reason);
  }
  if (reason === "other" && !message) {
    showToast("Please enter a message for the patient.");
    messageInput?.focus();
    return;
  }
  const requests = loadRescheduleRequests();
  const existingIndex = requests.findIndex(
    (request) =>
      String(request.appointmentId) === String(appointment.id) &&
      request.status === "pending",
  );
  const requestRecord = {
    id:
      existingIndex >= 0
        ? requests[existingIndex].id
        : `reschedule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    appointmentId: appointment.id,
    patientId: patient.id,
    patientName: getPatientFullName(patient),
    currentDate: appointment.date,
    currentTime: appointment.start,
    currentEndTime: getAppointmentEndTime(appointment),
    currentDentist: appointment.dentist,
    currentDentistName:
      dentists[appointment.dentist]?.name || appointment.dentist,
    service: appointment.type,
    reason,
    reasonLabel: getRescheduleReasonLabel(reason),
    message,
    status: "pending",
    createdAt:
      existingIndex >= 0
        ? requests[existingIndex].createdAt
        : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  if (existingIndex >= 0) {
    requests[existingIndex] = requestRecord;
  } else {
    requests.push(requestRecord);
  }
  saveRescheduleRequests(requests);
  appointment.rescheduleRequest = {
    id: requestRecord.id,
    status: "pending",
    reason: requestRecord.reason,
    reasonLabel: requestRecord.reasonLabel,
    message: requestRecord.message,
    createdAt: requestRecord.createdAt,
    updatedAt: requestRecord.updatedAt,
  };
  saveAppointmentsToStorage();
  syncAppointmentToPatient(appointment);
  closeRescheduleRequestModal();
  closeModal();
  renderAll();
  showToast(`Reschedule request sent to ${getPatientFullName(patient)}.`);
}
function deleteAppt() {
  if (!editingId) return;
  const appt = appointments.find((item) => item.id === editingId);
  if (!appt) return;
  deleteTargetId = appt.id;
  document.getElementById("deleteConfirmMessage").textContent =
    `Are you sure you want to delete ${appt.patient}'s appointment on ${formatDateLong(appt.date)} at ${fmtTime(appt.start)}? This action cannot be undone.`;
  document.getElementById("deleteConfirmOverlay").classList.add("show");
}
function closeDeleteConfirmation() {
  deleteTargetId = null;
  document.getElementById("deleteConfirmOverlay").classList.remove("show");
}
function confirmDeleteAppt() {
  if (!deleteTargetId) {
    return;
  }
  const target = appointments.find((item) => item.id === deleteTargetId);
  if (!target) {
    closeDeleteConfirmation();
    return;
  }
  removeAppointmentFromPatient(target);
  const requests = loadRescheduleRequests().filter(
    (request) => String(request.appointmentId) !== String(deleteTargetId),
  );
  saveRescheduleRequests(requests);
  appointments = appointments.filter((item) => item.id !== deleteTargetId);
  saveAppointmentsToStorage();
  synchronizeAllPatientAppointments();
  closeDeleteConfirmation();
  closeModal();
  renderAll();
  showToast(`${target.patient}'s appointment was deleted.`);
}
function checkInAppointment(id) {
  const appt = appointments.find((item) => item.id === id);
  if (!appt) return;
  if (appt.status !== APPOINTMENT_STATUS.SCHEDULED || !isToday(appt.date)) {
    showToast("Check In is available only on the appointment date.");
    return;
  }
  appt.status = APPOINTMENT_STATUS.IN_CONSULTATION;
  appt.checkedIn = true;
  appt.checkedInAt = new Date().toISOString();
  appt.consultationStarted = true;
  appt.manualReadyComplete = false;
  saveAppointmentsToStorage();
  syncAppointmentToPatient(appt);
  renderAll();
  showToast(
    `${appt.patient} has been checked in and the consultation has started.`,
  );
}
function startConsultation(id) {
  const appt = appointments.find((item) => item.id === id);
  if (!appt || appt.status !== APPOINTMENT_STATUS.IN_CONSULTATION) {
    return;
  }
  appt.checkedIn = true;
  appt.consultationStarted = true;
  saveAppointmentsToStorage();
  syncAppointmentToPatient(appt);
  renderAll();
  showToast(`${appt.patient}'s consultation has started.`);
}
function recordPaymentForAppointment(id) {
  const appt = appointments.find((item) => item.id === id);
  if (!appt || appt.status !== APPOINTMENT_STATUS.COMPLETED) {
    return;
  }
  const dentist = dentists[appt.dentist] || {};
  const pendingPayment = {
    appointmentId: appt.id,
    patientId: appt.patientId,
    patientName: appt.patient,
    dentistId: appt.dentist,
    dentistName: dentist.name || appt.dentist,
    service: appt.type,
    appointmentDate: appt.date,
    appointmentTime: appt.start,
    duration: appt.duration,
    amount: Number(appt.paymentAmount) || 0,
    paymentStatus: appt.paymentStatus || "unpaid",
    source: "appointment",
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(
    FINANCE_PENDING_PAYMENT_KEY,
    JSON.stringify(pendingPayment),
  );
  window.location.href = FINANCE_PAGE_URL;
}
function openStatusConfirmation(id, actionType) {
  const appt = appointments.find((item) => item.id === id);
  if (!appt) return;
  statusActionTargetId = id;
  statusActionType = actionType;
  const overlay = document.getElementById("statusConfirmOverlay");
  const title = document.getElementById("statusConfirmTitle");
  const message = document.getElementById("statusConfirmMessage");
  const button = document.getElementById("statusConfirmButton");
  const icon = document.getElementById("statusConfirmIcon");
  if (actionType === "finishConsultation") {
    title.textContent = "Finish Consultation?";
    message.textContent = `Are you sure you want to finish ${appt.patient}'s consultation? The appointment will move to Ready to Complete.`;
    button.textContent = "Yes, Finish";
    if (icon) {
      icon.innerHTML = "";
    }
  }
  if (actionType === "completeAppointment") {
    title.textContent = "Complete Appointment?";
    message.textContent = `Are you sure you want to mark ${appt.patient}'s appointment as completed?`;
    button.textContent = "Yes, Complete";
    if (icon) {
      icon.innerHTML = "";
    }
  }
  if (actionType === "markNoShow") {
    title.textContent = "Mark as No Show?";
    message.textContent = `${appt.patient}'s ${fmtTime(appt.start)} appointment has not been checked in. Once marked as No Show, the Check In button will no longer be available.`;
    button.textContent = "Yes, Mark No Show";
    if (icon) {
      icon.innerHTML = "";
    }
  }
  overlay.classList.add("show");
}
function closeStatusConfirmation() {
  statusActionTargetId = null;
  statusActionType = null;
  const icon = document.getElementById("statusConfirmIcon");
  if (icon) {
    icon.innerHTML = "";
    icon.classList.remove("status-confirm-icon-warning");
  }
  document.getElementById("statusConfirmOverlay").classList.remove("show");
}
function confirmStatusAction() {
  if (!statusActionTargetId || !statusActionType) {
    return;
  }
  const appt = appointments.find((item) => item.id === statusActionTargetId);
  if (!appt) {
    closeStatusConfirmation();
    return;
  }
  if (statusActionType === "finishConsultation") {
    if (appt.status !== APPOINTMENT_STATUS.IN_CONSULTATION) {
      closeStatusConfirmation();
      return;
    }
    appt.status = APPOINTMENT_STATUS.READY_COMPLETE;
    appt.consultationStarted = false;
    appt.manualReadyComplete = true;
    saveAppointmentsToStorage();
    syncAppointmentToPatient(appt);
    closeStatusConfirmation();
    renderAll();
    showToast(
      `${appt.patient}'s consultation is finished. Please confirm Complete.`,
    );
    return;
  }
  if (statusActionType === "completeAppointment") {
    if (appt.status !== APPOINTMENT_STATUS.READY_COMPLETE) {
      closeStatusConfirmation();
      return;
    }
    appt.status = APPOINTMENT_STATUS.COMPLETED;
    appt.checkedIn = true;
    appt.consultationStarted = false;
    appt.manualReadyComplete = false;
    saveAppointmentsToStorage();
    syncAppointmentToPatient(appt);
    closeStatusConfirmation();
    renderAll();
    showToast(
      `${appt.patient}'s appointment is now Completed. You can record the payment in Finance.`,
    );
    return;
  }
  if (statusActionType === "markNoShow") {
    if (appt.status !== APPOINTMENT_STATUS.SCHEDULED || !isToday(appt.date)) {
      closeStatusConfirmation();
      showToast("Mark No Show is available only on the appointment date.");
      return;
    }
    appt.status = APPOINTMENT_STATUS.NO_SHOW;
    appt.checkedIn = false;
    appt.checkedInAt = null;
    appt.consultationStarted = false;
    appt.manualReadyComplete = false;
    saveAppointmentsToStorage();
    syncAppointmentToPatient(appt);
    closeStatusConfirmation();
    renderAll();
    showToast(`${appt.patient} has been marked as No Show.`);
  }
}
function createAppointmentStatusButton(appt) {
  const wrapper = document.createElement("div");
  wrapper.className = "appt-status-area";
  if (appt.status === APPOINTMENT_STATUS.SCHEDULED) {
    if (!isToday(appt.date)) {
      const badge = document.createElement("span");
      badge.className = "appt-status-badge scheduled";
      badge.textContent = "Scheduled";
      wrapper.appendChild(badge);
      return wrapper;
    }
    const checkInBtn = document.createElement("button");
    checkInBtn.type = "button";
    checkInBtn.className = "appt-status-btn status-checkin";
    checkInBtn.textContent = "Check In";
    checkInBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      checkInAppointment(appt.id);
    });
    wrapper.appendChild(checkInBtn);
    if (isNoShowEligible(appt)) {
      const noShowBtn = document.createElement("button");
      noShowBtn.type = "button";
      noShowBtn.className = "appt-status-btn status-noshow";
      noShowBtn.textContent = "Mark No Show";
      noShowBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        openStatusConfirmation(appt.id, "markNoShow");
      });
      wrapper.appendChild(noShowBtn);
    }
    return wrapper;
  }
  if (appt.status === APPOINTMENT_STATUS.IN_CONSULTATION) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "appt-status-btn status-consultation";
    button.textContent = "In Consultation";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openStatusConfirmation(appt.id, "finishConsultation");
    });
    wrapper.appendChild(button);
    return wrapper;
  }
  if (appt.status === APPOINTMENT_STATUS.READY_COMPLETE) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "appt-status-btn status-complete";
    button.textContent = "Complete";
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openStatusConfirmation(appt.id, "completeAppointment");
    });
    wrapper.appendChild(button);
    return wrapper;
  }
  if (appt.status === APPOINTMENT_STATUS.COMPLETED) {
    const badge = document.createElement("span");
    badge.className = "appt-status-badge completed";
    badge.textContent = "Completed";
    wrapper.appendChild(badge);
    const paymentBtn = document.createElement("button");
    paymentBtn.type = "button";
    paymentBtn.className = "appt-status-btn status-payment";
    if (appt.paymentStatus === "paid") {
      paymentBtn.textContent = "Paid";
      paymentBtn.classList.add("payment-paid");
      paymentBtn.disabled = true;
    } else {
      paymentBtn.textContent = "Record Payment";
      paymentBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        recordPaymentForAppointment(appt.id);
      });
    }
    wrapper.appendChild(paymentBtn);
    return wrapper;
  }
  if (appt.status === APPOINTMENT_STATUS.NO_SHOW) {
    const badge = document.createElement("span");
    badge.className = "appt-status-badge no-show";
    badge.textContent = "No Show";
    wrapper.appendChild(badge);
    return wrapper;
  }
  return wrapper;
}
function updateAppointmentSideTitle() {
  const header = document.getElementById("waitingQueueHeader");
  if (!header) return;
  const title = header.querySelector("h3");
  const description = header.querySelector(".side-section-description");
  const switchButton = document.getElementById("showWaitingBtn");
  const selectedKey = dateToKey(selectedDate);
  const selected = keyToDate(selectedKey);
  const dateLabel = selected.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  if (title) {
    title.textContent = isToday(selectedKey)
      ? "Today's Appointments"
      : `${dateLabel} Appointments`;
  }
  if (description) {
    description.textContent = isToday(selectedKey)
      ? "Appointments scheduled for today and current status"
      : isPastDate(selectedKey)
        ? "Appointment history for this date"
        : "Upcoming appointments scheduled for this date";
  }
  if (switchButton) {
    const label = switchButton.querySelector("span");
    if (label) {
      label.textContent = isToday(selectedKey)
        ? "Today's Appointments"
        : "Appointment";
    }
  }
}
function renderAll() {
  updateAutomaticAppointmentStatuses();
  renderCalendar();
  renderScheduleOverview();
  renderTimeline();
  renderWaitingQueue();
  renderRealtimeDentistsDuty();
  updateAppointmentSideTitle();
}
function renderScheduleOverview() {
  const scheduled = document.getElementById("summaryScheduled");
  const inConsultation =
    document.getElementById("summaryInConsultation") ||
    document.getElementById("summaryWaiting");
  const completed = document.getElementById("summaryCompleted");
  const selectedKey = dateToKey(selectedDate);
  const dayAppointments = appointments
    .filter((appt) => appt.date === selectedKey)
    .filter((appt) => appt.dentist === selectedDentistFilter);
  const scheduledCount = dayAppointments.filter(
    (appt) => appt.status === APPOINTMENT_STATUS.SCHEDULED,
  ).length;
  const inConsultationCount = dayAppointments.filter(
    (appt) => appt.status === APPOINTMENT_STATUS.IN_CONSULTATION,
  ).length;
  const completedCount = dayAppointments.filter(
    (appt) => appt.status === APPOINTMENT_STATUS.COMPLETED,
  ).length;
  if (scheduled) {
    scheduled.textContent = scheduledCount;
  }
  if (inConsultation) {
    inConsultation.textContent = inConsultationCount;
    if (!document.getElementById("summaryInConsultation")) {
      const card = inConsultation.closest("div");
      const label = card
        ? Array.from(card.querySelectorAll("span,div,p")).find(
            (element) =>
              element.childElementCount === 0 &&
              element.textContent.trim() === "Waiting",
          )
        : null;
      if (label) label.textContent = "In Consultation";
    }
  }
  if (completed) {
    completed.textContent = completedCount;
  }
}
function renderCalendar() {
  const grid = document.getElementById("calGrid");
  const label = document.getElementById("calMonthLabel");
  if (!grid || !label) {
    return;
  }
  grid.innerHTML = "";
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  label.textContent = currentCalendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((day) => {
    const element = document.createElement("div");
    element.className = "dow";
    element.textContent = day;
    grid.appendChild(element);
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const date = new Date(year, month, -i);
    grid.appendChild(makeDayBtn(date, true));
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    grid.appendChild(makeDayBtn(date, false));
  }
  const totalCells = firstDay + daysInMonth;
  const remaining = 42 - totalCells;
  for (let day = 1; day <= remaining; day++) {
    const date = new Date(year, month + 1, day);
    grid.appendChild(makeDayBtn(date, true));
  }
}
function makeDayBtn(date, muted) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "day";
  const key = dateToKey(date);
  if (muted) {
    button.classList.add("muted");
  }
  if (dateToKey(selectedDate) === key) {
    button.classList.add("selected");
  }
  if (isToday(date)) {
    button.classList.add("today");
  }
  if (appointments.some((appt) => appt.date === key)) {
    button.classList.add("has-appt");
  }
  button.textContent = date.getDate();
  button.addEventListener("click", () => {
    selectedDate = new Date(date);
    renderAll();
  });
  return button;
}
function shiftMonth(offset) {
  currentCalendarDate = new Date(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth() + offset,
    1,
  );
  renderCalendar();
}
function filteredAppts() {
  const dateKey = dateToKey(selectedDate);
  const search = (document.getElementById("searchInput")?.value || "")
    .trim()
    .toLowerCase();
  return appointments
    .filter((appt) => appt.date === dateKey)
    .filter((appt) => appt.dentist === selectedDentistFilter)
    .filter((appt) => {
      if (!search) {
        return true;
      }
      const patient = findPatientById(appt.patientId);
      const patientName = String(
        appt.patient || (patient ? getPatientFullName(patient) : ""),
      ).toLowerCase();
      const patientId = String(
        appt.patientId || patient?.id || "",
      ).toLowerCase();
      const patientPhone = String(
        patient?.phone || patient?.contactNumber || patient?.contact || "",
      ).toLowerCase();
      const patientEmail = String(patient?.email || "").toLowerCase();
      const service = String(appt.type || appt.service || "").toLowerCase();
      const dentistName = String(
        dentists[appt.dentist]?.name || appt.dentist || "",
      ).toLowerCase();
      return [
        patientName,
        patientId,
        patientPhone,
        patientEmail,
        service,
        dentistName,
      ].some((value) => value.includes(search));
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}
function renderTimeline() {
  const timeline = document.getElementById("timeline");
  const title = document.getElementById("scheduleTitle");
  const dateLabel = document.getElementById("scheduleDateLabel");
  if (!timeline) {
    return;
  }
  timeline.innerHTML = "";
  const selectedKey = dateToKey(selectedDate);
  const selectedIsToday = isToday(selectedKey);
  const selectedIsPast = isPastDate(selectedKey);
  if (title) {
    title.textContent = selectedIsToday
      ? "Today's Schedule"
      : selectedIsPast
        ? "Appointment History"
        : "Upcoming Schedule";
  }
  if (dateLabel) {
    dateLabel.textContent = formatDateLong(selectedKey);
  }
  const dayAppointments = filteredAppts();
  for (
    let minutes = FIRST_BOOKABLE_HOUR * 60;
    minutes < END_HOUR * 60;
    minutes += SLOT_MIN
  ) {
    const row = document.createElement("div");
    row.className = "tl-row";
    const time = minutesToTime(minutes);
    const timeElement = document.createElement("div");
    timeElement.className = "tl-time";
    timeElement.textContent = fmtTime(time);
    const slot = document.createElement("div");
    slot.className = "tl-slot";
    const activeAppointments = dayAppointments.filter((appt) => {
      const start = timeToMinutes(appt.start);
      const end = getAppointmentEnd(appt);
      return minutes >= start && minutes < end;
    });
    if (activeAppointments.length) {
      activeAppointments.forEach((appt) => {
        const appointmentStart = timeToMinutes(appt.start);
        if (appointmentStart === minutes) {
          slot.appendChild(createAppointmentCard(appt));
        } else {
          const occupied = document.createElement("div");
          occupied.className = "occupied-slot";
          occupied.innerHTML = `Occupied · ${fmtTime(appt.start)}–${fmtTime(getAppointmentEndTime(appt))}`;
          occupied.addEventListener("click", () => openViewModal(appt.id));
          slot.appendChild(occupied);
        }
      });
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-slot";
      const slotIsPastToday =
        selectedIsToday && timeToMinutes(time) <= getCurrentTimeMinutes();
      if (selectedIsPast) {
        empty.textContent = "No appointment recorded";
        empty.style.cursor = "default";
      } else if (slotIsPastToday) {
        empty.textContent = "Closed";
        empty.style.cursor = "default";
      } else {
        empty.innerHTML = '<span class="plus">+</span> Open';
        empty.addEventListener("click", () => openNewModal(selectedKey, time));
      }
      slot.appendChild(empty);
    }
    row.appendChild(timeElement);
    row.appendChild(slot);
    timeline.appendChild(row);
  }
}
function createAppointmentCard(appt) {
  const card = document.createElement("div");
  card.className = "appt-card";
  const dentist = dentists[appt.dentist] || dentists.santos;
  card.style.borderLeftColor = dentist.color;
  card.dataset.status = appt.status;
  const info = document.createElement("div");
  info.style.display = "flex";
  info.style.alignItems = "center";
  info.style.flex = "1";
  info.style.minWidth = "0";
  let workflowText = "";
  if (appt.status === APPOINTMENT_STATUS.IN_CONSULTATION) {
    workflowText = " · In Consultation";
  } else if (appt.status === APPOINTMENT_STATUS.READY_COMPLETE) {
    workflowText = " · Complete";
  }
  info.innerHTML = `<div class="tooth-badge" style="background:${hexToRgba(dentist.color, 0.12)};color:${dentist.color};"><i class="fa-solid fa-tooth"></i></div><div class="appt-info" style="margin-left:14px;"><div class="pname">${escapeHtml(appt.patient)}</div><div class="ptype">${escapeHtml(appt.type)} · ${escapeHtml(dentist.name)}${workflowText}</div></div>`;
  const time = document.createElement("div");
  time.className = "appt-time-range";
  time.textContent = `${fmtTime(appt.start)} – ${fmtTime(getAppointmentEndTime(appt))}`;
  const statusArea = createAppointmentStatusButton(appt);
  card.appendChild(info);
  card.appendChild(time);
  card.appendChild(statusArea);
  card.addEventListener("click", () => openViewModal(appt.id));
  return card;
}
function renderWaitingQueue() {
  const list = document.getElementById("waitingQueueList");
  if (!list) return;
  list.innerHTML = "";
  const selectedKey = dateToKey(selectedDate);
  const selectedIsToday = isToday(selectedKey);
  const selectedIsPast = isPastDate(selectedKey);
  const search = (document.getElementById("searchInput")?.value || "")
    .trim()
    .toLowerCase();
  const selectedAppointments = appointments
    .filter((appt) => appt.date === selectedKey)
    .filter((appt) => appt.dentist === selectedDentistFilter)
    .filter((appt) => {
      if (selectedIsPast) return true;
      if (selectedIsToday) {
        return (
          appt.status !== APPOINTMENT_STATUS.COMPLETED &&
          appt.status !== APPOINTMENT_STATUS.NO_SHOW
        );
      }
      return appt.status === APPOINTMENT_STATUS.SCHEDULED;
    })
    .filter((appt) => {
      if (!search) return true;
      const patient = findPatientById(appt.patientId);
      const patientName = String(
        appt.patient || (patient ? getPatientFullName(patient) : ""),
      ).toLowerCase();
      const patientId = String(
        appt.patientId || patient?.id || "",
      ).toLowerCase();
      const service = String(appt.type || appt.service || "").toLowerCase();
      return [patientName, patientId, service].some((value) =>
        value.includes(search),
      );
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  if (!selectedAppointments.length) {
    const empty = document.createElement("div");
    empty.className = "empty-queue";
    empty.textContent = selectedIsToday
      ? "No appointments for today."
      : selectedIsPast
        ? "No appointments recorded for this date."
        : "No scheduled appointments for this date.";
    list.appendChild(empty);
    return;
  }
  selectedAppointments.forEach((appt) => {
    const item = document.createElement("div");
    item.className = "queue-item";
    const initials = getInitials(appt.patient);
    const dentist = dentists[appt.dentist] || dentists.santos;
    const statusText = getStatusLabel(appt.status);
    item.innerHTML = `<div class="queue-main"><div class="queue-avatar" style="background:${hexToRgba(dentist.color, 0.12)};color:${dentist.color};">${initials}</div><div class="queue-text"><span class="queue-name">${escapeHtml(appt.patient)}</span><span class="queue-time">Time ${escapeHtml(fmtTime(appt.start))}</span><span class="queue-dentist">${escapeHtml(dentist.name)}</span></div></div><div class="queue-type">${escapeHtml(statusText)}</div>`;
    item.addEventListener("click", () => openViewModal(appt.id));
    list.appendChild(item);
  });
}
function renderRealtimeDentistsDuty() {
  const list = document.getElementById("dentistsDutyList");
  if (!list) return;
  list.innerHTML = "";
  const selectedKey = dateToKey(selectedDate);
  const visibleDentistId = selectedDentistFilter || "santos";
  const dentist = dentists[visibleDentistId] || dentists.santos;
  const doctorAppointments = appointments
    .filter(
      (appt) => appt.date === selectedKey && appt.dentist === visibleDentistId,
    )
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let status = "Available";
  let nextTimeText = "";
  let statusClass = "status-badge-available";
  const isInactive = (appt) =>
    appt.status === APPOINTMENT_STATUS.COMPLETED ||
    appt.status === APPOINTMENT_STATUS.NO_SHOW;
  if (isToday(selectedKey)) {
    const currentAppointment = doctorAppointments.find((appt) => {
      const start = timeToMinutes(appt.start);
      const end = getAppointmentEnd(appt);
      return nowMinutes >= start && nowMinutes < end && !isInactive(appt);
    });
    if (currentAppointment) {
      status = `${getStatusLabel(currentAppointment.status)} · ${currentAppointment.patient}`;
      statusClass = "status-badge-busy";
    } else if (doctorAppointments.length) {
      const nextAppt = doctorAppointments.find(
        (appt) => timeToMinutes(appt.start) >= nowMinutes && !isInactive(appt),
      );
      if (nextAppt) {
        status = "Available";
        nextTimeText = `Next ${fmtTime(nextAppt.start)}`;
      }
    }
  } else if (!isPastDate(selectedKey) && doctorAppointments.length) {
    const activeCount = doctorAppointments.filter(
      (appt) => !isInactive(appt),
    ).length;
    status = `${activeCount} appointment${activeCount !== 1 ? "s" : ""} scheduled`;
  }
  if (isPastDate(selectedKey)) {
    status = doctorAppointments.length
      ? `${doctorAppointments.length} recorded appointment${doctorAppointments.length > 1 ? "s" : ""}`
      : "No recorded appointments";
  }
  const card = document.createElement("div");
  card.className = "doc-duty-card";
  const initials = getInitials(dentist.name.replace("Dr. ", ""));
  const nextTimeHtml = nextTimeText
    ? `<span class="doc-next-time">${escapeHtml(nextTimeText)}</span>`
    : "";
  card.innerHTML = `<div class="doc-duty-main"><div class="doc-avatar-dot" style="background:${hexToRgba(dentist.color, 0.12)};color:${dentist.color};">${initials}</div><div class="doc-duty-info"><strong>${escapeHtml(dentist.name)}</strong><span class="spec-label">${escapeHtml(dentist.specialty)}</span></div></div><div class="doc-status-col"><span class="${statusClass}">${escapeHtml(status)}</span>${nextTimeHtml}</div>`;
  list.appendChild(card);
}
function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = parseInt(value.substring(0, 2), 16);
  const g = parseInt(value.substring(2, 4), 16);
  const b = parseInt(value.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
document.addEventListener("click", (event) => {
  const overlay = document.getElementById("overlay");
  const deleteOverlay = document.getElementById("deleteConfirmOverlay");
  const statusOverlay = document.getElementById("statusConfirmOverlay");
  const rescheduleRequestOverlay = document.getElementById(
    "rescheduleRequestOverlay",
  );
  const serviceWrapper = document.getElementById("serviceSelectWrapper");
  const patientWrapper = document.getElementById("patientSelectWrapper");
  const timeWrapper = document.getElementById("timeFieldWrapper");
  if (event.target === overlay) {
    closeModal();
  }
  if (event.target === deleteOverlay) {
    closeDeleteConfirmation();
  }
  if (event.target === statusOverlay) {
    closeStatusConfirmation();
  }
  if (event.target === rescheduleRequestOverlay) {
    closeRescheduleRequestModal();
  }
  if (serviceWrapper && !serviceWrapper.contains(event.target)) {
    closeServiceDropdown();
  }
  if (patientWrapper && !patientWrapper.contains(event.target)) {
    closePatientDropdown();
  }
  if (timeWrapper && !timeWrapper.contains(event.target)) {
    closeTimePicker();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }
  const statusOverlay = document.getElementById("statusConfirmOverlay");
  const deleteOverlay = document.getElementById("deleteConfirmOverlay");
  const rescheduleRequestOverlay = document.getElementById(
    "rescheduleRequestOverlay",
  );
  if (
    rescheduleRequestOverlay &&
    rescheduleRequestOverlay.classList.contains("show")
  ) {
    closeRescheduleRequestModal();
    return;
  }
  if (statusOverlay && statusOverlay.classList.contains("show")) {
    closeStatusConfirmation();
    return;
  }
  if (deleteOverlay && deleteOverlay.classList.contains("show")) {
    closeDeleteConfirmation();
    return;
  }
  closeTimePicker();
  closeModal();
});
document.addEventListener("DOMContentLoaded", () => {
  setupPatientDatalist();
});
