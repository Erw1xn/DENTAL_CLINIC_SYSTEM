document.addEventListener("DOMContentLoaded", () => {
  initializeSMSPage();
});

const SMS_STORAGE_KEY = "sms_notifications";
const APPOINTMENTS_STORAGE_KEY = "appointments";
const PATIENTS_STORAGE_KEY = "dentanueva_patients";
const SMS_RESET_KEY = "sms_notifications_reset_v1";

let smsNotifications = [];
let patients = [];
let appointments = [];

let deleteNotificationId = null;
let toastTimeout = null;

/* =========================================================
   INITIALIZE
   ========================================================= */

function initializeSMSPage() {
  resetSMSDataOnce();

  loadPatients();
  loadAppointments();

  loadSMSNotifications();

  cleanupOrphanedNotifications();

  syncAppointmentNotifications();

  setupSMSPageSorting();

  bindEvents();

  renderPage();
}

/* =========================================================
   RESET SMS DATA
   ========================================================= */

function resetSMSDataOnce() {
  const hasBeenReset = localStorage.getItem(SMS_RESET_KEY);

  if (hasBeenReset) {
    return;
  }

  localStorage.removeItem(SMS_STORAGE_KEY);

  localStorage.setItem(SMS_RESET_KEY, "true");
}

/* =========================================================
   PATIENTS
   ========================================================= */

function loadPatients() {
  const storedPatients = localStorage.getItem(PATIENTS_STORAGE_KEY);

  if (!storedPatients) {
    patients = [];
    return;
  }

  try {
    const parsed = JSON.parse(storedPatients);

    patients = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to load patients:", error);

    patients = [];
  }
}

function getPatientId(patient) {
  return (
    patient?.patientId ||
    patient?.patient_id ||
    patient?.patientID ||
    patient?.id ||
    patient?.referenceId ||
    ""
  );
}

function getPatientName(patient) {
  if (!patient) {
    return "";
  }

  if (patient.fullName) {
    return patient.fullName;
  }

  if (patient.full_name) {
    return patient.full_name;
  }

  if (patient.patientName) {
    return patient.patientName;
  }

  if (patient.name) {
    return patient.name;
  }

  return [patient.firstName, patient.middleName, patient.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function getPatientPhone(patient) {
  return (
    patient?.phone ||
    patient?.phoneNumber ||
    patient?.contactNumber ||
    patient?.contact_number ||
    patient?.mobile ||
    patient?.mobileNumber ||
    ""
  );
}

/* =========================================================
   APPOINTMENTS
   ========================================================= */

function loadAppointments() {
  const storedAppointments = localStorage.getItem(APPOINTMENTS_STORAGE_KEY);

  if (!storedAppointments) {
    appointments = [];
    return;
  }

  try {
    const parsed = JSON.parse(storedAppointments);

    appointments = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to load appointments:", error);

    appointments = [];
  }
}

/* =========================================================
   SMS STORAGE
   ========================================================= */

function loadSMSNotifications() {
  const storedSMS = localStorage.getItem(SMS_STORAGE_KEY);

  if (!storedSMS) {
    smsNotifications = [];
    return;
  }

  try {
    const parsed = JSON.parse(storedSMS);

    smsNotifications = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to load SMS notifications:", error);

    smsNotifications = [];
  }
}

function saveSMSNotifications() {
  localStorage.setItem(SMS_STORAGE_KEY, JSON.stringify(smsNotifications));
}

/* =========================================================
   SMS PAGE SORTING
   ========================================================= */

function setupSMSPageSorting() {
  return;
}

function getSortValue() {
  return "newest";
}

function sortSMSNotifications(notifications) {
  const sorted = [...notifications];

  sorted.sort((a, b) => {
    return getNotificationDate(b) - getNotificationDate(a);
  });

  return sorted;
}

function getNotificationDate(notification) {
  if (!notification) {
    return 0;
  }

  const createdAt = notification.createdAt;

  if (createdAt) {
    const createdDate = new Date(createdAt);

    if (!Number.isNaN(createdDate.getTime())) {
      return createdDate.getTime();
    }
  }

  const appointmentDate = notification.appointmentDate || "";

  const appointmentTime = notification.appointmentTime || "00:00";

  if (appointmentDate) {
    const appointmentDateTime = new Date(
      `${appointmentDate}T${appointmentTime}`,
    );

    if (!Number.isNaN(appointmentDateTime.getTime())) {
      return appointmentDateTime.getTime();
    }

    const fallbackDate = new Date(appointmentDate);

    if (!Number.isNaN(fallbackDate.getTime())) {
      return fallbackDate.getTime();
    }
  }

  return 0;
}

/* =========================================================
   APPOINTMENT → SMS SYNCHRONIZATION
   ========================================================= */

function syncAppointmentNotifications() {
  if (!Array.isArray(appointments) || !appointments.length) {
    return;
  }

  if (!Array.isArray(patients) || !patients.length) {
    return;
  }

  let changed = false;

  appointments.forEach((appointment) => {
    if (!appointment) {
      return;
    }

    const patient = findPatientForAppointment(appointment);

    if (!patient) {
      return;
    }

    const patientName = getPatientName(patient);

    const phone = getPatientPhone(patient);

    if (!patientName || !phone) {
      return;
    }

    const appointmentId = getAppointmentId(appointment);

    if (!appointmentId) {
      return;
    }

    const appointmentDate = normalizeDateForInput(
      appointment.date ||
        appointment.appointmentDate ||
        appointment.scheduleDate ||
        appointment.dateOfAppointment ||
        "",
    );

    const appointmentTime = normalizeTimeForInput(
      appointment.start ||
        appointment.time ||
        appointment.appointmentTime ||
        appointment.scheduleTime ||
        "",
    );

    const appointmentStatus = getAppointmentStatus(appointment);

    const appointmentSnapshot = getAppointmentSnapshot(
      appointmentDate,
      appointmentTime,
      appointmentStatus,
    );

    const existingAutomaticNotifications = smsNotifications.filter(
      (notification) =>
        notification.source === "appointment" &&
        String(notification.appointmentId || "") === String(appointmentId),
    );

    const previousSnapshot = findLatestAppointmentSnapshot(
      existingAutomaticNotifications,
    );

    if (
      previousSnapshot &&
      hasAppointmentScheduleChanged(
        previousSnapshot,
        appointmentDate,
        appointmentTime,
      )
    ) {
      if (
        appointmentStatus !== "cancelled" &&
        appointmentStatus !== "completed"
      ) {
        const created = createAutomaticNotificationIfMissing(
          appointment,
          patient,
          "Appointment Reschedule",
          appointmentDate,
          appointmentTime,
        );

        if (created) {
          changed = true;
        }
      }
    }

    if (appointmentStatus === "confirmed") {
      const createdConfirmation = createAutomaticNotificationIfMissing(
        appointment,
        patient,
        "Appointment Confirmation",
        appointmentDate,
        appointmentTime,
      );

      if (createdConfirmation) {
        changed = true;
      }

      const reminderType = getReminderTypeForAppointment(appointmentDate);

      if (reminderType) {
        const createdReminder = createAutomaticNotificationIfMissing(
          appointment,
          patient,
          reminderType,
          appointmentDate,
          appointmentTime,
        );

        if (createdReminder) {
          changed = true;
        }
      }
    }

    if (appointmentStatus === "cancelled") {
      const createdCancellation = createAutomaticNotificationIfMissing(
        appointment,
        patient,
        "Appointment Cancellation",
        appointmentDate,
        appointmentTime,
      );

      if (createdCancellation) {
        changed = true;
      }
    }

    updateAppointmentNotificationSnapshots(
      existingAutomaticNotifications,
      appointmentSnapshot,
    );
  });

  if (changed) {
    saveSMSNotifications();
  }
}

/* =========================================================
   APPOINTMENT STATUS
   ========================================================= */

function getAppointmentStatus(appointment) {
  if (!appointment) {
    return "";
  }

  const rawStatus =
    appointment.status ||
    appointment.appointmentStatus ||
    appointment.appointment_status ||
    appointment.state ||
    "";

  return String(rawStatus).trim().toLowerCase();
}

/* =========================================================
   APPOINTMENT ID
   ========================================================= */

function getAppointmentId(appointment) {
  return (
    appointment?.id ||
    appointment?.appointmentId ||
    appointment?.appointment_id ||
    appointment?.referenceId ||
    ""
  );
}

/* =========================================================
   APPOINTMENT SNAPSHOT
   ========================================================= */

function getAppointmentSnapshot(date, time, status) {
  return {
    date: date || "",
    time: time || "",
    status: status || "",
  };
}

function findLatestAppointmentSnapshot(notifications) {
  if (!Array.isArray(notifications) || !notifications.length) {
    return null;
  }

  const sorted = [...notifications].sort((a, b) => {
    return getNotificationDate(b) - getNotificationDate(a);
  });

  const notification = sorted.find((item) => item.appointmentSnapshot);

  if (!notification) {
    return null;
  }

  return notification.appointmentSnapshot;
}

function hasAppointmentScheduleChanged(
  previousSnapshot,
  currentDate,
  currentTime,
) {
  if (!previousSnapshot) {
    return false;
  }

  const previousDate = normalizeDateForInput(previousSnapshot.date || "");

  const previousTime = normalizeTimeForInput(previousSnapshot.time || "");

  const newDate = normalizeDateForInput(currentDate || "");

  const newTime = normalizeTimeForInput(currentTime || "");

  return previousDate !== newDate || previousTime !== newTime;
}

function updateAppointmentNotificationSnapshots(
  notifications,
  appointmentSnapshot,
) {
  if (!Array.isArray(notifications)) {
    return;
  }

  notifications.forEach((notification) => {
    notification.appointmentSnapshot = appointmentSnapshot;
  });
}

/* =========================================================
   REMINDER TYPE
   ========================================================= */

function getReminderTypeForAppointment(appointmentDate) {
  const normalizedAppointmentDate = normalizeDateForInput(appointmentDate);

  if (!normalizedAppointmentDate) {
    return null;
  }

  const today = getLocalDateOnly(new Date());

  const appointmentDay = getLocalDateOnly(
    createLocalDateFromDateString(normalizedAppointmentDate),
  );

  const difference = getDateDifferenceInDays(today, appointmentDay);

  if (difference === 0) {
    return "Same-Day Reminder";
  }

  if (difference === 1) {
    return "Appointment Reminder";
  }

  return null;
}

/* =========================================================
   DATE HELPERS
   ========================================================= */

function createLocalDateFromDateString(dateString) {
  const normalized = normalizeDateForInput(dateString);

  if (!normalized) {
    return null;
  }

  const [year, month, day] = normalized.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function getLocalDateOnly(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null;
  }

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDateDifferenceInDays(startDate, endDate) {
  if (!startDate || !endDate) {
    return null;
  }

  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return Math.round(
    (endDate.getTime() - startDate.getTime()) / millisecondsPerDay,
  );
}

/* =========================================================
   CREATE AUTOMATIC NOTIFICATION
   ========================================================= */

function createAutomaticNotificationIfMissing(
  appointment,
  patient,
  notificationType,
  appointmentDate,
  appointmentTime,
) {
  const appointmentId = getAppointmentId(appointment);

  if (!appointmentId) {
    return false;
  }

  const alreadyExists = smsNotifications.some((notification) => {
    return (
      notification.source === "appointment" &&
      String(notification.appointmentId || "") === String(appointmentId) &&
      String(notification.type || "") === String(notificationType)
    );
  });

  if (alreadyExists) {
    return false;
  }

  const patientName = getPatientName(patient);

  const phone = getPatientPhone(patient);

  const message = generateAutomaticAppointmentMessage(
    patientName,
    appointmentDate,
    appointmentTime,
    notificationType,
  );

  const notification = {
    id: createID(),

    appointmentId: appointmentId,

    patientId: getPatientId(patient),

    patientName: patientName,

    phone: phone,

    message: message,

    type: notificationType,

    appointmentType: notificationType,

    appointmentDate: appointmentDate,

    appointmentTime: appointmentTime,

    status: "Pending",

    deliveryStatus: "Pending",

    createdAt: new Date().toISOString(),

    sentAt: null,

    failedAt: null,

    failureReason: null,

    source: "appointment",

    appointmentSnapshot: getAppointmentSnapshot(
      appointmentDate,
      appointmentTime,
      getAppointmentStatus(appointment),
    ),
  };

  smsNotifications.unshift(notification);

  return true;
}

/* =========================================================
   CLEANUP ORPHANED NOTIFICATIONS
   ========================================================= */

function cleanupOrphanedNotifications() {
  if (!Array.isArray(smsNotifications) || !smsNotifications.length) {
    return;
  }

  let changed = false;

  smsNotifications = smsNotifications.filter((notification) => {
    if (!notification) {
      changed = true;

      return false;
    }

    const notificationPatientId = notification.patientId || "";

    const notificationPatientName = notification.patientName || "";

    const matchedPatient = patients.some((patient) => {
      const patientId = getPatientId(patient);

      const patientName = getPatientName(patient);

      if (
        notificationPatientId &&
        patientId &&
        String(notificationPatientId) === String(patientId)
      ) {
        return true;
      }

      if (
        notificationPatientName &&
        patientName &&
        String(notificationPatientName).trim().toLowerCase() ===
          String(patientName).trim().toLowerCase()
      ) {
        return true;
      }

      return false;
    });

    if (!matchedPatient) {
      changed = true;

      return false;
    }

    if (notification.source === "appointment" && notification.appointmentId) {
      const appointmentStillExists = appointments.some((appointment) => {
        const appointmentId = getAppointmentId(appointment);

        return String(appointmentId) === String(notification.appointmentId);
      });

      if (!appointmentStillExists) {
        changed = true;

        return false;
      }
    }

    return true;
  });

  if (changed) {
    saveSMSNotifications();
  }
}

/* =========================================================
   FIND PATIENT FOR APPOINTMENT
   ========================================================= */

function findPatientForAppointment(appointment) {
  if (!appointment) {
    return null;
  }

  const appointmentPatientId =
    appointment.patientId ||
    appointment.patient_id ||
    appointment.patientID ||
    "";

  const appointmentPatientName =
    appointment.patient ||
    appointment.patientName ||
    appointment.patient_name ||
    appointment.fullName ||
    appointment.name ||
    "";

  if (appointmentPatientId) {
    const patientById = patients.find((patient) => {
      return String(getPatientId(patient)) === String(appointmentPatientId);
    });

    if (patientById) {
      return patientById;
    }
  }

  if (appointmentPatientName) {
    const normalizedName = String(appointmentPatientName).trim().toLowerCase();

    const patientByName = patients.find((patient) => {
      return (
        String(getPatientName(patient)).trim().toLowerCase() === normalizedName
      );
    });

    if (patientByName) {
      return patientByName;
    }
  }

  return null;
}

/* =========================================================
   AUTOMATIC MESSAGE
   ========================================================= */

function generateAutomaticAppointmentMessage(
  patientName,
  appointmentDate,
  appointmentTime,
  notificationType,
) {
  const formattedDate = appointmentDate ? formatDate(appointmentDate) : "";

  const formattedTime = appointmentTime ? formatTime(appointmentTime) : "";

  let message = "";

  switch (notificationType) {
    case "Appointment Confirmation":
      message = `Hello ${patientName}, your appointment at DentaNueva Dental Clinic has been confirmed`;

      if (formattedDate) {
        message += ` for ${formattedDate}`;
      }

      if (formattedTime) {
        message += ` at ${formattedTime}`;
      }

      message += ". Thank you!";

      break;

    case "Appointment Reminder":
      message = `Hello ${patientName}, this is a reminder that your appointment at DentaNueva Dental Clinic is tomorrow`;

      if (formattedDate) {
        message += `, ${formattedDate}`;
      }

      if (formattedTime) {
        message += ` at ${formattedTime}`;
      }

      message += ". Please arrive 10 minutes early. Thank you!";

      break;

    case "Same-Day Reminder":
      message = `Hello ${patientName}, this is a reminder that your appointment at DentaNueva Dental Clinic is scheduled for today`;

      if (formattedTime) {
        message += ` at ${formattedTime}`;
      }

      message += ". Please arrive 10 minutes early. Thank you!";

      break;

    case "Appointment Reschedule":
      message = `Hello ${patientName}, your appointment at DentaNueva Dental Clinic has been rescheduled`;

      if (formattedDate) {
        message += ` to ${formattedDate}`;
      }

      if (formattedTime) {
        message += ` at ${formattedTime}`;
      }

      message +=
        ". Please take note of your new appointment schedule. Thank you!";

      break;

    case "Appointment Cancellation":
      message = `Hello ${patientName}, your appointment at DentaNueva Dental Clinic scheduled`;

      if (formattedDate) {
        message += ` for ${formattedDate}`;
      }

      if (formattedTime) {
        message += ` at ${formattedTime}`;
      }

      message +=
        " has been cancelled. Please contact the clinic if you need further assistance. Thank you!";

      break;

    default:
      message = `Hello ${patientName}, you have a notification from DentaNueva Dental Clinic. Thank you!`;
  }

  return message.substring(0, 320);
}

/* =========================================================
   UPDATE SMS DELIVERY STATUS
   ========================================================= */

function updateSMSDeliveryStatus(notificationId, status, failureReason = null) {
  const notification = smsNotifications.find(
    (item) => String(item.id) === String(notificationId),
  );

  if (!notification) {
    return false;
  }

  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (normalizedStatus === "sent") {
    notification.status = "Sent";

    notification.deliveryStatus = "Sent";

    notification.sentAt = new Date().toISOString();

    notification.failedAt = null;

    notification.failureReason = null;
  } else if (normalizedStatus === "failed") {
    notification.status = "Failed";

    notification.deliveryStatus = "Failed";

    notification.failedAt = new Date().toISOString();

    notification.sentAt = null;

    notification.failureReason = failureReason || "SMS delivery failed.";
  } else {
    notification.status = "Pending";

    notification.deliveryStatus = "Pending";

    notification.sentAt = null;

    notification.failedAt = null;

    notification.failureReason = null;
  }

  saveSMSNotifications();

  renderPage();

  return true;
}

/* =========================================================
   RENDER
   ========================================================= */

function renderPage() {
  renderNotifications();
}

function renderNotifications() {
  const tableBody = document.getElementById("notificationTableBody");

  const emptyState = document.getElementById("emptyState");

  const recordCount = document.getElementById("recordCount");

  if (!tableBody) {
    return;
  }

  const filtered = getFilteredNotifications();

  const sorted = sortSMSNotifications(filtered);

  tableBody.innerHTML = "";

  if (recordCount) {
    recordCount.textContent = sorted.length;
  }

  if (!sorted.length) {
    emptyState?.classList.add("show");

    return;
  }

  emptyState?.classList.remove("show");

  sorted.forEach((notification) => {
    const row = document.createElement("tr");

    row.innerHTML = createNotificationRow(notification);

    tableBody.appendChild(row);
  });
}

/* =========================================================
   TABLE ROW
   ========================================================= */

function createNotificationRow(notification) {
  const initials = getInitials(notification.patientName);

  const statusClass = getStatusClass(notification.status);

  const typeClass = getTypeClass(notification.type);

  const appointmentDate = notification.appointmentDate
    ? formatDate(notification.appointmentDate)
    : "Not specified";

  const appointmentTime = notification.appointmentTime
    ? formatTime(notification.appointmentTime)
    : "Not specified";

  const message = notification.message || "";

  const preview =
    message.length > 85 ? message.substring(0, 85) + "..." : message;

  const actions = `
    <button
      class="action-btn"
      type="button"
      title="View"
      data-action="view"
      data-id="${escapeAttribute(notification.id)}"
    >
      <i class="fa-solid fa-eye"></i>
    </button>

    <button
      class="action-btn delete"
      type="button"
      title="Delete"
      data-action="delete"
      data-id="${escapeAttribute(notification.id)}"
    >
      <i class="fa-solid fa-trash"></i>
    </button>
  `;

  return `
    <td>
      <div class="patient-cell">
        <div class="patient-avatar">
          ${escapeHTML(initials)}
        </div>

        <div class="patient-info">
          <div class="patient-name">
            ${escapeHTML(notification.patientName)}
          </div>

          <div class="patient-id">
            ${escapeHTML(notification.patientId || "No ID")}
          </div>
        </div>
      </div>
    </td>

    <td>
      ${escapeHTML(notification.phone || "-")}
    </td>

    <td class="message-cell">
      <div
        class="message-preview"
        title="${escapeAttribute(message)}"
      >
        ${escapeHTML(preview)}
      </div>
    </td>

    <td>
      <span class="type-badge ${typeClass}">
        ${escapeHTML(notification.type || "-")}
      </span>
    </td>

    <td>
      <div class="appointment-cell">
        <strong>
          ${escapeHTML(appointmentDate)}
        </strong>

        <span>
          ${escapeHTML(appointmentTime)}
        </span>
      </div>
    </td>

    <td>
      <span class="status-badge ${statusClass}">
        <span class="status-dot"></span>

        ${escapeHTML(notification.status)}
      </span>
    </td>

    <td>
      <div class="action-buttons">
        ${actions}
      </div>
    </td>
  `;
}

/* =========================================================
   FILTER
   ========================================================= */

function getFilteredNotifications() {
  const search =
    document.getElementById("searchInput")?.value.trim().toLowerCase() || "";

  const status = document.getElementById("statusFilter")?.value || "all";

  const type = document.getElementById("typeFilter")?.value || "all";

  return smsNotifications.filter((notification) => {
    const patientName = String(notification.patientName || "").toLowerCase();

    const phone = String(notification.phone || "").toLowerCase();

    const notificationStatus = String(notification.status || "");

    const notificationType = String(notification.type || "");

    const searchMatch =
      !search || patientName.includes(search) || phone.includes(search);

    const statusMatch = status === "all" || notificationStatus === status;

    const typeMatch = type === "all" || notificationType === type;

    return searchMatch && statusMatch && typeMatch;
  });
}

/* =========================================================
   TABLE ACTIONS
   ========================================================= */

function handleTableAction(event) {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const action = button.dataset.action;

  const id = button.dataset.id;

  if (action === "view") {
    viewNotification(id);
  }

  if (action === "delete") {
    openDeleteModal(id);
  }
}

/* =========================================================
   VIEW
   ========================================================= */

function viewNotification(id) {
  const notification = smsNotifications.find(
    (item) => String(item.id) === String(id),
  );

  if (!notification) {
    return;
  }

  const details = document.getElementById("notificationDetails");

  if (!details) {
    return;
  }

  details.innerHTML = `
    <div class="detail-row">
      <div class="detail-label">
        Patient
      </div>

      <div class="detail-value">
        ${escapeHTML(notification.patientName)}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Patient ID
      </div>

      <div class="detail-value">
        ${escapeHTML(notification.patientId || "Not specified")}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Phone Number
      </div>

      <div class="detail-value">
        ${escapeHTML(notification.phone || "Not specified")}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Notification Type
      </div>

      <div class="detail-value">
        ${escapeHTML(notification.type || "Not specified")}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Appointment
      </div>

      <div class="detail-value">
        ${
          notification.appointmentDate
            ? escapeHTML(formatDate(notification.appointmentDate))
            : "Date not specified"
        }

        ${
          notification.appointmentTime
            ? " at " + escapeHTML(formatTime(notification.appointmentTime))
            : ""
        }
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Status
      </div>

      <div class="detail-value">
        ${escapeHTML(notification.status)}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Source
      </div>

      <div class="detail-value">
        ${
          notification.source === "appointment"
            ? "Automatic Appointment Workflow"
            : "Manual"
        }
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Message
      </div>

      <div class="detail-value">
        ${escapeHTML(notification.message || "")}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Created
      </div>

      <div class="detail-value">
        ${formatDateTime(notification.createdAt)}
      </div>
    </div>

    <div class="detail-row">
      <div class="detail-label">
        Sent At
      </div>

      <div class="detail-value">
        ${
          notification.sentAt
            ? formatDateTime(notification.sentAt)
            : "Not processed"
        }
      </div>
    </div>

    ${
      notification.failedAt
        ? `
          <div class="detail-row">
            <div class="detail-label">
              Failed At
            </div>

            <div class="detail-value">
              ${formatDateTime(notification.failedAt)}
            </div>
          </div>
        `
        : ""
    }

    ${
      notification.failureReason
        ? `
          <div class="detail-row">
            <div class="detail-label">
              Failure Reason
            </div>

            <div class="detail-value">
              ${escapeHTML(notification.failureReason)}
            </div>
          </div>
        `
        : ""
    }
  `;

  openModal("viewModal");
}

/* =========================================================
   DELETE
   ========================================================= */

function openDeleteModal(id) {
  deleteNotificationId = id;

  openModal("deleteModal");
}

function confirmDelete() {
  if (!deleteNotificationId) {
    return;
  }

  smsNotifications = smsNotifications.filter(
    (item) => String(item.id) !== String(deleteNotificationId),
  );

  saveSMSNotifications();

  closeModal("deleteModal");

  deleteNotificationId = null;

  renderPage();

  showToast("Notification deleted.");
}

/* =========================================================
   MODALS
   ========================================================= */

function openModal(id) {
  const modal = document.getElementById(id);

  if (!modal) {
    return;
  }

  modal.classList.add("show");
}

function closeModal(id) {
  if (id) {
    const modal = document.getElementById(id);

    if (modal) {
      modal.classList.remove("show");
    }

    return;
  }

  document
    .querySelectorAll(".modal-overlay")
    .forEach((modal) => modal.classList.remove("show"));
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {
  document
    .getElementById("closeViewModalBtn")
    ?.addEventListener("click", () => closeModal("viewModal"));

  document
    .getElementById("closeDetailsBtn")
    ?.addEventListener("click", () => closeModal("viewModal"));

  document
    .getElementById("cancelDeleteBtn")
    ?.addEventListener("click", () => closeModal("deleteModal"));

  document
    .getElementById("confirmDeleteBtn")
    ?.addEventListener("click", confirmDelete);

  document
    .getElementById("searchInput")
    ?.addEventListener("input", renderNotifications);

  document
    .getElementById("statusFilter")
    ?.addEventListener("change", renderNotifications);

  document
    .getElementById("typeFilter")
    ?.addEventListener("change", renderNotifications);

  document
    .getElementById("notificationTableBody")
    ?.addEventListener("click", handleTableAction);

  document.querySelectorAll(".modal-overlay").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        modal.classList.remove("show");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  window.addEventListener("storage", handleStorageChange);
}

/* =========================================================
   STORAGE CHANGE
   ========================================================= */

function handleStorageChange(event) {
  if (event.key === PATIENTS_STORAGE_KEY) {
    loadPatients();

    loadAppointments();

    cleanupOrphanedNotifications();

    syncAppointmentNotifications();

    renderPage();

    return;
  }

  if (event.key === APPOINTMENTS_STORAGE_KEY) {
    loadAppointments();

    loadPatients();

    cleanupOrphanedNotifications();

    syncAppointmentNotifications();

    renderPage();

    return;
  }

  if (event.key === SMS_STORAGE_KEY) {
    loadSMSNotifications();

    renderPage();
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

function createID() {
  return "SMS-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "NA";
  }

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getStatusClass(status) {
  if (status === "Sent") {
    return "status-sent";
  }

  if (status === "Failed") {
    return "status-failed";
  }

  return "status-pending";
}

function getTypeClass(type) {
  switch (type) {
    case "Appointment Confirmation":
      return "confirmation";

    case "Appointment Reminder":
      return "reminder";

    case "Same-Day Reminder":
      return "same-day";

    case "Appointment Reschedule":
      return "reschedule";

    case "Appointment Cancellation":
      return "cancellation";

    default:
      return "";
  }
}

function normalizeDateForInput(date) {
  if (!date) {
    return "";
  }

  const value = String(date).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return (
    parsed.getFullYear() +
    "-" +
    String(parsed.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(parsed.getDate()).padStart(2, "0")
  );
}

function normalizeTimeForInput(time) {
  if (!time) {
    return "";
  }

  const value = String(time).trim();

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
    return value.substring(0, 5);
  }

  const twelveHourMatch = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);

    const minute = twelveHourMatch[2];

    const suffix = twelveHourMatch[3].toUpperCase();

    if (suffix === "PM" && hour !== 12) {
      hour += 12;
    }

    if (suffix === "AM" && hour === 12) {
      hour = 0;
    }

    return String(hour).padStart(2, "0") + ":" + minute;
  }

  const parsed = new Date(`1970-01-01T${value}`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return (
    String(parsed.getHours()).padStart(2, "0") +
    ":" +
    String(parsed.getMinutes()).padStart(2, "0")
  );
}

function formatDate(date) {
  const normalized = normalizeDateForInput(date);

  if (!normalized) {
    return "Date not specified";
  }

  const parts = normalized.split("-");

  const dateObject = new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2]),
  );

  return dateObject.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time) {
  if (!time) {
    return "Time not specified";
  }

  const normalized = normalizeTimeForInput(time);

  if (!normalized) {
    return "Time not specified";
  }

  const parts = normalized.split(":");

  let hour = Number(parts[0]);

  const minute = parts[1];

  const suffix = hour >= 12 ? "PM" : "AM";

  hour = hour % 12 || 12;

  return `${hour}:${minute} ${suffix}`;
}

function formatDateTime(value) {
  if (!value) {
    return "Not specified";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not specified";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, icon = "✓") {
  const toast = document.getElementById("toast");

  const toastMessage = document.getElementById("toastMessage");

  const toastIcon = document.getElementById("toastIcon");

  if (!toast || !toastMessage || !toastIcon) {
    return;
  }

  if (icon === "!") {
    toastIcon.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
  } else if (icon === "i") {
    toastIcon.innerHTML = '<i class="fa-solid fa-info"></i>';
  } else {
    toastIcon.innerHTML = '<i class="fa-solid fa-check"></i>';
  }

  toastMessage.textContent = message;

  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}
