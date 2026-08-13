const APPOINTMENTS_STORAGE_KEY = "appointments";
const LEGACY_STORAGE_KEY = "dentanueva_appointments";

/* =========================================================
   CLINIC SETTINGS
========================================================= */

const START_HOUR = 10;
const END_HOUR = 20;
const SLOT_MIN = 30;

const NO_SHOW_GRACE_PERIOD_MIN = 15;
const NO_SHOW_TESTING_MODE = true;

/* =========================================================
   SERVICE DURATIONS
========================================================= */

const SERVICE_DURATIONS = {
  Consultation: 30,
  "Dental Cleaning": 45,
  "Tooth Filling / Pasta": 45,
  "Tooth Extraction": 60,
  "Root Canal": 90,
  "Braces Adjustment": 30,
};

/* =========================================================
   DENTISTS
========================================================= */

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

/* =========================================================
   APPOINTMENT STATUS
========================================================= */

const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  IN_CONSULTATION: "in_consultation",
  READY_COMPLETE: "ready_complete",
  COMPLETED: "completed",
  NO_SHOW: "no_show",
};

/*
  WORKFLOW

  Scheduled
      ↓
  Check In
      ↓
  In Consultation
      ↓
  Confirmation
      ↓
  Complete
      ↓
  Confirmation
      ↓
  Completed

  NO SHOW BRANCH

  Scheduled
      ↓
  15 min grace period passes
      ↓
  "Mark No Show" button appears next to "Check In"
      ↓
  Staff confirms
      ↓
  No Show

  IMPORTANT:

  Once an appointment is marked as NO SHOW:

  - Check In button disappears
  - Mark No Show button disappears
  - Only the No Show badge remains
  - Appointment is removed from Waiting Queue
  - Appointment remains in the schedule/history

  IMPORTANT:

  There is NO automatic status change.

  Time is only used to decide whether the
  "Mark No Show" button should be displayed.

  Staff must explicitly confirm "Mark No Show".

  In Consultation will remain In Consultation
  until the staff manually finishes the consultation.
*/

/* =========================================================
   STATE
========================================================= */

let appointments = [];

let currentCalendarDate = new Date();
let selectedDate = new Date();

let editingId = null;
let deleteTargetId = null;
let modalMode = "new";

let statusActionTargetId = null;
let statusActionType = null;

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadAppointments();
  initializeDate();
  setupEvents();

  /*
    We intentionally DO NOT automatically change
    Scheduled to No Show, or In Consultation to
    Ready to Complete, based on time.
  */

  renderAll();

  /*
    Refresh the page every second so the system can
    re-evaluate when the "Mark No Show" button should
    become visible.

    IMPORTANT:
    This DOES NOT automatically change appointment status.
  */

  setInterval(() => {
    renderTimeline();
    renderWaitingQueue();
    renderRealtimeDentistsDuty();
  }, 1000);

  openAppointmentFromURL();
});

/* =========================================================
   INITIAL DATE
========================================================= */

function initializeDate() {
  const today = new Date();

  selectedDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  currentCalendarDate = new Date(selectedDate);
}

/* =========================================================
   OPEN APPOINTMENT FROM URL
========================================================= */

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

/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {
  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderTimeline();
      renderWaitingQueue();
    });
  }

  const serviceInput = document.getElementById("f_type");

  if (serviceInput) {
    serviceInput.addEventListener("input", handleServiceChange);
    serviceInput.addEventListener("change", handleServiceChange);
  }

  const dateInput = document.getElementById("f_date");

  if (dateInput) {
    dateInput.addEventListener("change", handleModalDateChange);
  }

  const timeInput = document.getElementById("f_time");

  if (timeInput) {
    timeInput.addEventListener("change", checkCurrentFormConflict);
  }

  const dentistInput = document.getElementById("f_dentist");

  if (dentistInput) {
    dentistInput.addEventListener("change", checkCurrentFormConflict);
  }

  const durationInput = document.getElementById("f_duration");

  if (durationInput) {
    durationInput.addEventListener("input", checkCurrentFormConflict);
  }
}

/* =========================================================
   STORAGE
========================================================= */

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

    if (Array.isArray(parsed)) {
      appointments = parsed.map(normalizeAppointment);
    } else {
      appointments = [];
    }
  } catch (error) {
    console.error("Unable to load appointments:", error);
    appointments = [];
  }
}

/* =========================================================
   SAVE STORAGE
========================================================= */

function saveAppointmentsToStorage() {
  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(appointments));
}

/* =========================================================
   NORMALIZE APPOINTMENT
========================================================= */

function normalizeAppointment(appt) {
  const normalized = {
    id:
      appt.id || `appt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    patient: appt.patient || "Unknown Patient",

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
  };

  if (!dentists[normalized.dentist]) {
    normalized.dentist = "santos";
  }

  if (!Number.isFinite(normalized.duration) || normalized.duration <= 0) {
    normalized.duration = 30;
  }

  const validStatuses = Object.values(APPOINTMENT_STATUS);

  if (!validStatuses.includes(normalized.status)) {
    normalized.status = APPOINTMENT_STATUS.SCHEDULED;
  }

  return normalized;
}

/* =========================================================
   DATE HELPERS
========================================================= */

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
  const today = new Date();

  const todayKey = dateToKey(today);

  const key = typeof dateOrKey === "string" ? dateOrKey : dateToKey(dateOrKey);

  return key === todayKey;
}

function isPastDate(dateOrKey) {
  if (!dateOrKey) return false;

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const date =
    typeof dateOrKey === "string" ? keyToDate(dateOrKey) : new Date(dateOrKey);

  date.setHours(0, 0, 0, 0);

  return date < today;
}

/* =========================================================
   TIME HELPERS
========================================================= */

function timeToMinutes(time) {
  if (!time) return 0;

  const parts = time.split(":");

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);

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
  const date = keyToDate(dateKey);

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* =========================================================
   APPOINTMENT END TIME
========================================================= */

function getAppointmentEnd(appt) {
  const start = timeToMinutes(appt.start);
  const duration = Number(appt.duration) || 30;

  return start + duration;
}

function getAppointmentEndTime(appt) {
  return minutesToTime(getAppointmentEnd(appt));
}

/* =========================================================
   NO SHOW ELIGIBILITY
========================================================= */

/*
  This only decides whether the "Mark No Show"
  button should be visible.

  It DOES NOT change the appointment status.

  The appointment remains Scheduled until staff
  explicitly confirms Mark No Show.
*/

function isNoShowEligible(appt) {
  /*
    Mark No Show is ONLY available for Scheduled
    appointments.

    Once the appointment is already No Show,
    this returns false.

    Therefore the Mark No Show button will
    disappear after confirmation.
  */

  if (appt.status !== APPOINTMENT_STATUS.SCHEDULED) {
    return false;
  }

  /*
    TESTING MODE

    When true, Mark No Show appears immediately
    for Scheduled appointments.

    Set to false for the actual 15-minute rule.
  */

  if (NO_SHOW_TESTING_MODE) {
    return true;
  }

  /*
    Past day:
    The 15-minute grace period has already passed.
  */

  if (isPastDate(appt.date)) {
    return true;
  }

  /*
    Only today's appointments can become eligible
    in real time.
  */

  if (!isToday(appt.date)) {
    return false;
  }

  const now = new Date();

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const startMinutes = timeToMinutes(appt.start);

  return nowMinutes >= startMinutes + NO_SHOW_GRACE_PERIOD_MIN;
}

/* =========================================================
   OVERLAP DETECTION
========================================================= */

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

/* =========================================================
   FIND DENTIST CONFLICT
========================================================= */

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

      /*
        Completed and No Show appointments no longer
        occupy the dentist's time.
      */

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

/* =========================================================
   AUTOMATIC APPOINTMENT STATUS
========================================================= */

/*
  IMPORTANT:

  No appointment status is automatically changed
  based on time.

  Scheduled remains Scheduled.

  In Consultation remains In Consultation.

  Ready to Complete remains Ready to Complete.

  Completed remains Completed.

  No Show remains No Show.

  The only time-based behavior is the visibility
  of the Mark No Show button.
*/

function updateAutomaticAppointmentStatuses() {
  return false;
}

/* =========================================================
   STATUS LABEL
========================================================= */

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

/* =========================================================
   SERVICE CHANGE
========================================================= */

function handleServiceChange() {
  const service = document.getElementById("f_type").value.trim();

  const durationInput = document.getElementById("f_duration");

  if (SERVICE_DURATIONS[service] && durationInput) {
    durationInput.value = SERVICE_DURATIONS[service];
  }

  checkCurrentFormConflict();
}

/* =========================================================
   MODAL DATE CHANGE
========================================================= */

function handleModalDateChange() {
  const date = document.getElementById("f_date").value;

  const pastNotice = document.getElementById("pastRecordNotice");

  if (modalMode === "new" && date && isPastDate(date)) {
    pastNotice.classList.add("show");
  } else {
    pastNotice.classList.remove("show");
  }

  checkCurrentFormConflict();
}

/* =========================================================
   OPEN NEW APPOINTMENT
========================================================= */

function openNewModal(date = null, time = null) {
  modalMode = "new";
  editingId = null;

  const overlay = document.getElementById("overlay");

  const modalTitle = document.getElementById("modalTitle");

  const modalSubtitle = document.getElementById("modalSubtitle");

  const saveBtn = document.getElementById("saveBtn");

  const deleteBtn = document.getElementById("deleteBtn");

  const viewNotice = document.getElementById("viewOnlyNotice");

  const pastNotice = document.getElementById("pastRecordNotice");

  const conflictNotice = document.getElementById("scheduleConflictNotice");

  modalTitle.textContent = "New Appointment";

  modalSubtitle.textContent = "Create a new appointment";

  saveBtn.style.display = "inline-block";
  saveBtn.disabled = false;

  deleteBtn.style.display = "none";

  viewNotice.classList.remove("show");
  conflictNotice.classList.remove("show");

  resetFormEditable();

  const selectedKey = date || dateToKey(selectedDate);

  document.getElementById("f_patient").value = "";

  document.getElementById("f_date").value = selectedKey;

  document.getElementById("f_time").value = time || "10:00";

  document.getElementById("f_type").value = "";

  document.getElementById("f_duration").value = "";

  document.getElementById("f_dentist").value = "santos";

  if (isPastDate(selectedKey)) {
    pastNotice.classList.add("show");
    saveBtn.disabled = true;
  } else {
    pastNotice.classList.remove("show");
    saveBtn.disabled = false;
  }

  overlay.classList.add("show");
}

/* =========================================================
   OPEN VIEW APPOINTMENT
========================================================= */

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

  const viewNotice = document.getElementById("viewOnlyNotice");

  const pastNotice = document.getElementById("pastRecordNotice");

  const conflictNotice = document.getElementById("scheduleConflictNotice");

  modalTitle.textContent = "Appointment Details";

  modalSubtitle.textContent = `${formatDateLong(appt.date)} · ${fmtTime(
    appt.start,
  )}–${fmtTime(getAppointmentEndTime(appt))}`;

  document.getElementById("f_patient").value = appt.patient;

  document.getElementById("f_date").value = appt.date;

  document.getElementById("f_time").value = appt.start;

  document.getElementById("f_type").value = appt.type;

  document.getElementById("f_duration").value = appt.duration;

  document.getElementById("f_dentist").value = appt.dentist;

  setFormReadOnly(true);

  saveBtn.style.display = "none";
  deleteBtn.style.display = "flex";

  viewNotice.classList.add("show");
  conflictNotice.classList.remove("show");

  if (isPastDate(appt.date)) {
    pastNotice.classList.add("show");
  } else {
    pastNotice.classList.remove("show");
  }

  overlay.classList.add("show");
}

/* =========================================================
   FORM READ ONLY
========================================================= */

function setFormReadOnly(readOnly) {
  const ids = [
    "f_patient",
    "f_date",
    "f_time",
    "f_type",
    "f_duration",
    "f_dentist",
  ];

  ids.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.disabled = readOnly;
    }
  });
}

function resetFormEditable() {
  setFormReadOnly(false);
}

/* =========================================================
   CLOSE MODAL
========================================================= */

function closeModal() {
  document.getElementById("overlay").classList.remove("show");

  editingId = null;
  modalMode = "new";

  resetFormEditable();
}

/* =========================================================
   FORM CONFLICT
========================================================= */

function checkCurrentFormConflict() {
  if (modalMode !== "new") {
    return;
  }

  const date = document.getElementById("f_date").value;

  const start = document.getElementById("f_time").value;

  const dentist = document.getElementById("f_dentist").value;

  const duration = Number(document.getElementById("f_duration").value);

  const notice = document.getElementById("scheduleConflictNotice");

  const text = document.getElementById("scheduleConflictText");

  const saveBtn = document.getElementById("saveBtn");

  notice.classList.remove("show");

  if (!date || !start || !dentist || !duration) {
    saveBtn.disabled = date ? isPastDate(date) : false;

    return;
  }

  if (isPastDate(date)) {
    saveBtn.disabled = true;
    return;
  }

  const conflict = findDentistConflict(date, start, duration, dentist);

  if (conflict) {
    const dentistName = dentists[conflict.dentist]?.name || conflict.dentist;

    const end = getAppointmentEndTime(conflict);

    text.textContent = `${dentistName} already has an appointment from ${fmtTime(
      conflict.start,
    )} to ${fmtTime(end)}.`;

    notice.classList.add("show");

    saveBtn.disabled = true;

    return;
  }

  saveBtn.disabled = false;
}

/* =========================================================
   SAVE APPOINTMENT
========================================================= */

function saveAppt() {
  if (modalMode !== "new") {
    return;
  }

  const patient = document.getElementById("f_patient").value.trim();

  const date = document.getElementById("f_date").value;

  const start = document.getElementById("f_time").value;

  const type = document.getElementById("f_type").value.trim();

  const duration = Number(document.getElementById("f_duration").value);

  const dentist = document.getElementById("f_dentist").value;

  if (!patient) {
    showToast("Please enter the patient's name.");
    return;
  }

  if (!date) {
    showToast("Please select a date.");
    return;
  }

  if (!start) {
    showToast("Please select an appointment time.");
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
      "Past dates are historical records only. New appointments cannot be booked.",
    );
    return;
  }

  const startMinutes = timeToMinutes(start);

  const clinicStart = START_HOUR * 60;

  const clinicEnd = END_HOUR * 60;

  const appointmentEnd = startMinutes + duration;

  if (startMinutes < clinicStart || appointmentEnd > clinicEnd) {
    showToast(
      `Appointment must be within clinic hours (${fmtTime(
        "10:00",
      )}–${fmtTime("20:00")}).`,
    );
    return;
  }

  const conflict = findDentistConflict(date, start, duration, dentist);

  if (conflict) {
    const conflictEnd = getAppointmentEndTime(conflict);

    const dentistName = dentists[conflict.dentist].name;

    document.getElementById("scheduleConflictText").textContent =
      `${dentistName} is already occupied from ${fmtTime(
        conflict.start,
      )} to ${fmtTime(conflictEnd)}.`;

    document.getElementById("scheduleConflictNotice").classList.add("show");

    showToast("Cannot save. The dentist is already occupied during this time.");

    return;
  }

  const newAppointment = {
    id: `appt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,

    patient,
    date,
    start,
    type,
    dentist,
    duration,

    status: APPOINTMENT_STATUS.SCHEDULED,
  };

  appointments.push(newAppointment);

  saveAppointmentsToStorage();

  closeModal();

  selectedDate = keyToDate(date);

  currentCalendarDate = new Date(selectedDate);

  renderAll();

  showToast(
    `Appointment saved: ${patient} · ${fmtTime(start)}–${fmtTime(
      getAppointmentEndTime(newAppointment),
    )}`,
  );
}

/* =========================================================
   DELETE APPOINTMENT
========================================================= */

function deleteAppt() {
  if (!editingId) return;

  const appt = appointments.find((item) => item.id === editingId);

  if (!appt) return;

  deleteTargetId = appt.id;

  document.getElementById("deleteConfirmMessage").textContent =
    `Are you sure you want to delete ${appt.patient}'s appointment on ${formatDateLong(
      appt.date,
    )} at ${fmtTime(appt.start)}? This action cannot be undone.`;

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

  appointments = appointments.filter((item) => item.id !== deleteTargetId);

  saveAppointmentsToStorage();

  closeDeleteConfirmation();
  closeModal();

  renderAll();

  if (target) {
    showToast(`${target.patient}'s appointment was deleted.`);
  }
}

/* =========================================================
   CHECK IN
========================================================= */

/*
  SCHEDULED
      ↓
  CHECK IN
      ↓
  IN CONSULTATION

  IMPORTANT:

  Check In is ONLY available while status is Scheduled.

  Once staff marks an appointment as No Show,
  Check In is no longer available.
*/

function checkInAppointment(id) {
  const appt = appointments.find((item) => item.id === id);

  if (!appt) return;

  /*
    IMPORTANT:
    Only Scheduled appointments can be checked in.

    No Show appointments can NO LONGER be checked in.
  */

  if (appt.status !== APPOINTMENT_STATUS.SCHEDULED) {
    return;
  }

  appt.status = APPOINTMENT_STATUS.IN_CONSULTATION;

  saveAppointmentsToStorage();

  renderAll();

  showToast(`${appt.patient} has been checked in. In Consultation started.`);
}

/* =========================================================
   OPEN STATUS CONFIRMATION
========================================================= */

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

  /*
    FINISH CONSULTATION
  */

  if (actionType === "finishConsultation") {
    title.textContent = "Finish Consultation?";

    message.textContent = `Are you sure you want to finish ${appt.patient}'s consultation? The appointment will move to Complete.`;

    button.textContent = "Yes, Finish";

    icon.innerHTML = '<i class="fa-solid fa-stethoscope"></i>';

    icon.classList.remove("status-confirm-icon-warning");
  }

  /*
    FINAL COMPLETE
  */

  if (actionType === "completeAppointment") {
    title.textContent = "Complete Appointment?";

    message.textContent = `Are you sure you want to mark ${appt.patient}'s appointment as completed?`;

    button.textContent = "Yes, Complete";

    icon.innerHTML = '<i class="fa-solid fa-circle-check"></i>';

    icon.classList.remove("status-confirm-icon-warning");
  }

  /*
    MARK NO SHOW
  */

  if (actionType === "markNoShow") {
    title.textContent = "Mark as No Show?";

    message.textContent = `${appt.patient}'s ${fmtTime(
      appt.start,
    )} appointment has not been checked in. Once marked as No Show, the Check In button will no longer be available.`;

    button.textContent = "Yes, Mark No Show";

    icon.innerHTML = '<i class="fa-solid fa-user-xmark"></i>';

    icon.classList.add("status-confirm-icon-warning");
  }

  overlay.classList.add("show");
}

/* =========================================================
   CLOSE STATUS CONFIRMATION
========================================================= */

function closeStatusConfirmation() {
  statusActionTargetId = null;
  statusActionType = null;

  const icon = document.getElementById("statusConfirmIcon");

  icon.classList.remove("status-confirm-icon-warning");

  document.getElementById("statusConfirmOverlay").classList.remove("show");
}

/* =========================================================
   CONFIRM STATUS ACTION
========================================================= */

function confirmStatusAction() {
  if (!statusActionTargetId || !statusActionType) {
    return;
  }

  const appt = appointments.find((item) => item.id === statusActionTargetId);

  if (!appt) {
    closeStatusConfirmation();
    return;
  }

  /*
    FINISH CONSULTATION

    In Consultation
         ↓
    confirmation
         ↓
    Complete
  */

  if (statusActionType === "finishConsultation") {
    if (appt.status !== APPOINTMENT_STATUS.IN_CONSULTATION) {
      closeStatusConfirmation();
      return;
    }

    appt.status = APPOINTMENT_STATUS.READY_COMPLETE;

    saveAppointmentsToStorage();

    closeStatusConfirmation();

    renderAll();

    showToast(
      `${appt.patient}'s consultation is finished. Please confirm Complete.`,
    );

    return;
  }

  /*
    COMPLETE APPOINTMENT

    Complete
         ↓
    confirmation
         ↓
    Completed
  */

  if (statusActionType === "completeAppointment") {
    if (appt.status !== APPOINTMENT_STATUS.READY_COMPLETE) {
      closeStatusConfirmation();
      return;
    }

    appt.status = APPOINTMENT_STATUS.COMPLETED;

    saveAppointmentsToStorage();

    closeStatusConfirmation();

    renderAll();

    showToast(
      `${appt.patient}'s appointment is now Completed and has been removed from the Waiting Queue.`,
    );

    return;
  }

  /*
    MARK NO SHOW

    Scheduled
         ↓
    confirmation
         ↓
    No Show

    IMPORTANT:

    Once this happens:
    - Check In button disappears
    - Mark No Show button disappears
    - No Show badge remains
    - Removed from Waiting Queue
    - Remains in schedule/history
  */

  if (statusActionType === "markNoShow") {
    if (appt.status !== APPOINTMENT_STATUS.SCHEDULED) {
      closeStatusConfirmation();
      return;
    }

    appt.status = APPOINTMENT_STATUS.NO_SHOW;

    saveAppointmentsToStorage();

    closeStatusConfirmation();

    renderAll();

    showToast(`${appt.patient} has been marked as No Show.`);

    return;
  }
}

/* =========================================================
   APPOINTMENT STATUS BUTTON
========================================================= */

function createAppointmentStatusButton(appt) {
  const wrapper = document.createElement("div");

  wrapper.className = "appt-status-area";

  /*
    SCHEDULED

    Check In is available.

    Mark No Show appears when eligible.
  */

  if (appt.status === APPOINTMENT_STATUS.SCHEDULED) {
    const checkInBtn = document.createElement("button");

    checkInBtn.type = "button";

    checkInBtn.className = "appt-status-btn status-checkin";

    checkInBtn.innerHTML = '<i class="fa-solid fa-user-check"></i> Check In';

    checkInBtn.addEventListener("click", (event) => {
      event.stopPropagation();

      checkInAppointment(appt.id);
    });

    wrapper.appendChild(checkInBtn);

    /*
      Mark No Show appears only while status is Scheduled.
    */

    if (isNoShowEligible(appt)) {
      const noShowBtn = document.createElement("button");

      noShowBtn.type = "button";

      noShowBtn.className = "appt-status-btn status-noshow";

      noShowBtn.innerHTML =
        '<i class="fa-solid fa-user-xmark"></i> Mark No Show';

      noShowBtn.addEventListener("click", (event) => {
        event.stopPropagation();

        openStatusConfirmation(appt.id, "markNoShow");
      });

      wrapper.appendChild(noShowBtn);
    }

    return wrapper;
  }

  /*
    IN CONSULTATION
  */

  if (appt.status === APPOINTMENT_STATUS.IN_CONSULTATION) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "appt-status-btn status-consultation";

    button.innerHTML = '<i class="fa-solid fa-tooth"></i> In Consultation';

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      openStatusConfirmation(appt.id, "finishConsultation");
    });

    wrapper.appendChild(button);

    return wrapper;
  }

  /*
    READY TO COMPLETE
  */

  if (appt.status === APPOINTMENT_STATUS.READY_COMPLETE) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "appt-status-btn status-complete";

    button.innerHTML = '<i class="fa-solid fa-circle-check"></i> Complete';

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      openStatusConfirmation(appt.id, "completeAppointment");
    });

    wrapper.appendChild(button);

    return wrapper;
  }

  /*
    COMPLETED
  */

  if (appt.status === APPOINTMENT_STATUS.COMPLETED) {
    const badge = document.createElement("span");

    badge.className = "appt-status-badge completed";

    badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Completed';

    wrapper.appendChild(badge);

    return wrapper;
  }

  /*
    NO SHOW

    IMPORTANT FIX:

    When status is NO_SHOW:

    - DO NOT create Check In button
    - DO NOT create Mark No Show button
    - ONLY show the No Show badge
  */

  if (appt.status === APPOINTMENT_STATUS.NO_SHOW) {
    const badge = document.createElement("span");

    badge.className = "appt-status-badge no-show";

    badge.innerHTML = '<i class="fa-solid fa-user-xmark"></i> No Show';

    wrapper.appendChild(badge);

    return wrapper;
  }

  return wrapper;
}

/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {
  /*
    There is NO automatic status update here.

    Scheduled stays Scheduled.

    In Consultation stays In Consultation.

    Ready to Complete stays Ready to Complete.

    Completed stays Completed.

    No Show stays No Show.
  */

  renderCalendar();
  renderTimeline();
  renderWaitingQueue();
  renderRealtimeDentistsDuty();
}

/* =========================================================
   CALENDAR
========================================================= */

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

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  weekdays.forEach((day) => {
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

/* =========================================================
   MAKE CALENDAR DAY
========================================================= */

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

  const hasAppointment = appointments.some((appt) => appt.date === key);

  if (hasAppointment) {
    button.classList.add("has-appt");
  }

  button.textContent = date.getDate();

  button.addEventListener("click", () => {
    selectedDate = new Date(date);

    renderAll();
  });

  return button;
}

/* =========================================================
   SHIFT MONTH
========================================================= */

function shiftMonth(offset) {
  currentCalendarDate = new Date(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth() + offset,
    1,
  );

  renderCalendar();
}

/* =========================================================
   FILTER APPOINTMENTS
========================================================= */

function filteredAppts() {
  const dateKey = dateToKey(selectedDate);

  const search = (document.getElementById("searchInput")?.value || "")
    .trim()
    .toLowerCase();

  return appointments
    .filter((appt) => appt.date === dateKey)
    .filter((appt) => {
      if (!search) {
        return true;
      }

      return (
        appt.patient.toLowerCase().includes(search) ||
        appt.type.toLowerCase().includes(search) ||
        dentists[appt.dentist]?.name.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
}

/* =========================================================
   RENDER TIMELINE
========================================================= */

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
    let minutes = START_HOUR * 60;
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

    if (activeAppointments.length > 0) {
      activeAppointments.forEach((appt) => {
        const appointmentStart = timeToMinutes(appt.start);

        if (appointmentStart === minutes) {
          slot.appendChild(createAppointmentCard(appt));
        } else {
          const occupied = document.createElement("div");

          occupied.className = "occupied-slot";

          occupied.innerHTML = `
            <i class="fa-solid fa-lock"></i>
            Occupied · ${fmtTime(appt.start)}–${fmtTime(
              getAppointmentEndTime(appt),
            )}
          `;

          occupied.addEventListener("click", () => openViewModal(appt.id));

          slot.appendChild(occupied);
        }
      });
    } else {
      const empty = document.createElement("div");

      empty.className = "empty-slot";

      if (selectedIsPast) {
        empty.innerHTML = `
          <i class="fa-solid fa-clock-rotate-left"></i>
          No appointment recorded
        `;

        empty.style.cursor = "default";
      } else {
        empty.innerHTML = `
          <span class="plus">+</span>
          Open
        `;

        empty.addEventListener("click", () => openNewModal(selectedKey, time));
      }

      slot.appendChild(empty);
    }

    row.appendChild(timeElement);

    row.appendChild(slot);

    timeline.appendChild(row);
  }
}

/* =========================================================
   CREATE APPOINTMENT CARD
========================================================= */

function createAppointmentCard(appt) {
  const card = document.createElement("div");

  card.className = "appt-card";

  const dentist = dentists[appt.dentist] || dentists.santos;

  card.style.borderLeftColor = dentist.color;

  const endTime = getAppointmentEndTime(appt);

  const info = document.createElement("div");

  info.style.display = "flex";

  info.style.alignItems = "center";

  info.style.flex = "1";

  info.style.minWidth = "0";

  info.innerHTML = `
    <div
      class="tooth-badge"
      style="
        background:${hexToRgba(dentist.color, 0.12)};
        color:${dentist.color};
      "
    >
      <i class="fa-solid fa-tooth"></i>
    </div>

    <div class="appt-info">

      <div class="pname">
        ${escapeHtml(appt.patient)}
      </div>

      <div class="ptype">
        ${escapeHtml(appt.type)}
        ·
        ${escapeHtml(dentist.name)}
      </div>

    </div>
  `;

  const time = document.createElement("div");

  time.className = "appt-time-range";

  time.textContent = `${fmtTime(appt.start)} – ${fmtTime(endTime)}`;

  const statusArea = createAppointmentStatusButton(appt);

  card.appendChild(info);

  card.appendChild(time);

  card.appendChild(statusArea);

  card.addEventListener("click", () => openViewModal(appt.id));

  return card;
}

/* =========================================================
   WAITING QUEUE
========================================================= */

function renderWaitingQueue() {
  const list = document.getElementById("waitingQueueList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  const selectedKey = dateToKey(selectedDate);

  /*
    Completed and No Show appointments
    are removed from Waiting Queue.

    Scheduled
    In Consultation
    Ready to Complete

    remain visible.
  */

  const queue = filteredAppts().filter(
    (appt) =>
      appt.status !== APPOINTMENT_STATUS.COMPLETED &&
      appt.status !== APPOINTMENT_STATUS.NO_SHOW,
  );

  if (!queue.length) {
    const empty = document.createElement("div");

    empty.className = "empty-queue";

    if (isPastDate(selectedKey)) {
      empty.textContent = "No appointment records for this date.";
    } else {
      empty.textContent = "No patients waiting.";
    }

    list.appendChild(empty);

    return;
  }

  queue.forEach((appt) => {
    const item = document.createElement("div");

    item.className = "queue-item";

    const initials = getInitials(appt.patient);

    const end = getAppointmentEndTime(appt);

    item.innerHTML = `
      <div class="queue-main">

        <div class="queue-avatar">
          ${initials}
        </div>

        <div class="queue-text">

          <span class="queue-name">
            ${escapeHtml(appt.patient)}
          </span>

          <span class="queue-time">
            ${fmtTime(appt.start)}
            –
            ${fmtTime(end)}
          </span>

        </div>

      </div>

      <div class="queue-type">
        ${escapeHtml(appt.type)}
      </div>
    `;

    item.addEventListener("click", () => openViewModal(appt.id));

    list.appendChild(item);
  });
}

/* =========================================================
   DENTISTS ON DUTY
========================================================= */

function renderRealtimeDentistsDuty() {
  const list = document.getElementById("dentistsDutyList");

  if (!list) {
    return;
  }

  list.innerHTML = "";

  const selectedKey = dateToKey(selectedDate);

  Object.entries(dentists).forEach(([id, dentist]) => {
    const doctorAppointments = appointments
      .filter((appt) => appt.date === selectedKey && appt.dentist === id)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    const now = new Date();

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let status = "Available";

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
        status = `${getStatusLabel(currentAppointment.status)} · ${
          currentAppointment.patient
        }`;

        statusClass = "status-badge-busy";
      } else if (doctorAppointments.length) {
        const nextAppt = doctorAppointments.find(
          (appt) =>
            timeToMinutes(appt.start) >= nowMinutes && !isInactive(appt),
        );

        if (nextAppt) {
          status = `Available · Next ${fmtTime(nextAppt.start)}`;
        } else {
          const lastAppt = doctorAppointments[doctorAppointments.length - 1];

          status = `${fmtTime(lastAppt.start)} · ${
            lastAppt.patient
          } · ${lastAppt.type}`;
        }
      }
    } else if (!isPastDate(selectedKey) && doctorAppointments.length) {
      const activeCount = doctorAppointments.filter(
        (appt) => !isInactive(appt),
      ).length;

      status = `${activeCount} appointment${
        activeCount !== 1 ? "s" : ""
      } scheduled`;
    }

    if (isPastDate(selectedKey)) {
      if (doctorAppointments.length) {
        status = `${doctorAppointments.length} recorded appointment${
          doctorAppointments.length > 1 ? "s" : ""
        }`;
      } else {
        status = "No recorded appointments";
      }
    }

    const card = document.createElement("div");

    card.className = "doc-duty-card";

    const initials = getInitials(dentist.name.replace("Dr. ", ""));

    card.innerHTML = `
        <div
          class="doc-avatar-dot"
          style="
            background:${hexToRgba(dentist.color, 0.12)};
            color:${dentist.color};
          "
        >
          ${initials}
        </div>

        <div class="doc-duty-info">

          <strong>
            ${escapeHtml(dentist.name)}
          </strong>

          <span class="spec-label">
            ${escapeHtml(dentist.specialty)}
          </span>

          <span class="${statusClass}">
            ${escapeHtml(status)}
          </span>

        </div>
      `;

    list.appendChild(card);
  });
}

/* =========================================================
   GET INITIALS
========================================================= */

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/* =========================================================
   HEX TO RGBA
========================================================= */

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");

  const r = parseInt(value.substring(0, 2), 16);

  const g = parseInt(value.substring(2, 4), 16);

  const b = parseInt(value.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById("toast");

  if (!toast) {
    return;
  }

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================================================
   CLOSE MODALS OUTSIDE
========================================================= */

document.addEventListener("click", (event) => {
  const overlay = document.getElementById("overlay");

  const deleteOverlay = document.getElementById("deleteConfirmOverlay");

  const statusOverlay = document.getElementById("statusConfirmOverlay");

  if (event.target === overlay) {
    closeModal();
  }

  if (event.target === deleteOverlay) {
    closeDeleteConfirmation();
  }

  if (event.target === statusOverlay) {
    closeStatusConfirmation();
  }
});

/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  const statusOverlay = document.getElementById("statusConfirmOverlay");

  const deleteOverlay = document.getElementById("deleteConfirmOverlay");

  if (statusOverlay.classList.contains("show")) {
    closeStatusConfirmation();
    return;
  }

  if (deleteOverlay.classList.contains("show")) {
    closeDeleteConfirmation();
    return;
  }

  closeModal();
});
