const APPOINTMENTS_STORAGE_KEY = "appointments";
const LEGACY_STORAGE_KEY = "dentanueva_appointments";

/* =========================================================
   CLINIC SETTINGS
========================================================= */
const START_HOUR = 10;
const END_HOUR = 20;
const SLOT_MIN = 30;

/*
  Service duration suggestions.
  These are default values only.
  Staff can still change the duration before saving.
*/
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
   STATE
========================================================= */
let appointments = [];
let currentCalendarDate = new Date();
let selectedDate = new Date();
let editingId = null;
let deleteTargetId = null;
let modalMode = "new";

/* =========================================================
   DOM READY
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  loadAppointments();
  initializeDate();
  setupEvents();
  renderAll();

  /*
    NEW:
    If the page was opened from the Dashboard's
    "Upcoming Appointments" list (via ?appointmentId=...),
    jump straight to that appointment's details.
  */
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
   OPEN APPOINTMENT FROM URL (NEW)
   ---------------------------------------------------------
   Reads "appointmentId" from the query string
   (e.g. appointment.html?appointmentId=appt_123).

   If found:
     - Moves the calendar/selected date to that
       appointment's date so it's visible on the timeline.
     - Opens the View modal for that exact appointment,
       same as clicking it manually on this page.
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

  /*
    If the main storage does not exist,
    check the legacy storage.
  */
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
    duration: Number(appt.duration || SERVICE_DURATIONS[appt.type] || 30),
  };

  if (!dentists[normalized.dentist]) {
    normalized.dentist = "santos";
  }

  if (!Number.isFinite(normalized.duration) || normalized.duration <= 0) {
    normalized.duration = 30;
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
   TRUE OVERLAP DETECTION
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
      if (appt.id === ignoreId) return false;
      if (appt.date !== date) return false;
      if (appt.dentist !== dentist) return false;
      return appointmentsOverlap(start, duration, appt.start, appt.duration);
    }) || null
  );
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

  if (modalMode === "new" && isPastDate(date)) {
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
  modalSubtitle.textContent = `${formatDateLong(appt.date)} · ${fmtTime(appt.start)}–${fmtTime(getAppointmentEndTime(appt))}`;

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

/* =========================================================
   RESET FORM
========================================================= */
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
   CHECK CURRENT FORM CONFLICT
========================================================= */
function checkCurrentFormConflict() {
  if (modalMode !== "new") return;

  const date = document.getElementById("f_date").value;
  const start = document.getElementById("f_time").value;
  const dentist = document.getElementById("f_dentist").value;
  const duration = Number(document.getElementById("f_duration").value);

  const notice = document.getElementById("scheduleConflictNotice");
  const text = document.getElementById("scheduleConflictText");
  const saveBtn = document.getElementById("saveBtn");

  notice.classList.remove("show");

  if (!date || !start || !dentist || !duration) {
    saveBtn.disabled = isPastDate(date);
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

    text.textContent = `${dentistName} already has an appointment from ${fmtTime(conflict.start)} to ${fmtTime(end)}.`;
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
  if (modalMode !== "new") return;

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
      `Appointment must be within clinic hours (${fmtTime("10:00")}–${fmtTime("20:00")}).`,
    );
    return;
  }

  const conflict = findDentistConflict(date, start, duration, dentist);

  if (conflict) {
    const conflictEnd = getAppointmentEndTime(conflict);
    const dentistName = dentists[conflict.dentist].name;

    document.getElementById("scheduleConflictText").textContent =
      `${dentistName} is already occupied from ${fmtTime(conflict.start)} to ${fmtTime(conflictEnd)}.`;
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
  };

  appointments.push(newAppointment);
  saveAppointmentsToStorage();
  closeModal();

  selectedDate = keyToDate(date);
  currentCalendarDate = new Date(selectedDate);

  renderAll();

  showToast(
    `Appointment saved: ${patient} · ${fmtTime(start)}–${fmtTime(getAppointmentEndTime(newAppointment))}`,
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
    `Are you sure you want to delete ${appt.patient}'s appointment on ${formatDateLong(appt.date)} at ${fmtTime(appt.start)}? This action cannot be undone.`;

  document.getElementById("deleteConfirmOverlay").classList.add("show");
}

/* =========================================================
   CLOSE DELETE CONFIRMATION
========================================================= */
function closeDeleteConfirmation() {
  deleteTargetId = null;
  document.getElementById("deleteConfirmOverlay").classList.remove("show");
}

/* =========================================================
   CONFIRM DELETE
========================================================= */
function confirmDeleteAppt() {
  if (!deleteTargetId) return;

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
   RENDER EVERYTHING
========================================================= */
function renderAll() {
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
  if (!grid || !label) return;

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

  if (muted) button.classList.add("muted");
  if (dateToKey(selectedDate) === key) button.classList.add("selected");
  if (isToday(date)) button.classList.add("today");

  const hasAppointment = appointments.some((appt) => appt.date === key);
  if (hasAppointment) button.classList.add("has-appt");

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
      if (!search) return true;
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

  if (!timeline) return;

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
            Occupied · ${fmtTime(appt.start)}–${fmtTime(getAppointmentEndTime(appt))}
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
        empty.addEventListener("click", () => {
          openNewModal(selectedKey, time);
        });
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

  card.innerHTML = `
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
        <span class="view-only-badge">
          <i class="fa-solid fa-eye"></i>
          View
        </span>
      </div>
 
      <div class="ptype">
        ${escapeHtml(appt.type)}
        ·
        ${escapeHtml(dentist.name)}
      </div>
    </div>
 
    <div class="appt-time-range">
      ${fmtTime(appt.start)}
      –
      ${fmtTime(endTime)}
    </div>
  `;

  card.addEventListener("click", () => {
    openViewModal(appt.id);
  });

  return card;
}

/* =========================================================
   WAITING QUEUE
========================================================= */
function renderWaitingQueue() {
  const list = document.getElementById("waitingQueueList");
  if (!list) return;

  list.innerHTML = "";

  const selectedKey = dateToKey(selectedDate);
  const queue = filteredAppts();

  if (!queue.length) {
    const empty = document.createElement("div");
    empty.className = "empty-queue";

    if (isPastDate(selectedKey)) {
      empty.textContent = "No appointment records for this date.";
    } else {
      empty.textContent = "No appointments today.";
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
  if (!list) return;

  list.innerHTML = "";

  const selectedKey = dateToKey(selectedDate);

  Object.entries(dentists).forEach(([id, dentist]) => {
    const doctorAppointments = appointments
      .filter((appt) => appt.date === selectedKey && appt.dentist === id)
      .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

    let status = "Available";
    let statusClass = "status-badge-available";

    if (isToday(selectedKey)) {
      const currentAppointment = doctorAppointments.find((appt) => {
        const start = timeToMinutes(appt.start);
        const end = getAppointmentEnd(appt);
        return nowMinutes >= start && nowMinutes < end;
      });

      if (currentAppointment) {
        status = `Busy · ${currentAppointment.patient}`;
        statusClass = "status-badge-busy";
      } else if (doctorAppointments.length) {
        const nextAppt = doctorAppointments.find(
          (appt) => timeToMinutes(appt.start) >= nowMinutes,
        );

        if (nextAppt) {
          status = `Available · Next ${fmtTime(nextAppt.start)}`;
        } else {
          const lastAppt = doctorAppointments[doctorAppointments.length - 1];
          status = `${fmtTime(lastAppt.start)} · ${lastAppt.patient} · ${lastAppt.type}`;
        }
      }
    } else if (!isPastDate(selectedKey) && doctorAppointments.length) {
      status = `${doctorAppointments.length} appointment${doctorAppointments.length > 1 ? "s" : ""} scheduled`;
    }

    if (isPastDate(selectedKey)) {
      if (doctorAppointments.length) {
        status = `${doctorAppointments.length} recorded appointment${doctorAppointments.length > 1 ? "s" : ""}`;
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
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* =========================================================
   CLOSE MODALS WHEN CLICKING OUTSIDE
========================================================= */
document.addEventListener("click", (event) => {
  const overlay = document.getElementById("overlay");
  const deleteOverlay = document.getElementById("deleteConfirmOverlay");

  if (event.target === overlay) {
    closeModal();
  }

  if (event.target === deleteOverlay) {
    closeDeleteConfirmation();
  }
});

/* =========================================================
   ESCAPE KEY
========================================================= */
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const deleteOverlay = document.getElementById("deleteConfirmOverlay");

  if (deleteOverlay.classList.contains("show")) {
    closeDeleteConfirmation();
    return;
  }

  closeModal();
});
