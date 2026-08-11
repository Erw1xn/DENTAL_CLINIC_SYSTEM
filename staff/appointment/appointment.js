const dentists = {
  santos: {
    name: "Dr. M. Santos",
    spec: "Orthodontics",
    color: "#166F63",
  },

  cruz: {
    name: "Dr. L. Cruz",
    spec: "General Dentistry",
    color: "#E8A93B",
  },

  ramos: {
    name: "Dr. J. Ramos",
    spec: "Oral Surgery",
    color: "#FF6B57",
  },
};

/* =========================================================
   SERVICE DURATIONS
========================================================= */

const serviceDurations = {
  Consultation: 30,
  "Dental Cleaning": 45,
  "Tooth Filling / Pasta": 45,
  "Tooth Extraction": 60,
  "Root Canal": 90,
  "Braces Adjustment": 30,
};

/* =========================================================
   STATE
========================================================= */

let dentistFilter = new Set(Object.keys(dentists));

let searchQuery = "";

let editingId = null;

/* =========================================================
   DATE HELPERS
========================================================= */

function pad(n) {
  return n.toString().padStart(2, "0");
}

function toDateStr(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/*
   Demo/current date.
   Keep this if you are using your current demo data.
*/
let realToday = new Date(2026, 7, 5, 21, 39);

let selectedDate = toDateStr(
  realToday.getFullYear(),
  realToday.getMonth(),
  realToday.getDate(),
);

let viewYear = realToday.getFullYear();

let viewMonth = realToday.getMonth();

/* =========================================================
   TIMELINE SETTINGS
========================================================= */

const START_HOUR = 10;
const END_HOUR = 20;
const SLOT_MIN = 30;

/* =========================================================
   LOCAL STORAGE
========================================================= */

const APPOINTMENTS_STORAGE_KEY = "appointments";

const APPOINTMENT_NAV_TARGET_KEY = "appointment_page_target";

/* =========================================================
   NORMALIZE APPOINTMENT
========================================================= */

function normalizeAppointment(a) {
  return {
    id: a.id ?? String(Date.now()),

    patientName: a.patientName || a.patient || "",

    patient: a.patientName || a.patient || "",

    date: a.date || "",

    time: a.time || a.start || "",

    start: a.start || a.time || "",

    duration:
      a.duration || a.duration === 0
        ? a.duration
        : serviceDurations[a.type] || 30,

    dentist: a.dentist || a.dentistId || "",

    dentistId: a.dentistId || a.dentist || "",

    dentistName: a.dentistName || dentists[a.dentist]?.name || "",

    type: a.type || a.service || "Consultation",

    service: a.service || a.type || "Consultation",

    price: a.price != null ? Number(a.price) : Number(a.amount) || 0,

    amount: a.amount != null ? Number(a.amount) : Number(a.price) || 0,

    status: a.status || "Confirmed",
  };
}

/* =========================================================
   GET APPOINTMENTS
========================================================= */

function getStoredAppointments() {
  const raw = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);

  if (raw) {
    try {
      const parsed = JSON.parse(raw).map(normalizeAppointment);

      if (parsed.length > 0) {
        return parsed;
      }
    } catch (err) {
      console.error("Failed to parse appointments storage", err);

      return [];
    }
  }

  /* Legacy migration */

  const legacy = localStorage.getItem("dentanueva_appointments");

  if (legacy) {
    try {
      const migrated = JSON.parse(legacy).map(normalizeAppointment);

      localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(migrated));

      localStorage.removeItem("dentanueva_appointments");

      return migrated;
    } catch (err) {
      console.error("Failed to migrate legacy appointment storage", err);
    }
  }

  return [];
}

/* =========================================================
   SAVE APPOINTMENTS
========================================================= */

function saveAppointmentsToStorage(appts) {
  const normalized = appts.map(normalizeAppointment);

  localStorage.setItem(APPOINTMENTS_STORAGE_KEY, JSON.stringify(normalized));

  /*
     Tell other pages/components that appointment
     data has changed.
  */
  window.dispatchEvent(new Event("storage"));
}

/* =========================================================
   TOAST
========================================================= */

function toast(msg) {
  const t = document.getElementById("toast");

  if (!t) {
    return;
  }

  t.textContent = msg;

  t.classList.add("show");

  clearTimeout(t._h);

  t._h = setTimeout(() => {
    t.classList.remove("show");
  }, 2200);
}

/* =========================================================
   CALENDAR
========================================================= */

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

function apptsOnDate(dateStr) {
  const appointments = getStoredAppointments();

  return appointments.filter((a) => a.date === dateStr);
}

function renderCalendar() {
  const monthLabel = document.getElementById("calMonthLabel");

  if (monthLabel) {
    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
  }

  const grid = document.getElementById("calGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  DOW.forEach((d) => {
    const el = document.createElement("div");

    el.className = "dow";

    el.textContent = d;

    grid.appendChild(el);
  });

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  for (let i = firstDay - 1; i >= 0; i--) {
    grid.appendChild(makeDayBtn(daysInPrevMonth - i, true, null));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = toDateStr(viewYear, viewMonth, d);

    grid.appendChild(makeDayBtn(d, false, dateStr));
  }

  const total = grid.children.length - 7;

  const remainder = (7 - (total % 7)) % 7;

  for (let d = 1; d <= remainder; d++) {
    grid.appendChild(makeDayBtn(d, true, null));
  }
}

function makeDayBtn(num, muted, dateStr) {
  const btn = document.createElement("button");

  btn.className = "day" + (muted ? " muted" : "");

  btn.textContent = num;

  if (!muted && dateStr) {
    const todayStr = toDateStr(
      realToday.getFullYear(),
      realToday.getMonth(),
      realToday.getDate(),
    );

    const isToday = dateStr === todayStr;

    const isSel = dateStr === selectedDate;

    if (isToday) {
      btn.classList.add("today");
    }

    if (isSel) {
      btn.classList.add("selected");
    }

    if (apptsOnDate(dateStr).length > 0) {
      btn.classList.add("has-appt");
    }

    btn.onclick = () => {
      selectedDate = dateStr;

      renderAll();
    };
  }

  return btn;
}

function shiftMonth(dir) {
  viewMonth += dir;

  if (viewMonth < 0) {
    viewMonth = 11;

    viewYear--;
  }

  if (viewMonth > 11) {
    viewMonth = 0;

    viewYear++;
  }

  renderCalendar();
}

/* =========================================================
   TIME HELPERS
========================================================= */

function fmtTime(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);

  const period = h >= 12 ? "PM" : "AM";

  let hh = h % 12;

  if (hh === 0) {
    hh = 12;
  }

  return `${hh}:${pad(m)} ${period}`;
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);

  const total = h * 60 + m + mins;

  return `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}`;
}

function timeToMins(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);

  return h * 60 + m;
}

/* =========================================================
   TOOTH SVG
========================================================= */

function toothSvg(color) {
  return `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="${color}"
      stroke-width="2"
    >
      <path
        d="M12 3c-2.2 0-3.6 1.3-4.8 1.3C5.9 4.3 4 5.6 4 8.4c0 2.9.9 6.4 1.9 8.9.7 1.9 1.4 3.2 2.6 3.2 1.3 0 1.4-1.8 1.7-3.4.3-1.5.6-2.7 1.8-2.7s1.5 1.2 1.8 2.7c.3 1.6.4 3.4 1.7 3.4 1.2 0 1.9-1.3 2.6-3.2 1-2.5 1.9-6 1.9-8.9 0-2.8-1.9-4.1-3.2-4.1C15.6 4.3 14.2 3 12 3z"
      />
    </svg>
  `;
}

/* =========================================================
   FILTERED APPOINTMENTS
========================================================= */

function filteredAppts() {
  return apptsOnDate(selectedDate)
    .filter((a) => {
      if (!dentistFilter.has(a.dentist)) {
        return false;
      }

      if (
        searchQuery &&
        !a.patient.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      return true;
    })

    .sort((a, b) => a.start.localeCompare(b.start));
}

/* =========================================================
   TIMELINE
========================================================= */

function renderTimeline() {
  const list = filteredAppts();

  const byStart = {};

  const coveredSlots = new Set();

  list.forEach((a) => {
    (byStart[a.start] = byStart[a.start] || []).push(a);

    const dur = Number(a.duration) || serviceDurations[a.type] || 30;

    const startMins = timeToMins(a.start);

    const endMins = startMins + dur;

    for (let m = startMins + SLOT_MIN; m < endMins; m += SLOT_MIN) {
      const hh = pad(Math.floor(m / 60));

      const mm = pad(m % 60);

      coveredSlots.add(`${hh}:${mm}`);
    }
  });

  const tl = document.getElementById("timeline");

  if (!tl) {
    return;
  }

  tl.innerHTML = "";

  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_MIN) {
      const slot = `${pad(h)}:${pad(m)}`;

      const row = document.createElement("div");

      row.className = "tl-row";

      const timeCell = document.createElement("div");

      timeCell.className = "tl-time";

      timeCell.textContent = fmtTime(slot);

      const slotCell = document.createElement("div");

      slotCell.className = "tl-slot";

      const items = byStart[slot];

      if (items && items.length) {
        items.forEach((a) => {
          const card = document.createElement("div");

          card.className = "appt-card";

          card.onclick = () => openEditModal(a.id);

          const dur = Number(a.duration) || serviceDurations[a.type] || 30;

          const dColor = dentists[a.dentist]?.color || "#10b981";

          const dentistName =
            dentists[a.dentist]?.name || a.dentistName || "Dentist";

          card.innerHTML = `
            <div
              class="tooth-badge"
              style="background-color:${dColor}1a;"
            >
              ${toothSvg(dColor)}
            </div>

            <div class="appt-info">

              <div class="pname">
                ${a.patient}
              </div>

              <div class="ptype">
                ${a.type}
                (${dur}m)
                ·
                ${dentistName}
              </div>

            </div>

            <div class="appt-time-range">
              ${fmtTime(a.start)}
              –
              ${fmtTime(addMinutes(a.start, dur))}
            </div>
          `;

          slotCell.appendChild(card);
        });
      } else if (coveredSlots.has(slot)) {
        const occupied = document.createElement("div");

        occupied.className = "occupied-slot";

        occupied.innerHTML = `
          <i
            class="fa-solid fa-ban"
            style="font-size:0.65rem;"
          ></i>

          Slot occupied by ongoing procedure
        `;

        slotCell.appendChild(occupied);
      } else {
        const empty = document.createElement("div");

        empty.className = "empty-slot";

        empty.innerHTML = `
          <span class="plus">+</span>
          Open — click to book
        `;

        empty.onclick = () => openNewModal(slot);

        slotCell.appendChild(empty);
      }

      row.appendChild(timeCell);

      row.appendChild(slotCell);

      tl.appendChild(row);
    }
  }
}

/* =========================================================
   DENTISTS ON DUTY
========================================================= */

function renderRealtimeDentistsDuty() {
  const dayList = apptsOnDate(selectedDate);

  const container = document.getElementById("dentistsDutyList");

  if (!container) {
    return;
  }

  container.innerHTML = "";

  const todayStr = toDateStr(
    realToday.getFullYear(),
    realToday.getMonth(),
    realToday.getDate(),
  );

  const currentHHMM =
    pad(realToday.getHours()) + ":" + pad(realToday.getMinutes());

  Object.entries(dentists).forEach(([key, d]) => {
    const docAppts = dayList

      .filter((a) => a.dentist === key)

      .sort((a, b) => a.start.localeCompare(b.start));

    let statusHtml = `
        <span
          class="status-badge-available"
          style="color:#10b981;"
        >
          Available
        </span>
      `;

    if (docAppts.length > 0) {
      let activeOrNext = null;

      for (const appt of docAppts) {
        const dur = Number(appt.duration) || serviceDurations[appt.type] || 30;

        const endTime = addMinutes(appt.start, dur);

        if (
          selectedDate === todayStr &&
          currentHHMM >= appt.start &&
          currentHHMM < endTime
        ) {
          activeOrNext = {
            type: "busy",
            appt,
          };

          break;
        }

        if (
          selectedDate > todayStr ||
          (selectedDate === todayStr && currentHHMM < appt.start)
        ) {
          activeOrNext = {
            type: "next",
            appt,
          };

          break;
        }
      }

      if (!activeOrNext && docAppts.length > 0) {
        activeOrNext = {
          type: "next",
          appt: docAppts[docAppts.length - 1],
        };
      }

      if (activeOrNext) {
        if (activeOrNext.type === "busy") {
          statusHtml = `
              <span
                class="status-badge-busy"
                style="color:#ef4444;"
              >
                Busy ·
                ${activeOrNext.appt.type}
                (${activeOrNext.appt.patient})
                ·
                ${fmtTime(activeOrNext.appt.start)}
              </span>
            `;
        } else {
          statusHtml = `
              <span
                class="status-badge-busy"
                style="color:#059669;"
              >
                Schedule:
                ${activeOrNext.appt.type}
                (${activeOrNext.appt.patient})
                ·
                ${fmtTime(activeOrNext.appt.start)}
              </span>
            `;
        }
      }
    }

    const item = document.createElement("div");

    item.className = "doc-duty-card";

    const lastName = d.name.split(" ").pop();

    item.innerHTML = `
        <div
          class="doc-avatar-dot"
          style="
            background-color:${d.color}20;
            color:${d.color};
          "
        >
          ${lastName[0]}
        </div>

        <div class="doc-duty-info">

          <strong>
            ${d.name}
          </strong>

          <span class="spec-label">
            ${d.spec}
          </span>

          ${statusHtml}

        </div>
      `;

    container.appendChild(item);
  });
}

/* =========================================================
   RIGHT PANEL
========================================================= */

function renderRightSummaryPanel() {
  const dayList = apptsOnDate(selectedDate);

  const totalAppts = document.getElementById("statTotalAppts");

  if (totalAppts) {
    totalAppts.textContent = dayList.length;
  }

  const totalRevenue = dayList.reduce(
    (sum, a) => sum + (Number(a.price) || 0),
    0,
  );

  const revenueElement = document.getElementById("statEstimatedRevenue");

  if (revenueElement) {
    revenueElement.textContent = `₱${totalRevenue.toLocaleString()}`;
  }

  const queueContainer = document.getElementById("waitingQueueList");

  if (!queueContainer) {
    return;
  }

  queueContainer.innerHTML = "";

  if (dayList.length === 0) {
    queueContainer.innerHTML = `
      <div
        style="
          font-size:0.7rem;
          color:#94a3b8;
          font-style:italic;
          text-align:center;
          padding:10px 0;
        "
      >
        No patients queued today
      </div>
    `;

    return;
  }

  dayList
    .slice()
    .sort((a, b) => a.start.localeCompare(b.start))
    .forEach((a) => {
      const qItem = document.createElement("div");

      qItem.className = "queue-item";

      qItem.innerHTML = `
        <div class="queue-main">

          <span class="queue-avatar">
            ${initials(a.patient)}
          </span>

          <div class="queue-text">

            <span class="queue-name">
              ${a.patient}
            </span>

            <span class="queue-time">
              ${fmtTime(a.start)}
            </span>

          </div>

        </div>

        <span class="queue-type">
          ${a.type}
        </span>
      `;

      queueContainer.appendChild(qItem);
    });
}

/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {
  renderCalendar();

  renderTimeline();

  renderRealtimeDentistsDuty();

  renderRightSummaryPanel();
}

/* =========================================================
   SEARCH
========================================================= */

function initializeSearch() {
  const searchInput = document.getElementById("searchInput");

  if (!searchInput) {
    return;
  }

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;

    renderTimeline();
  });
}

/* =========================================================
   SERVICE TYPE
========================================================= */

function onServiceTypeTyped() {
  const typeInput = document.getElementById("f_type");

  const durationInput = document.getElementById("f_duration");

  if (!typeInput || !durationInput) {
    return;
  }

  const val = typeInput.value;

  if (serviceDurations[val] !== undefined) {
    durationInput.value = serviceDurations[val];
  }
}

/* =========================================================
   NEW APPOINTMENT
========================================================= */

function openNewModal(prefillTime) {
  editingId = null;

  document.getElementById("modalTitle").textContent = "New Appointment";

  document.getElementById("f_patient").value = "";

  document.getElementById("f_date").value = selectedDate;

  document.getElementById("f_time").value = prefillTime || "10:00";

  document.getElementById("f_type").value = "Consultation";

  document.getElementById("f_duration").value = "30";

  document.getElementById("f_dentist").value = "santos";

  const priceInput = document.getElementById("f_price");

  if (priceInput) {
    priceInput.value = "";
  }

  document.getElementById("deleteBtn").style.display = "none";

  document.getElementById("overlay").classList.add("show");

  document.getElementById("f_patient").focus();
}

/* =========================================================
   EDIT APPOINTMENT
========================================================= */

function openEditModal(id) {
  const appointments = getStoredAppointments();

  const a = appointments.find((x) => String(x.id) === String(id));

  if (!a) {
    return;
  }

  editingId = String(id);

  document.getElementById("modalTitle").textContent =
    "View / Edit Appointment Record";

  document.getElementById("f_patient").value = a.patient;

  document.getElementById("f_date").value = a.date;

  document.getElementById("f_time").value = a.start;

  document.getElementById("f_type").value = a.type || "Consultation";

  document.getElementById("f_duration").value =
    a.duration || serviceDurations[a.type] || 30;

  document.getElementById("f_dentist").value = a.dentist;

  const priceInput = document.getElementById("f_price");

  if (priceInput) {
    priceInput.value = a.price !== undefined && a.price !== null ? a.price : "";
  }

  document.getElementById("deleteBtn").style.display = "inline-block";

  document.getElementById("overlay").classList.add("show");
}

/* =========================================================
   CLOSE APPOINTMENT MODAL
========================================================= */

function closeModal() {
  const overlay = document.getElementById("overlay");

  if (overlay) {
    overlay.classList.remove("show");
  }

  editingId = null;
}

/* =========================================================
   DASHBOARD TARGET APPOINTMENT
========================================================= */

function loadDashboardTargetAppointment() {
  const target = localStorage.getItem(APPOINTMENT_NAV_TARGET_KEY);

  if (!target) {
    return;
  }

  localStorage.removeItem(APPOINTMENT_NAV_TARGET_KEY);

  const appointments = getStoredAppointments();

  const match = appointments.find((x) => String(x.id) === String(target));

  if (match) {
    openEditModal(target);
  }
}

/* =========================================================
   SAVE APPOINTMENT
========================================================= */

function saveAppt() {
  const patient = document.getElementById("f_patient").value.trim();

  const date = document.getElementById("f_date").value;

  const start = document.getElementById("f_time").value;

  const type = document.getElementById("f_type").value.trim() || "Consultation";

  const duration = parseInt(document.getElementById("f_duration").value) || 30;

  const dentist = document.getElementById("f_dentist").value;

  const priceField = document.getElementById("f_price");

  const price =
    priceField && priceField.value !== "" ? parseFloat(priceField.value) : 0;

  const dentistName = dentists[dentist]?.name || "";

  if (!patient) {
    toast("Please enter a patient name");

    return;
  }

  if (!date || !start) {
    toast("Please pick a date and time");

    return;
  }

  let appointments = getStoredAppointments();

  const payload = {
    patientName: patient,

    patient: patient,

    date: date,

    start: start,

    time: start,

    duration: duration,

    dentist: dentist,

    dentistId: dentist,

    dentistName: dentistName,

    type: type,

    service: type,

    price: price,

    amount: price,

    status: "Confirmed",
  };

  if (editingId !== null && editingId !== undefined && editingId !== "") {
    const index = appointments.findIndex(
      (x) => String(x.id) === String(editingId),
    );

    if (index !== -1) {
      appointments[index] = {
        ...appointments[index],
        ...payload,
        id: appointments[index].id,
      };

      toast("Appointment record updated successfully");
    } else {
      appointments.push({
        ...payload,
        id: String(editingId),
      });

      toast("Appointment record saved successfully");
    }
  } else {
    const currentMax = appointments

      .map((x) => Number(x.id) || 0)

      .reduce((max, value) => Math.max(max, value), 0);

    const newId = currentMax + 1;

    appointments.push({
      ...payload,
      id: String(newId),
    });

    toast("Appointment booked successfully");
  }

  saveAppointmentsToStorage(appointments);

  /*
     Keep legacy storage synchronized
     for compatibility with your existing system.
  */
  localStorage.setItem(
    "dentanueva_appointments",
    JSON.stringify(appointments.map(normalizeAppointment)),
  );

  selectedDate = date;

  viewYear = parseInt(date.slice(0, 4), 10);

  viewMonth = parseInt(date.slice(5, 7), 10) - 1;

  closeModal();

  renderAll();
}
function deleteAppt() {
  if (editingId === null || editingId === undefined || editingId === "") {
    toast("No appointment selected for deletion");

    return;
  }

  let appointments = getStoredAppointments();

  const targetId = Number(editingId);

  const a = appointments.find((x) => Number(x.id) === targetId);

  appointments = appointments.filter((x) => Number(x.id) !== targetId);

  saveAppointmentsToStorage(appointments);

  closeModal();

  renderAll();

  toast(`Deleted record for ${a ? a.patient : "Patient"}`);
}
function initializeAppointmentModal() {
  const overlay = document.getElementById("overlay");

  if (!overlay) {
    return;
  }

  overlay.addEventListener("click", (e) => {
    if (e.target.id === "overlay") {
      closeModal();
    }
  });
}
function initializeKeyboardEvents() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}
function initializeStorageSync() {
  window.addEventListener("storage", (event) => {
    if (event.key === APPOINTMENTS_STORAGE_KEY) {
      renderAll();
    }
  });
}
document.addEventListener("DOMContentLoaded", () => {
  const mainContent = document.querySelector(".main-content");

  if (mainContent) {
    mainContent.style.animation = "none";
    mainContent.offsetHeight;

    mainContent.style.animation = "pageTransition 0.4s ease-in-out forwards";
  }
  initializeSearch();

  initializeAppointmentModal();

  initializeKeyboardEvents();

  initializeStorageSync();

  renderAll();

  loadDashboardTargetAppointment();
});
