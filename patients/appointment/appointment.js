const APPOINTMENTS_STORAGE_KEY = "appointments";
const LEGACY_STORAGE_KEY = "dentanueva_appointments";
const PATIENTS_STORAGE_KEY = "dentanueva_patients";
const CURRENT_USER_KEY = "currentUser";
const RESCHEDULE_REQUESTS_STORAGE_KEY = "dentanueva_reschedule_requests";
const SERVICES = [
  { id: "consultation", name: "Consultation", duration: 30 },
  { id: "dental_cleaning", name: "Dental Cleaning", duration: 45 },
  { id: "tooth_filling", name: "Tooth Filling / Pasta", duration: 45 },
  { id: "tooth_extraction", name: "Tooth Extraction", duration: 60 },
  { id: "root_canal", name: "Root Canal", duration: 90 },
  { id: "braces_adjustment", name: "Braces Adjustment", duration: 30 },
  { id: "teeth_whitening", name: "Teeth Whitening", duration: 60 },
  { id: "dental_xray", name: "Dental X-Ray", duration: 15 },
  { id: "scaling_polishing", name: "Scaling and Polishing", duration: 45 },
  { id: "denture_fitting", name: "Denture Fitting", duration: 60 },
  {
    id: "wisdom_tooth_extraction",
    name: "Wisdom Tooth Extraction",
    duration: 75,
  },
  {
    id: "dental_implant_consultation",
    name: "Dental Implant Consultation",
    duration: 30,
  },
  { id: "oral_prophylaxis", name: "Oral Prophylaxis", duration: 45 },
  { id: "retainer_fitting", name: "Retainer Fitting", duration: 30 },
];
const DENTISTS = {
  santos: {
    id: "santos",
    name: "Dr. M. Santos",
    specialization: "General Dentistry",
    initials: "MS",
    avatarClass: "avatar-green",
  },
  cruz: {
    id: "cruz",
    name: "Dr. L. Cruz",
    specialization: "Orthodontics",
    initials: "LC",
    avatarClass: "avatar-blue",
  },
  ramos: {
    id: "ramos",
    name: "Dr. J. Ramos",
    specialization: "Oral Surgery",
    initials: "JR",
    avatarClass: "avatar-purple",
  },
};
const CLINIC_SCHEDULE = { startHour: 10, endHour: 20, slotMinutes: 30 };

let patients = [];
let appointments = [];
let currentPatient = null;
let currentUser = null;
let selectedDate = new Date();
let selectedTime = "";
let detailAppointmentId = null;
let requestAppointmentId = null;
let requestTime = "";
let staffRequestTargetId = null;
let staffRequestTime = "";
let calendarDate = new Date();

document.addEventListener("DOMContentLoaded", initializePage);

function initializePage() {
  currentUser = getCurrentUser();
  loadPatients();
  loadAppointments();
  resolveCurrentPatient();
  normalizeSelectedDate();
  normalizeCalendarDate();
  setupEvents();
  renderAll();
  window.addEventListener("storage", handleStorageChange);
  setInterval(() => {
    currentUser = getCurrentUser();
    loadPatients();
    loadAppointments();
    resolveCurrentPatient();
    normalizeSelectedDate();
    renderAll();
  }, 30000);
}

function setupEvents() {
  document
    .getElementById("openBookingBtn")
    ?.addEventListener("click", () => openBookingModal());
  document
    .getElementById("closeBookingModal")
    ?.addEventListener("click", closeBookingModal);
  document
    .getElementById("cancelBooking")
    ?.addEventListener("click", closeBookingModal);
  document
    .getElementById("confirmBooking")
    ?.addEventListener("click", confirmBooking);
  document
    .getElementById("closeAppointmentModal")
    ?.addEventListener("click", closeAppointmentDetail);
  document
    .getElementById("closeAppointmentDetail")
    ?.addEventListener("click", closeAppointmentDetail);
  document
    .getElementById("requestRescheduleBtn")
    ?.addEventListener("click", openRescheduleRequestModal);
  document
    .getElementById("closeRescheduleRequestModal")
    ?.addEventListener("click", closeRescheduleRequestModal);
  document
    .getElementById("cancelRescheduleRequest")
    ?.addEventListener("click", closeRescheduleRequestModal);
  document
    .getElementById("sendRescheduleRequest")
    ?.addEventListener("click", sendRescheduleRequest);
  document
    .getElementById("closeStaffRescheduleModal")
    ?.addEventListener("click", closeStaffRescheduleModal);
  document
    .getElementById("cancelStaffReschedule")
    ?.addEventListener("click", closeStaffRescheduleModal);
  document
    .getElementById("confirmStaffReschedule")
    ?.addEventListener("click", confirmStaffRescheduleResponse);
  document
    .getElementById("staffRequestDate")
    ?.addEventListener("change", handleStaffRequestDateChange);
  document
    .getElementById("rescheduleAlertButton")
    ?.addEventListener("click", handleRescheduleAlert);
  document
    .getElementById("serviceInput")
    ?.addEventListener("input", handleServiceInput);
  document
    .getElementById("serviceInput")
    ?.addEventListener("focus", () => openServiceDropdown());
  document.getElementById("dateSelect")?.addEventListener("change", (event) => {
    const value = event.target.value;
    if (!value || isPastDate(value)) {
      event.target.value = dateToKey(new Date());
      selectedDate = new Date();
    } else {
      selectedDate = keyToDate(value);
    }
    selectedTime = "";
    calendarDate = new Date(selectedDate);
    calendarDate.setDate(1);
    renderCalendar();
    updateAvailableTimeSlots();
    updateBookingButton();
  });
  document.getElementById("dentistSelect")?.addEventListener("change", () => {
    selectedTime = "";
    updateAvailableTimeSlots();
    updateBookingButton();
  });
  document
    .getElementById("timeTrigger")
    ?.addEventListener("click", toggleTimePicker);
  document
    .getElementById("requestDate")
    ?.addEventListener("change", handleRequestDateChange);
  document
    .getElementById("calendarPrevBtn")
    ?.addEventListener("click", () => shiftCalendarMonth(-1));
  document
    .getElementById("calendarNextBtn")
    ?.addEventListener("click", () => shiftCalendarMonth(1));
  document.addEventListener("click", handleDocumentClick);
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (event) => {
      if (event.target !== overlay) return;
      if (overlay.id === "bookingModal") closeBookingModal();
      if (overlay.id === "appointmentModal") closeAppointmentDetail();
      if (overlay.id === "rescheduleRequestModal")
        closeRescheduleRequestModal();
      if (overlay.id === "staffRescheduleModal") closeStaffRescheduleModal();
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeServiceDropdown();
    closeTimePicker();
  });
}

function handleStorageChange(event) {
  if (event.key === CURRENT_USER_KEY) {
    currentUser = getCurrentUser();
    loadPatients();
    resolveCurrentPatient();
    normalizeSelectedDate();
    renderAll();
    return;
  }
  if (
    event.key === APPOINTMENTS_STORAGE_KEY ||
    event.key === LEGACY_STORAGE_KEY ||
    event.key === PATIENTS_STORAGE_KEY ||
    event.key === RESCHEDULE_REQUESTS_STORAGE_KEY
  ) {
    loadPatients();
    loadAppointments();
    resolveCurrentPatient();
    normalizeSelectedDate();
    renderAll();
  }
}

function renderAll() {
  renderPatientContext();
  renderCalendar();
  renderUpcomingAppointment();
  renderRescheduleAlert();
}

function renderPatientContext() {
  return;
}

function normalizeSelectedDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (
    !(selectedDate instanceof Date) ||
    Number.isNaN(selectedDate.getTime()) ||
    isPastDate(selectedDate)
  ) {
    selectedDate = today;
  }
}

function normalizeCalendarDate() {
  if (!(calendarDate instanceof Date) || Number.isNaN(calendarDate.getTime())) {
    calendarDate = new Date();
  }
  calendarDate.setDate(1);
}

function dateToKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function keyToDate(value) {
  if (!value) return new Date();
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isPastDate(value) {
  const date = value instanceof Date ? new Date(value) : keyToDate(value);
  const today = new Date();
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date < today;
}

function formatDate(dateValue) {
  const date =
    dateValue instanceof Date ? dateValue : keyToDate(String(dateValue));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateValue) {
  const date =
    dateValue instanceof Date ? dateValue : keyToDate(String(dateValue));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeValue) {
  if (!timeValue) return "";
  const parts = String(timeValue).split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return String(timeValue);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getAppointmentEndTime(appointment) {
  const time = getAppointmentTime(appointment);
  const duration = Number(
    appointment?.duration ||
      appointment?.duration_minutes ||
      appointment?.durationMinutes ||
      0,
  );

  if (!time || !duration) return "";

  const [hour, minute] = String(time).split(":").map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";

  const totalMinutes = hour * 60 + minute + duration;
  const endHour = Math.floor(totalMinutes / 60) % 24;
  const endMinute = totalMinutes % 60;

  return formatTime(
    `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`,
  );
}

function getAppointmentDate(appointment) {
  return (
    appointment?.appointment_date ||
    appointment?.appointmentDate ||
    appointment?.date ||
    ""
  );
}

function getAppointmentTime(appointment) {
  return (
    appointment?.appointment_time ||
    appointment?.appointmentTime ||
    appointment?.time ||
    appointment?.start ||
    ""
  );
}

function getAppointmentService(appointment) {
  return (
    appointment?.service ||
    appointment?.service_type ||
    appointment?.serviceType ||
    appointment?.treatment ||
    appointment?.type ||
    "Dental Appointment"
  );
}

function getDentistId(appointment) {
  return (
    appointment?.dentist_id ||
    appointment?.dentistId ||
    appointment?.dentist ||
    "santos"
  );
}

function getDentistName(appointment) {
  const dentistId = getDentistId(appointment);
  if (DENTISTS[dentistId]) return DENTISTS[dentistId].name;
  if (appointment?.dentist_name) return appointment.dentist_name;
  if (typeof dentistId === "string" && dentistId.startsWith("Dr."))
    return dentistId;
  return "Assigned Dentist";
}

function getAppointmentStatus(appointment) {
  return appointment?.status || appointment?.appointment_status || "Pending";
}

function normalizeStatus(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, "");
}

function getPatientStatusLabel(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "completed") return "Completed";
  if (normalized === "cancelled" || normalized === "canceled")
    return "Cancelled";
  if (normalized === "noshow") return "No Show";
  if (normalized === "inconsultation" || normalized === "readycomplete")
    return "In Consultation";
  return "Scheduled";
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function loadPatients() {
  try {
    const primary = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (!primary) {
      patients = [];
      return;
    }
    const parsed = JSON.parse(primary);
    patients = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.patients)
        ? parsed.patients
        : [];
  } catch {
    patients = [];
  }
}

function loadAppointments() {
  try {
    const primaryStored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
    let stored = primaryStored;
    if (!stored) stored = legacyStored;
    if (!stored) {
      appointments = [];
      return;
    }
    const parsed = JSON.parse(stored);
    const storedAppointments = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.appointments)
        ? parsed.appointments
        : [];
    appointments = storedAppointments.map((appointment) => {
      const rawPatientId =
        appointment?.patient_id ||
        appointment?.patientId ||
        appointment?.patientID ||
        "";
      const matchedPatient = findPatientByIdentifier(rawPatientId);
      const canonicalPatientId =
        getCanonicalPatientId(matchedPatient) || String(rawPatientId).trim();
      if (!canonicalPatientId) return appointment;
      return {
        ...appointment,
        patientId: canonicalPatientId,
        patient_id: canonicalPatientId,
      };
    });
  } catch {
    appointments = [];
  }
}

function saveAppointments() {
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(appointments));
}

function getPatientIdentifiers(patient) {
  return [
    patient?.patient_id,
    patient?.patientId,
    patient?.id,
    patient?.user_id,
    patient?.userId,
  ]
    .filter(
      (value) => value !== undefined && value !== null && String(value).trim(),
    )
    .map((value) => String(value).trim());
}

function getCanonicalPatientId(patient) {
  if (!patient) return "";
  const ids = getPatientIdentifiers(patient);
  const prefixedId = ids.find((value) => /^PN-\d+$/i.test(value));
  return prefixedId || ids[0] || "";
}

function findPatientByIdentifier(identifier) {
  if (
    identifier === undefined ||
    identifier === null ||
    String(identifier).trim() === ""
  )
    return null;
  const value = String(identifier).trim().toLowerCase();
  return (
    patients.find((patient) =>
      getPatientIdentifiers(patient).some((id) => id.toLowerCase() === value),
    ) || null
  );
}

function resolveCurrentPatient() {
  const currentUserPatientId = String(currentUser?.patientId || "").trim();
  const patientId =
    currentUserPatientId ||
    localStorage.getItem("currentPatientId") ||
    localStorage.getItem("patientId") ||
    localStorage.getItem("loggedInPatientId") ||
    localStorage.getItem("current_patient_id");
  const username =
    localStorage.getItem("currentPatientUsername") ||
    localStorage.getItem("username") ||
    localStorage.getItem("loggedInUsername");
  const email =
    localStorage.getItem("currentPatientEmail") ||
    localStorage.getItem("patientEmail") ||
    localStorage.getItem("email");
  currentPatient =
    findPatientByIdentifier(patientId) ||
    patients.find(
      (patient) =>
        username &&
        String(patient?.username || "").toLowerCase() ===
          String(username).toLowerCase(),
    ) ||
    patients.find(
      (patient) =>
        email &&
        String(patient?.email || "").toLowerCase() ===
          String(email).toLowerCase(),
    ) ||
    null;
  if (!currentPatient) {
    const storedPatient =
      localStorage.getItem("currentPatient") ||
      localStorage.getItem("loggedInPatient");
    if (storedPatient) {
      try {
        const parsedPatient = JSON.parse(storedPatient);
        currentPatient =
          findPatientByIdentifier(getCanonicalPatientId(parsedPatient)) ||
          findPatientByIdentifier(parsedPatient?.patient_id) ||
          findPatientByIdentifier(parsedPatient?.patientId) ||
          findPatientByIdentifier(parsedPatient?.id) ||
          findPatientByIdentifier(parsedPatient?.user_id) ||
          findPatientByIdentifier(parsedPatient?.userId) ||
          parsedPatient;
      } catch {
        currentPatient = null;
      }
    }
  }
  if (!currentPatient && (patientId || username || email)) {
    currentPatient = {
      patient_id: patientId || "",
      username: username || "",
      email: email || "",
    };
  }
}

function getCurrentPatientId() {
  const currentUserPatientId = String(currentUser?.patientId || "").trim();
  if (currentUserPatientId) {
    const patient = findPatientByIdentifier(currentUserPatientId);
    return getCanonicalPatientId(patient) || currentUserPatientId;
  }
  if (!currentPatient) return "";
  return (
    getCanonicalPatientId(currentPatient) ||
    getCanonicalPatientId(
      findPatientByIdentifier(currentPatient?.patient_id),
    ) ||
    getCanonicalPatientId(findPatientByIdentifier(currentPatient?.patientId)) ||
    getCanonicalPatientId(findPatientByIdentifier(currentPatient?.id)) ||
    getCanonicalPatientId(findPatientByIdentifier(currentPatient?.user_id)) ||
    getCanonicalPatientId(findPatientByIdentifier(currentPatient?.userId)) ||
    ""
  );
}

function getCurrentPatientName() {
  if (!currentPatient) return "Unknown Patient";
  return (
    currentPatient.full_name ||
    currentPatient.fullName ||
    currentPatient.name ||
    [currentPatient.first_name, currentPatient.last_name]
      .filter(Boolean)
      .join(" ") ||
    "Unknown Patient"
  );
}

function getPatientAppointments() {
  const patientId = getCurrentPatientId();
  if (!patientId) return appointments;
  return appointments.filter((appointment) => {
    const appointmentPatientId =
      appointment?.patient_id ||
      appointment?.patientId ||
      appointment?.patientID ||
      "";
    if (!appointmentPatientId) return false;
    return (
      getCanonicalPatientId(findPatientByIdentifier(appointmentPatientId)) ===
        patientId ||
      String(appointmentPatientId).trim().toLowerCase() ===
        patientId.toLowerCase()
    );
  });
}

function getDateAppointments(dateKey) {
  return getPatientAppointments().filter(
    (appointment) =>
      dateToKey(keyToDate(getAppointmentDate(appointment))) === dateKey,
  );
}

function renderCalendar() {
  const grid = document.getElementById("calGrid");
  const monthLabel = document.getElementById("calendarMonthLabel");
  if (!grid || !monthLabel) return;
  normalizeCalendarDate();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  monthLabel.textContent = calendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  grid.innerHTML = "";
  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  weekdays.forEach((day) => {
    const header = document.createElement("div");
    header.className = "dow";
    header.textContent = day;
    grid.appendChild(header);
  });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousMonthDays = new Date(year, month, 0).getDate();
  const patientAppointments = getPatientAppointments();
  const appointmentKeys = new Set(
    patientAppointments
      .map((appointment) => getAppointmentDate(appointment))
      .filter(Boolean)
      .map((date) => dateToKey(keyToDate(date))),
  );
  for (let index = 0; index < 42; index++) {
    let dayNumber;
    let cellDate;
    let muted = false;
    if (index < firstDay) {
      dayNumber = previousMonthDays - firstDay + index + 1;
      cellDate = new Date(year, month - 1, dayNumber);
      muted = true;
    } else if (index >= firstDay + daysInMonth) {
      dayNumber = index - firstDay - daysInMonth + 1;
      cellDate = new Date(year, month + 1, dayNumber);
      muted = true;
    } else {
      dayNumber = index - firstDay + 1;
      cellDate = new Date(year, month, dayNumber);
    }
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day";
    cell.textContent = dayNumber;
    const cellKey = dateToKey(cellDate);
    const todayKey = dateToKey(new Date());
    const selectedKey = dateToKey(selectedDate);
    if (muted) cell.classList.add("muted");
    if (cellKey < todayKey) cell.classList.add("past");
    if (cellKey === todayKey) cell.classList.add("today");
    if (cellKey === selectedKey) cell.classList.add("selected");
    if (appointmentKeys.has(cellKey)) cell.classList.add("has-appt");
    cell.setAttribute("data-date", cellKey);
    cell.addEventListener("click", () => {
      if (isPastDate(cellKey)) {
        if (!muted) showToast("Please select a current or future date.");
        return;
      }
      selectedDate = keyToDate(cellKey);
      const dateInput = document.getElementById("dateSelect");
      if (dateInput) dateInput.value = cellKey;
      selectedTime = "";
      calendarDate = new Date(selectedDate);
      calendarDate.setDate(1);
      renderCalendar();
      updateAvailableTimeSlots();
      updateBookingButton();
    });
    grid.appendChild(cell);
  }
}

function shiftCalendarMonth(direction) {
  const current = new Date(calendarDate);
  current.setDate(1);
  current.setMonth(current.getMonth() + direction);
  calendarDate = current;
  renderCalendar();
}

function renderUpcomingAppointment() {
  const container = document.getElementById("upcomingAppointment");
  if (!container) return;
  const patientAppointments = getPatientAppointments()
    .filter((appointment) => {
      const date = getAppointmentDate(appointment);
      if (!date) return false;
      const appointmentDate = keyToDate(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      appointmentDate.setHours(0, 0, 0, 0);
      return appointmentDate >= today;
    })
    .filter((appointment) => {
      const status = normalizeStatus(getAppointmentStatus(appointment));
      return (
        status !== "cancelled" &&
        status !== "canceled" &&
        status !== "completed" &&
        status !== "noshow"
      );
    })
    .sort((a, b) => {
      const dateA = `${getAppointmentDate(a)} ${getAppointmentTime(a)}`;
      const dateB = `${getAppointmentDate(b)} ${getAppointmentTime(b)}`;
      return dateA.localeCompare(dateB);
    });
  const appointment = patientAppointments[0];
  if (!appointment) {
    container.innerHTML = `
      <div class="empty-upcoming">
        <div class="empty-upcoming-icon">
          <i class="fa-regular fa-calendar-xmark"></i>
        </div>
        <p>You currently have no scheduled dental appointment.</p>
      </div>
    `;
    return;
  }
  const date = getAppointmentDate(appointment);
  const time = getAppointmentTime(appointment);
  const endTime = getAppointmentEndTime(appointment);
  const service = getAppointmentService(appointment);
  const dentist = getDentistName(appointment);
  const patientName = getCurrentPatientName();
  const patientParts = patientName.trim().split(/\s+/).filter(Boolean);
  const initials =
    patientParts.length > 1
      ? `${patientParts[0][0]}${patientParts[patientParts.length - 1][0]}`
      : patientParts[0]?.slice(0, 2) || "PT";
  const rawStatus = getAppointmentStatus(appointment);
  const statusLabel = getPatientStatusLabel(rawStatus);
  const statusClass = getStatusClass(rawStatus);
  container.innerHTML = `
    <div class="upcoming-card-content">
      <div>
        <div class="upcoming-patient-avatar">${escapeHtml(initials.toUpperCase())}</div>
        <div class="upcoming-patient-info">
          <strong>${escapeHtml(patientName)}</strong>
          <span>${escapeHtml(service)} • ${escapeHtml(dentist)}</span>
          <span class="detail-status ${statusClass}" style="margin-top:6px;">${escapeHtml(statusLabel)}</span>
        </div>
      </div>
      <div class="upcoming-schedule">
  <div class="upcoming-date">
    <span class="upcoming-schedule-label">Appointment Date</span>
    <strong>${escapeHtml(formatDate(date))}</strong>
  </div>

  <div class="upcoming-time-range">
    <div>
      <span class="upcoming-schedule-label">Start Time</span>
      <strong>${escapeHtml(formatTime(time))}</strong>
    </div>

    <div class="upcoming-time-arrow">
      <i class="fa-solid fa-arrow-right"></i>
    </div>

    <div>
      <span class="upcoming-schedule-label">End Time</span>
      <strong>${escapeHtml(endTime)}</strong>
    </div>
  </div>
</div>

<div class="upcoming-divider"></div>
      <div class="upcoming-actions">
        <button type="button" class="btn-secondary" data-appointment-action="details" data-appointment-id="${escapeHtml(getAppointmentId(appointment))}">
          View Details
        </button>
      </div>
    </div>
  `;
}

function updateServiceDurationInfo() {
  const info = document.getElementById("serviceDurationInfo");
  if (!info) return;
  const serviceName =
    document.getElementById("serviceInput")?.value.trim() || "";
  const service = SERVICES.find(
    (item) => item.name.toLowerCase() === serviceName.toLowerCase(),
  );
  info.textContent = service
    ? `${service.name} follows a fixed duration of ${service.duration} minutes.`
    : "Each service type follows a fixed, non-editable duration.";
}

function openBookingModal(date = null, dentist = null) {
  currentUser = getCurrentUser();
  resolveCurrentPatient();
  const modal = document.getElementById("bookingModal");
  if (!modal) return;
  const serviceInput = document.getElementById("serviceInput");
  const dentistInput = document.getElementById("dentistSelect");
  const durationInput = document.getElementById("durationInput");
  const dateInput = document.getElementById("dateSelect");
  const selectedKey =
    date && !isPastDate(date) ? date : dateToKey(selectedDate);
  if (serviceInput) serviceInput.value = "Consultation";
  if (durationInput) {
    durationInput.value = 30;
    durationInput.disabled = true;
  }
  if (dentistInput) dentistInput.value = DENTISTS[dentist] ? dentist : "santos";
  if (dateInput) {
    dateInput.min = dateToKey(new Date());
    dateInput.value = selectedKey;
  }
  selectedDate = keyToDate(selectedKey);
  calendarDate = new Date(selectedDate);
  calendarDate.setDate(1);
  selectedTime = "";
  closeServiceDropdown();
  closeTimePicker();
  renderServiceDropdown("");
  updateServiceDurationInfo();
  renderCalendar();
  updateAvailableTimeSlots();
  updateBookingButton();
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeBookingModal() {
  const modal = document.getElementById("bookingModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  closeServiceDropdown();
  closeTimePicker();
}

function handleServiceInput(event) {
  renderServiceDropdown(event.target.value);
  openServiceDropdown();
  updateServiceDurationInfo();
}

function renderServiceDropdown(searchTerm = "") {
  const dropdown = document.getElementById("serviceDropdown");
  if (!dropdown) return;
  const term = String(searchTerm || "")
    .trim()
    .toLowerCase();
  const filtered = SERVICES.filter((service) =>
    service.name.toLowerCase().includes(term),
  );
  if (!filtered.length) {
    dropdown.innerHTML = `<div class="service-dropdown-empty">No service found.</div>`;
    return;
  }
  dropdown.innerHTML = "";
  filtered.forEach((service) => {
    const item = document.createElement("div");
    item.className = "service-dropdown-item";
    item.innerHTML = `<span class="service-dropdown-name">${escapeHtml(service.name)}</span><span class="service-dropdown-duration">${service.duration} min</span>`;
    item.addEventListener("click", () => {
      const input = document.getElementById("serviceInput");
      const duration = document.getElementById("durationInput");
      if (input) input.value = service.name;
      if (duration) {
        duration.value = service.duration;
        duration.disabled = true;
      }
      selectedTime = "";
      closeServiceDropdown();
      updateServiceDurationInfo();
      updateAvailableTimeSlots();
      updateBookingButton();
    });
    dropdown.appendChild(item);
  });
}

function openServiceDropdown() {
  document.getElementById("serviceSelectWrapper")?.classList.add("open");
}

function closeServiceDropdown() {
  document.getElementById("serviceSelectWrapper")?.classList.remove("open");
}

function toggleTimePicker() {
  const trigger = document.getElementById("timeTrigger");
  const dropdown = document.getElementById("timeDropdown");
  if (!trigger || !dropdown || trigger.disabled) return;
  dropdown.classList.toggle("open");
  trigger.classList.toggle("open");
}

function closeTimePicker() {
  document.getElementById("timeDropdown")?.classList.remove("open");
  document.getElementById("timeTrigger")?.classList.remove("open");
}

function classifyBookingPeriod(minutes) {
  if (minutes < 12 * 60) return "Morning";
  if (minutes < 18 * 60) return "Afternoon";
  return "Evening";
}

function generateBookingSlotStatuses(date, dentist, duration) {
  const result = [];
  const dateObject = keyToDate(date);
  const today = new Date();
  const existingAppointments = appointments.filter(
    (appointment) =>
      dateToKey(keyToDate(getAppointmentDate(appointment))) === date &&
      String(getDentistId(appointment)) === String(dentist) &&
      isActiveAppointment(appointment),
  );
  for (
    let minutes = CLINIC_SCHEDULE.startHour * 60;
    minutes + duration <= CLINIC_SCHEDULE.endHour * 60;
    minutes += CLINIC_SCHEDULE.slotMinutes
  ) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const slotStart = new Date(
      dateObject.getFullYear(),
      dateObject.getMonth(),
      dateObject.getDate(),
      hour,
      minute,
      0,
      0,
    );
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const isPast = date === dateToKey(today) && slotStart <= today;
    const isScheduled = existingAppointments.some((appointment) => {
      const appointmentTime = getAppointmentTime(appointment);
      if (!appointmentTime) return false;
      const [appointmentHour, appointmentMinute] = appointmentTime
        .split(":")
        .map(Number);
      const appointmentStart = new Date(
        dateObject.getFullYear(),
        dateObject.getMonth(),
        dateObject.getDate(),
        appointmentHour,
        appointmentMinute || 0,
        0,
        0,
      );
      const appointmentDuration = Number(
        appointment.duration ||
          appointment.duration_minutes ||
          appointment.durationMinutes ||
          30,
      );
      const appointmentEnd = new Date(
        appointmentStart.getTime() + appointmentDuration * 60000,
      );
      return slotStart < appointmentEnd && slotEnd > appointmentStart;
    });
    result.push({
      value,
      label: formatTime(value),
      period: classifyBookingPeriod(hour * 60 + minute),
      isPast,
      isScheduled,
    });
  }
  return result;
}

function appendBookingTimeGroup(container, label, slots) {
  const groupLabel = document.createElement("div");
  groupLabel.className = "time-picker-group-label";
  groupLabel.textContent = label;
  container.appendChild(groupLabel);
  const grid = document.createElement("div");
  grid.className = "time-picker-grid";
  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-picker-option";
    if (slot.value === selectedTime) button.classList.add("selected");
    if (slot.isScheduled) {
      button.classList.add("scheduled");
      button.disabled = true;
      button.title = "This time is already scheduled.";
      button.innerHTML = `<i class="fa-solid fa-ban time-unavailable-icon"></i><span>${slot.label}</span>`;
    } else if (slot.isPast) {
      button.classList.add("disabled");
      button.disabled = true;
      button.title = "This time has already passed.";
      button.innerHTML = `<i class="fa-solid fa-clock time-past-icon"></i><span>${slot.label}</span>`;
    } else {
      button.textContent = slot.label;
      button.addEventListener("click", () => {
        selectedTime = slot.value;
        const triggerLabel = document.getElementById("timeTriggerLabel");
        if (triggerLabel) triggerLabel.textContent = slot.label;
        closeTimePicker();
        updateAvailableTimeSlots();
        updateBookingButton();
      });
    }
    grid.appendChild(button);
  });
  container.appendChild(grid);
}

function updateAvailableTimeSlots() {
  const dropdown = document.getElementById("timeDropdown");
  const trigger = document.getElementById("timeTrigger");
  const triggerLabel = document.getElementById("timeTriggerLabel");
  const summary = document.getElementById("availableTimeSummary");
  if (!dropdown || !trigger || !triggerLabel) return;
  const date =
    document.getElementById("dateSelect")?.value || dateToKey(selectedDate);
  const dentist = document.getElementById("dentistSelect")?.value || "santos";
  const duration = Number(document.getElementById("durationInput")?.value || 0);
  dropdown.innerHTML = "";
  if (!date || isPastDate(date)) {
    trigger.disabled = true;
    triggerLabel.textContent = "Select a valid date";
    if (summary) {
      summary.textContent = "";
      summary.classList.remove("warning");
    }
    return;
  }
  if (!duration || duration < 5) {
    trigger.disabled = true;
    triggerLabel.textContent = "Enter duration first";
    if (summary) {
      summary.textContent = "";
      summary.classList.remove("warning");
    }
    return;
  }
  const slots = generateBookingSlotStatuses(date, dentist, duration);
  trigger.disabled = false;
  const availableSlots = slots.filter(
    (slot) => !slot.isPast && !slot.isScheduled,
  );
  if (!slots.length) {
    triggerLabel.textContent = "No available time";
    dropdown.innerHTML = `<div class="time-picker-empty">No available time slots for this date.</div>`;
    if (summary) {
      summary.textContent =
        "The selected dentist has no available time for this duration.";
      summary.classList.add("warning");
    }
    selectedTime = "";
    updateBookingButton();
    return;
  }
  if (selectedTime) {
    const stillAvailable = availableSlots.some(
      (slot) => slot.value === selectedTime,
    );
    if (!stillAvailable) selectedTime = "";
  }
  triggerLabel.textContent = selectedTime
    ? formatTime(selectedTime)
    : "Select an available time";
  if (summary) {
    if (availableSlots.length) {
      summary.classList.remove("warning");
      summary.textContent = `${availableSlots.length} available time ${availableSlots.length === 1 ? "slot" : "slots"}`;
    } else {
      summary.classList.add("warning");
      summary.textContent =
        "No available slots for this dentist, date, and duration.";
    }
  }
  const morning = slots.filter((slot) => slot.period === "Morning");
  const afternoon = slots.filter((slot) => slot.period === "Afternoon");
  const evening = slots.filter((slot) => slot.period === "Evening");
  if (morning.length) appendBookingTimeGroup(dropdown, "Morning", morning);
  if (afternoon.length)
    appendBookingTimeGroup(dropdown, "Afternoon", afternoon);
  if (evening.length) appendBookingTimeGroup(dropdown, "Evening", evening);
  updateBookingButton();
}

function generateAvailableSlots(date, dentist, duration) {
  const result = [];
  const dateObject = keyToDate(date);
  const today = new Date();
  const existingAppointments = appointments.filter(
    (appointment) =>
      dateToKey(keyToDate(getAppointmentDate(appointment))) === date &&
      String(getDentistId(appointment)) === String(dentist) &&
      isActiveAppointment(appointment),
  );
  for (
    let minutes = CLINIC_SCHEDULE.startHour * 60;
    minutes + duration <= CLINIC_SCHEDULE.endHour * 60;
    minutes += CLINIC_SCHEDULE.slotMinutes
  ) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const slotStart = new Date(
      dateObject.getFullYear(),
      dateObject.getMonth(),
      dateObject.getDate(),
      hour,
      minute,
      0,
      0,
    );
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
    if (date === dateToKey(today) && slotStart <= today) continue;
    const conflict = existingAppointments.some((appointment) => {
      const appointmentTime = getAppointmentTime(appointment);
      if (!appointmentTime) return false;
      const [appointmentHour, appointmentMinute] = appointmentTime
        .split(":")
        .map(Number);
      const appointmentStart = new Date(
        dateObject.getFullYear(),
        dateObject.getMonth(),
        dateObject.getDate(),
        appointmentHour,
        appointmentMinute || 0,
        0,
        0,
      );
      const appointmentDuration = Number(
        appointment.duration ||
          appointment.duration_minutes ||
          appointment.durationMinutes ||
          30,
      );
      const appointmentEnd = new Date(
        appointmentStart.getTime() + appointmentDuration * 60000,
      );
      return slotStart < appointmentEnd && slotEnd > appointmentStart;
    });
    if (conflict) continue;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    result.push({ value, label: formatTime(value) });
  }
  return result;
}

function updateBookingButton() {
  const button = document.getElementById("confirmBooking");
  if (!button) return;
  const service = document.getElementById("serviceInput")?.value.trim() || "";
  const date = document.getElementById("dateSelect")?.value || "";
  const dentist = document.getElementById("dentistSelect")?.value || "";
  const duration = Number(document.getElementById("durationInput")?.value || 0);
  const conflict = selectedTime
    ? hasScheduleConflict(date, dentist, selectedTime, duration)
    : false;
  button.disabled =
    !service ||
    !date ||
    isPastDate(date) ||
    !dentist ||
    !duration ||
    duration < 5 ||
    !selectedTime ||
    !!conflict;
  updateConflictNotice(conflict);
}

function hasScheduleConflict(date, dentist, time, duration) {
  if (!date || !dentist || !time || !duration) return false;
  const dateObject = keyToDate(date);
  const [hour, minute] = time.split(":").map(Number);
  const start = new Date(
    dateObject.getFullYear(),
    dateObject.getMonth(),
    dateObject.getDate(),
    hour,
    minute || 0,
    0,
    0,
  );
  const end = new Date(start.getTime() + duration * 60000);
  return appointments.some((appointment) => {
    if (!isActiveAppointment(appointment)) return false;
    if (dateToKey(keyToDate(getAppointmentDate(appointment))) !== date)
      return false;
    if (String(getDentistId(appointment)) !== String(dentist)) return false;
    const appointmentTime = getAppointmentTime(appointment);
    if (!appointmentTime) return false;
    const [appointmentHour, appointmentMinute] = appointmentTime
      .split(":")
      .map(Number);
    const appointmentStart = new Date(
      dateObject.getFullYear(),
      dateObject.getMonth(),
      dateObject.getDate(),
      appointmentHour,
      appointmentMinute || 0,
      0,
      0,
    );
    const appointmentDuration = Number(
      appointment.duration ||
        appointment.duration_minutes ||
        appointment.durationMinutes ||
        30,
    );
    const appointmentEnd = new Date(
      appointmentStart.getTime() + appointmentDuration * 60000,
    );
    return start < appointmentEnd && end > appointmentStart;
  });
}

function updateConflictNotice(conflict) {
  const notice = document.getElementById("scheduleConflictNotice");
  if (!notice) return;
  notice.classList.toggle("show", conflict);
}

function confirmBooking() {
  currentUser = getCurrentUser();
  resolveCurrentPatient();
  const serviceInput = document.getElementById("serviceInput");
  const dateInput = document.getElementById("dateSelect");
  const dentistInput = document.getElementById("dentistSelect");
  const durationInput = document.getElementById("durationInput");
  const service = serviceInput?.value.trim() || "";
  const date = dateInput?.value || "";
  const dentist = dentistInput?.value || "";
  const selectedService = SERVICES.find(
    (item) => item.name.toLowerCase() === service.toLowerCase(),
  );
  if (!selectedService) {
    showToast("Please select a valid service.");
    return;
  }
  const duration = selectedService.duration;
  if (durationInput) {
    durationInput.value = duration;
    durationInput.disabled = true;
  }
  if (
    !service ||
    !date ||
    isPastDate(date) ||
    !dentist ||
    !duration ||
    !selectedTime
  ) {
    showToast("Please complete all appointment details.");
    return;
  }
  if (hasScheduleConflict(date, dentist, selectedTime, duration)) {
    showToast("The selected time is no longer available.");
    updateAvailableTimeSlots();
    return;
  }
  const patientId = getCurrentPatientId();
  if (!patientId) {
    showToast("Unable to identify your patient account.");
    return;
  }
  const appointment = {
    id: `appt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    patientId,
    patient_id: patientId,
    patient: getCurrentPatientName(),
    date,
    appointment_date: date,
    start: selectedTime,
    appointment_time: selectedTime,
    type: service,
    service_type: service,
    dentist,
    dentist_id: dentist,
    duration,
    status: "Scheduled",
    checkedIn: false,
    checkedInAt: null,
    consultationStarted: false,
    manualReadyComplete: false,
    paymentStatus: "unpaid",
    paymentAmount: 0,
  };
  appointments.push(appointment);
  saveAppointments();
  syncAppointmentToPatient(appointment);
  selectedDate = keyToDate(date);
  calendarDate = new Date(selectedDate);
  calendarDate.setDate(1);
  closeBookingModal();
  renderAll();
  showToast("Appointment scheduled successfully.");
}

function syncAppointmentToPatient(appointment) {
  if (!currentPatient || !appointment) return;
  const patientId = getCurrentPatientId();
  if (!patientId) return;
  const updatedPatients = patients.map((patient) => {
    const id = String(
      patient?.patient_id ||
        patient?.patientId ||
        patient?.id ||
        patient?.user_id ||
        patient?.userId ||
        "",
    );
    if (
      getCanonicalPatientId(findPatientByIdentifier(id)) !== patientId &&
      id !== patientId
    )
      return patient;
    const existing = Array.isArray(patient.appointments)
      ? patient.appointments
      : [];
    const index = existing.findIndex(
      (item) => getAppointmentId(item) === getAppointmentId(appointment),
    );
    const updatedAppointments = [...existing];
    if (index === -1) updatedAppointments.push(appointment);
    else updatedAppointments[index] = appointment;
    return { ...patient, appointments: updatedAppointments };
  });
  patients = updatedPatients;
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}

function handleDocumentClick(event) {
  const serviceWrapper = document.getElementById("serviceSelectWrapper");
  const timeWrapper = document.getElementById("timeFieldWrapper");
  if (serviceWrapper && !serviceWrapper.contains(event.target))
    closeServiceDropdown();
  if (timeWrapper && !timeWrapper.contains(event.target)) closeTimePicker();
  const action = event.target.closest("[data-appointment-action]");
  if (action) {
    const appointmentId = action.getAttribute("data-appointment-id");
    if (action.dataset.appointmentAction === "details")
      openAppointmentDetail(appointmentId);
  }
}

function openAppointmentDetail(appointmentId) {
  const appointment = findAppointmentById(appointmentId);
  if (!appointment) {
    showToast("Appointment could not be found.");
    return;
  }
  detailAppointmentId = appointmentId;
  const modal = document.getElementById("appointmentModal");
  const body = document.getElementById("appointmentDetailBody");
  const subtitle = document.getElementById("appointmentModalSubtitle");
  if (!modal || !body) return;
  const service = getAppointmentService(appointment);
  const dentist = getDentistName(appointment);
  const date = getAppointmentDate(appointment);
  const time = getAppointmentTime(appointment);
  const status = getAppointmentStatus(appointment);
  const duration = Number(
    appointment.duration ||
      appointment.duration_minutes ||
      appointment.durationMinutes ||
      0,
  );
  if (subtitle)
    subtitle.textContent = `${formatShortDate(date)} · ${formatTime(time)}`;
  body.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card full">
        <span>Service</span>
        <strong>${escapeHtml(service)}</strong>
      </div>
      <div class="detail-card">
        <span>Date</span>
        <strong>${escapeHtml(formatDate(date))}</strong>
      </div>
      <div class="detail-card">
        <span>Time</span>
        <strong>${escapeHtml(formatTime(time))}</strong>
      </div>
      <div class="detail-card">
        <span>Dentist</span>
        <strong>${escapeHtml(dentist)}</strong>
      </div>
      <div class="detail-card">
        <span>Duration</span>
        <strong>${duration ? `${duration} minutes` : "Not specified"}</strong>
      </div>
      <div class="detail-card full">
        <span>Status</span>
        <strong>
          <span class="detail-status ${getStatusClass(status)}">${escapeHtml(getPatientStatusLabel(status))}</span>
        </strong>
      </div>
    </div>
  `;
  const requestButton = document.getElementById("requestRescheduleBtn");
  if (requestButton) {
    const normalized = normalizeStatus(status);
    requestButton.style.display =
      normalized === "completed" ||
      normalized === "cancelled" ||
      normalized === "canceled" ||
      normalized === "noshow"
        ? "none"
        : "inline-flex";
  }
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeAppointmentDetail() {
  const modal = document.getElementById("appointmentModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  detailAppointmentId = null;
  document.body.style.overflow = "";
}

function openRescheduleRequestModal() {
  if (!detailAppointmentId) return;
  const appointment = findAppointmentById(detailAppointmentId);
  if (!appointment) {
    showToast("Appointment could not be found.");
    return;
  }
  requestAppointmentId = detailAppointmentId;
  requestTime = "";
  const modal = document.getElementById("rescheduleRequestModal");
  const current = document.getElementById("requestCurrentAppointment");
  const requestDate = document.getElementById("requestDate");
  const requestMessage = document.getElementById("requestMessage");
  if (!modal || !current) return;
  current.innerHTML = `
    <strong>${escapeHtml(getAppointmentService(appointment))}</strong>
    <span>${escapeHtml(formatDate(getAppointmentDate(appointment)))} · ${escapeHtml(formatTime(getAppointmentTime(appointment)))} · ${escapeHtml(getDentistName(appointment))}</span>
  `;
  if (requestDate) {
    requestDate.min = dateToKey(new Date());
    requestDate.value = "";
  }
  if (requestMessage) requestMessage.value = "";
  renderRequestTimeGrid("");
  closeAppointmentDetail();
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeRescheduleRequestModal() {
  const modal = document.getElementById("rescheduleRequestModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  requestAppointmentId = null;
  requestTime = "";
  document.body.style.overflow = "";
}

function handleRequestDateChange(event) {
  const date = event.target.value;
  requestTime = "";
  renderRequestTimeGrid(date);
}

function renderRequestTimeGrid(date) {
  const grid = document.getElementById("requestTimeGrid");
  const count = document.getElementById("requestAvailabilityCount");
  if (!grid) return;
  if (!date) {
    grid.innerHTML = `<div class="time-empty"><i class="fa-regular fa-clock"></i><span>Select a preferred date to view available times.</span></div>`;
    if (count) count.textContent = "Select a date";
    return;
  }
  if (isPastDate(date)) {
    grid.innerHTML = `<div class="time-empty warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Please select a current or future date.</span></div>`;
    if (count) count.textContent = "Invalid date";
    return;
  }
  const appointment = findAppointmentById(requestAppointmentId);
  if (!appointment) return;
  const dentist = getDentistId(appointment);
  const duration = Number(
    appointment.duration ||
      appointment.duration_minutes ||
      appointment.durationMinutes ||
      30,
  );
  const slots = generateAvailableSlots(date, dentist, duration);
  if (count)
    count.textContent = `${slots.length} available ${slots.length === 1 ? "time" : "times"}`;
  if (!slots.length) {
    grid.innerHTML = `<div class="time-empty warning"><i class="fa-regular fa-clock"></i><span>No available times for the selected date.</span></div>`;
    return;
  }
  grid.innerHTML = "";
  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-option";
    if (slot.value === requestTime) button.classList.add("selected");
    button.textContent = slot.label;
    button.addEventListener("click", () => {
      requestTime = slot.value;
      renderRequestTimeGrid(date);
    });
    grid.appendChild(button);
  });
}

function sendRescheduleRequest() {
  if (!requestAppointmentId) {
    showToast("No appointment selected.");
    return;
  }
  const appointment = findAppointmentById(requestAppointmentId);
  if (!appointment) {
    showToast("Appointment could not be found.");
    return;
  }
  const reason = document.getElementById("requestReason")?.value || "other";
  const preferredDate = document.getElementById("requestDate")?.value || "";
  const message = document.getElementById("requestMessage")?.value.trim() || "";
  if (!preferredDate) {
    showToast("Please select a preferred new date.");
    return;
  }
  if (!requestTime) {
    showToast("Please select a preferred new time.");
    return;
  }
  const requests = loadRescheduleRequests();
  const existingPending = requests.find(
    (request) =>
      String(request?.appointment_id || request?.appointmentId || "") ===
        String(requestAppointmentId) &&
      normalizeStatus(request?.status || "") === "pending",
  );
  if (existingPending) {
    showToast("A reschedule request is already pending for this appointment.");
    closeRescheduleRequestModal();
    renderRescheduleAlert();
    return;
  }
  const request = {
    request_id: `REQ-${Date.now()}`,
    appointment_id: requestAppointmentId,
    patient_id: getCurrentPatientId(),
    reason,
    preferred_date: preferredDate,
    preferred_time: requestTime,
    message,
    status: "Pending",
    created_at: new Date().toISOString(),
  };
  requests.push(request);
  saveRescheduleRequests(requests);
  closeRescheduleRequestModal();
  renderRescheduleAlert();
  showToast("Reschedule request sent to the clinic.");
}

function openStaffRescheduleModal(request) {
  staffRequestTargetId = request?.id || request?.request_id || null;
  staffRequestTime = "";
  const modal = document.getElementById("staffRescheduleModal");
  const current = document.getElementById("staffRequestCurrentAppointment");
  const reasonInput = document.getElementById("staffRequestReason");
  const messageInput = document.getElementById("staffRequestMessage");
  const dateInput = document.getElementById("staffRequestDate");
  if (!modal || !current) return;
  const appointment = findAppointmentById(
    request?.appointmentId || request?.appointment_id,
  );
  const serviceName =
    request?.service ||
    (appointment ? getAppointmentService(appointment) : "Dental Appointment");
  const dentistName =
    request?.currentDentistName ||
    (appointment ? getDentistName(appointment) : "Assigned Dentist");
  const currentDate =
    request?.currentDate ||
    (appointment ? getAppointmentDate(appointment) : "");
  const currentTime =
    request?.currentTime ||
    (appointment ? getAppointmentTime(appointment) : "");
  current.innerHTML = `
    <strong>${escapeHtml(serviceName)}</strong>
    <span>${escapeHtml(formatDate(currentDate))} · ${escapeHtml(formatTime(currentTime))} · ${escapeHtml(dentistName)}</span>
  `;
  if (reasonInput)
    reasonInput.value = request?.reasonLabel || request?.reason || "";
  if (messageInput) messageInput.value = request?.message || "";
  if (dateInput) {
    dateInput.min = dateToKey(new Date());
    dateInput.value = "";
  }
  renderStaffRequestTimeGrid("");
  closeAppointmentDetail();
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeStaffRescheduleModal() {
  const modal = document.getElementById("staffRescheduleModal");
  if (!modal) return;
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  staffRequestTargetId = null;
  staffRequestTime = "";
  document.body.style.overflow = "";
}

function handleStaffRequestDateChange(event) {
  const date = event.target.value;
  staffRequestTime = "";
  renderStaffRequestTimeGrid(date);
}

function renderStaffRequestTimeGrid(date) {
  const grid = document.getElementById("staffRequestTimeGrid");
  const count = document.getElementById("staffRequestAvailabilityCount");
  if (!grid) return;
  if (!date) {
    grid.innerHTML = `<div class="time-empty"><i class="fa-regular fa-clock"></i><span>Select a preferred date to view available times.</span></div>`;
    if (count) count.textContent = "Select a date";
    return;
  }
  if (isPastDate(date)) {
    grid.innerHTML = `<div class="time-empty warning"><i class="fa-solid fa-triangle-exclamation"></i><span>Please select a current or future date.</span></div>`;
    if (count) count.textContent = "Invalid date";
    return;
  }
  const requests = loadRescheduleRequests();
  const request = requests.find(
    (item) =>
      String(item?.id || item?.request_id) === String(staffRequestTargetId),
  );
  if (!request) return;
  const appointment = findAppointmentById(
    request?.appointmentId || request?.appointment_id,
  );
  const dentist =
    request?.currentDentist ||
    (appointment ? getDentistId(appointment) : "santos");
  const duration = Number(
    appointment?.duration ||
      appointment?.duration_minutes ||
      appointment?.durationMinutes ||
      30,
  );
  const slots = generateAvailableSlots(date, dentist, duration);
  if (count)
    count.textContent = `${slots.length} available ${slots.length === 1 ? "time" : "times"}`;
  if (!slots.length) {
    grid.innerHTML = `<div class="time-empty warning"><i class="fa-regular fa-clock"></i><span>No available times for the selected date.</span></div>`;
    return;
  }
  grid.innerHTML = "";
  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "time-option";
    if (slot.value === staffRequestTime) button.classList.add("selected");
    button.textContent = slot.label;
    button.addEventListener("click", () => {
      staffRequestTime = slot.value;
      renderStaffRequestTimeGrid(date);
    });
    grid.appendChild(button);
  });
}

function confirmStaffRescheduleResponse() {
  if (!staffRequestTargetId) {
    showToast("No reschedule request selected.");
    return;
  }
  const newDate = document.getElementById("staffRequestDate")?.value || "";
  if (!newDate) {
    showToast("Please select a preferred new date.");
    return;
  }
  if (isPastDate(newDate)) {
    showToast("Please select a current or future date.");
    return;
  }
  if (!staffRequestTime) {
    showToast("Please select a preferred new time.");
    return;
  }
  const requests = loadRescheduleRequests();
  const requestIndex = requests.findIndex(
    (item) =>
      String(item?.id || item?.request_id) === String(staffRequestTargetId),
  );
  if (requestIndex === -1) {
    showToast("Reschedule request could not be found.");
    return;
  }
  const request = requests[requestIndex];
  const appointment = findAppointmentById(
    request?.appointmentId || request?.appointment_id,
  );
  if (!appointment) {
    showToast("The appointment could not be found.");
    return;
  }
  const dentist = getDentistId(appointment);
  const duration = Number(
    appointment.duration ||
      appointment.duration_minutes ||
      appointment.durationMinutes ||
      30,
  );
  if (hasScheduleConflict(newDate, dentist, staffRequestTime, duration)) {
    showToast("The selected time is no longer available.");
    renderStaffRequestTimeGrid(newDate);
    return;
  }
  appointment.date = newDate;
  appointment.appointment_date = newDate;
  appointment.start = staffRequestTime;
  appointment.appointment_time = staffRequestTime;
  appointments = appointments.map((item) =>
    getAppointmentId(item) === getAppointmentId(appointment)
      ? appointment
      : item,
  );
  saveAppointments();
  syncAppointmentToPatient(appointment);
  request.status = "approved";
  request.approvedAt = new Date().toISOString();
  request.approvedDate = newDate;
  request.approvedTime = staffRequestTime;
  requests[requestIndex] = request;
  saveRescheduleRequests(requests);
  selectedDate = keyToDate(newDate);
  calendarDate = new Date(selectedDate);
  calendarDate.setDate(1);
  closeStaffRescheduleModal();
  renderAll();
  showToast("Your appointment has been rescheduled.");
}

function loadRescheduleRequests() {
  try {
    const stored = localStorage.getItem(RESCHEDULE_REQUESTS_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    const requests = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.requests)
        ? parsed.requests
        : [];

    const validRequests = requests.filter((request) => {
      const appointmentId =
        request?.appointment_id || request?.appointmentId || "";

      if (!appointmentId) {
        return true;
      }

      return Boolean(findAppointmentById(appointmentId));
    });

    if (validRequests.length !== requests.length) {
      localStorage.setItem(
        RESCHEDULE_REQUESTS_STORAGE_KEY,
        JSON.stringify(validRequests),
      );
    }

    return validRequests;
  } catch {
    return [];
  }
}

function saveRescheduleRequests(requests) {
  localStorage.setItem(
    RESCHEDULE_REQUESTS_STORAGE_KEY,
    JSON.stringify(requests),
  );
}

function findAppointmentById(id) {
  return appointments.find(
    (appointment) => getAppointmentId(appointment) === String(id),
  );
}

function isStaffInitiatedRequest(request) {
  return Boolean(
    request?.appointmentId || request?.currentDate || request?.reasonLabel,
  );
}

function renderRescheduleAlert() {
  const alert = document.getElementById("rescheduleAlert");
  if (!alert) return;

  const patientId = getCurrentPatientId();

  if (!patientId) {
    alert.hidden = true;
    return;
  }

  const requests = loadRescheduleRequests();

  const request = requests.find((item) => {
    const requestPatientId =
      item?.patient_id || item?.patientId || item?.patient || "";

    const appointmentId = item?.appointment_id || item?.appointmentId || "";

    const status = normalizeStatus(item?.status || "");

    if (String(requestPatientId) !== String(patientId)) {
      return false;
    }

    if (status !== "pending") {
      return false;
    }

    if (!appointmentId) {
      return false;
    }

    const appointment = findAppointmentById(appointmentId);

    return Boolean(appointment);
  });

  if (!request) {
    alert.hidden = true;
    return;
  }

  const badge = document.getElementById("rescheduleReasonBadge");
  const message = document.getElementById("rescheduleMessage");
  const details = document.getElementById("rescheduleAlertDetails");

  if (badge) {
    badge.textContent = "Pending";
  }

  if (message) {
    message.textContent =
      request.message ||
      "Your appointment has a pending schedule change request.";
  }

  if (details) {
    const appointment = findAppointmentById(
      request.appointment_id || request.appointmentId,
    );

    if (appointment) {
      details.textContent =
        `${formatShortDate(getAppointmentDate(appointment))} · ` +
        `${formatTime(getAppointmentTime(appointment))} · ` +
        `${getAppointmentService(appointment)}`;
    } else {
      details.textContent = "The clinic staff is reviewing your request.";
    }
  }

  alert.hidden = false;
}

function handleRescheduleAlert() {
  const requests = loadRescheduleRequests();
  const patientId = getCurrentPatientId();
  const request = requests.find((item) => {
    const requestPatientId =
      item?.patient_id || item?.patientId || item?.patient || "";
    return (
      String(requestPatientId) === patientId &&
      normalizeStatus(item?.status || "pending") === "pending"
    );
  });
  if (!request) return;
  if (isStaffInitiatedRequest(request)) {
    openStaffRescheduleModal(request);
    return;
  }
  const appointment = findAppointmentById(request.appointment_id);
  if (appointment) openAppointmentDetail(getAppointmentId(appointment));
}

function getAppointmentId(appointment) {
  return String(
    appointment?.appointment_id ||
      appointment?.appointmentId ||
      appointment?.id ||
      `${getAppointmentDate(appointment)}-${getAppointmentTime(appointment)}-${getDentistId(appointment)}`,
  );
}

function getStatusClass(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "completed") return "status-completed";
  if (normalized === "cancelled" || normalized === "canceled")
    return "status-cancelled";
  if (normalized === "noshow") return "status-no-show";
  if (normalized === "inconsultation" || normalized === "readycomplete")
    return "status-consultation";
  return "status-scheduled";
}

function isActiveAppointment(appointment) {
  const status = normalizeStatus(getAppointmentStatus(appointment));
  return (
    status !== "cancelled" &&
    status !== "canceled" &&
    status !== "completed" &&
    status !== "noshow"
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
