const APPOINTMENTS_STORAGE_KEY = "appointments";
const LEGACY_STORAGE_KEY = "dentanueva_appointments";
const PATIENTS_STORAGE_KEY = "patients";
const DAILY_GOAL = 5000;
const STATUS = {
  SCHEDULED: "scheduled",
  IN_CONSULTATION: "in_consultation",
  READY_COMPLETE: "ready_complete",
  COMPLETED: "completed",
};
document.addEventListener("DOMContentLoaded", () => {
  clearSavedDashboardData();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  renderDashboard();
  setInterval(renderDashboard, 2000);
});
function clearSavedDashboardData() {
  localStorage.removeItem(APPOINTMENTS_STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(PATIENTS_STORAGE_KEY);
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
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }
}
function loadAppointments() {
  let stored = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);
  if (!stored) {
    stored = localStorage.getItem(LEGACY_STORAGE_KEY);
  }
  if (!stored) {
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error("Unable to load appointments:", error);
  }
  return [];
}
function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
function timeToMinutes(time) {
  if (!time) {
    return 0;
  }
  const parts = String(time).split(":");
  return Number(parts[0]) * 60 + Number(parts[1] || 0);
}
function formatTime(time) {
  const total = timeToMinutes(time);
  let hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  if (hours === 0) {
    hours = 12;
  } else if (hours > 12) {
    hours -= 12;
  }
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
function getInitials(name) {
  return String(name || "Patient")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}
function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function getTodayAppointments() {
  const today = getTodayKey();
  return loadAppointments()
    .filter((appointment) => appointment.date === today)
    .sort(
      (a, b) =>
        timeToMinutes(a.start || a.time) - timeToMinutes(b.start || b.time),
    );
}
function renderDashboard() {
  const appointments = loadAppointments();
  const todayAppointments = getTodayAppointments();
  updatePatientCount(appointments);
  updateAppointmentStats(todayAppointments);
  updateClinicSummary(todayAppointments);
  renderTodayAppointments(todayAppointments);
  updateProduction();
  renderWeeklyChart();
}
function updatePatientCount() {
  const element = document.getElementById("totalPatients");
  const patientCount = 0;
  if (element) {
    element.textContent = patientCount;
  }
}
function updateAppointmentStats(todayAppointments) {
  const total = todayAppointments.length;
  const scheduled = todayAppointments.filter(
    (appointment) => appointment.status === STATUS.SCHEDULED,
  ).length;
  const appointmentsElement = document.getElementById("appointmentsToday");
  const scheduledElement = document.getElementById("scheduledToday");
  if (appointmentsElement) {
    appointmentsElement.textContent = total;
  }
  if (scheduledElement) {
    scheduledElement.textContent = `${scheduled} scheduled`;
  }
}
function updateClinicSummary(appointments) {
  const scheduled = appointments.filter(
    (a) => a.status === STATUS.SCHEDULED,
  ).length;
  const checkedIn = appointments.filter(
    (a) => a.status === STATUS.IN_CONSULTATION,
  ).length;
  const consultation = appointments.filter(
    (a) => a.status === STATUS.IN_CONSULTATION,
  ).length;
  const completed = appointments.filter(
    (a) => a.status === STATUS.COMPLETED,
  ).length;
  setText("summaryScheduled", scheduled);
  setText("summaryCheckedIn", checkedIn);
  setText("summaryConsultation", consultation);
  setText("summaryCompleted", completed);
}
function renderTodayAppointments(appointments) {
  const container = document.getElementById("todayAppointmentsList");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  if (appointments.length === 0) {
    container.innerHTML = `
<div class="no-appointments">
<i class="fa-regular fa-calendar-xmark"></i>
<div>
No patient appointments today.
</div>
</div>
`;
    return;
  }
  appointments.forEach((appointment) => {
    const item = document.createElement("div");
    item.className = "appointment-item";
    const patient =
      appointment.patient || appointment.patientName || "Unknown Patient";
    const service = appointment.type || appointment.service || "Consultation";
    const time = appointment.start || appointment.time || "10:00";
    const status = appointment.status || STATUS.SCHEDULED;
    item.innerHTML = `
<div class="patient-info">
<div class="patient-avatar">
${getInitials(patient)}
</div>
<div class="patient-details">
<span class="patient-name">
${escapeHtml(patient)}
</span>
<span class="patient-time">
Today · ${formatTime(time)}
</span>
<div class="patient-service">
${escapeHtml(service)}
</div>
</div>
</div>
<span class="status-badge ${getStatusClass(status)}">
${getStatusLabel(status)}
</span>
`;
    container.appendChild(item);
  });
}
function getStatusLabel(status) {
  switch (status) {
    case STATUS.SCHEDULED:
      return "Scheduled";
    case STATUS.IN_CONSULTATION:
      return "In Consultation";
    case STATUS.READY_COMPLETE:
      return "Ready to Complete";
    case STATUS.COMPLETED:
      return "Completed";
    default:
      return "Scheduled";
  }
}
function getStatusClass(status) {
  switch (status) {
    case STATUS.IN_CONSULTATION:
      return "status-consultation";
    case STATUS.READY_COMPLETE:
      return "status-ready";
    case STATUS.COMPLETED:
      return "status-completed";
    default:
      return "status-scheduled";
  }
}
function updateProduction() {
  const todayRevenue = 0;
  const percent = Math.min(100, (todayRevenue / DAILY_GOAL) * 100);
  const value = document.getElementById("productionValue");
  const progress = document.getElementById("productionProgress");
  const label = document.getElementById("productionPercent");
  if (value) {
    value.textContent = `₱${todayRevenue.toLocaleString()} / ${DAILY_GOAL.toLocaleString()}`;
  }
  if (progress) {
    progress.style.width = `${percent}%`;
  }
  if (label) {
    label.textContent = `${Math.round(percent)}% Complete`;
  }
  setText("todayRevenue", formatPeso(todayRevenue));
  setText("monthlyRevenue", formatPeso(0));
  const monthLabel = document.getElementById("monthlyRevenueLabel");
  if (monthLabel) {
    monthLabel.textContent = `${new Date().toLocaleDateString("en-US", {
      month: "long",
    })} revenue`;
  }
}
function formatPeso(value) {
  return (
    "₱" +
    Number(value || 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
function renderWeeklyChart() {
  const container = document.getElementById("weeklyBars");
  if (!container) {
    return;
  }
  container.innerHTML = "";
  const production = [0, 0, 0, 0, 0, 0, 0];
  const goal = [0, 0, 0, 0, 0, 0, 0];
  const max = 5000;
  for (let i = 0; i < 7; i++) {
    const day = document.createElement("div");
    day.className = "day-bar";
    const productionBar = document.createElement("div");
    productionBar.className = "bar production-bar";
    productionBar.style.height = `${(production[i] / max) * 100}%`;
    const goalBar = document.createElement("div");
    goalBar.className = "bar goal-bar";
    goalBar.style.height = `${(goal[i] / max) * 100}%`;
    day.appendChild(productionBar);
    day.appendChild(goalBar);
    container.appendChild(day);
  }
}
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}
function goToAppointments() {
  window.location.href = "Appointment.html";
}
function goToPatients() {
  window.location.href = "Patient.html";
}
