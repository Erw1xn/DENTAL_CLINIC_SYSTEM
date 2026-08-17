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

  syncAppointmentNotifications();

  cleanupOrphanedNotifications();

  populatePatientSelect();

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
    patient.patientId ||
    patient.patient_id ||
    patient.patientID ||
    patient.id ||
    patient.referenceId ||
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
    patient.phone ||
    patient.phoneNumber ||
    patient.contactNumber ||
    patient.contact_number ||
    patient.mobile ||
    patient.mobileNumber ||
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
  const select = document.getElementById("typeFilter");

  if (!select) {
    return;
  }

  const currentValue =
    select.value === "oldest" ||
    select.value === "name-az" ||
    select.value === "name-za" ||
    select.value === "newest"
      ? select.value
      : "newest";

  select.innerHTML = `
    <option value="newest">Newest</option>
    <option value="oldest">Oldest</option>
    <option value="name-az">Name A-Z</option>
    <option value="name-za">Name Z-A</option>
  `;

  select.value = currentValue;
}

function getSortValue() {
  return document.getElementById("typeFilter")?.value || "newest";
}

function sortSMSNotifications(notifications) {
  const sortValue = getSortValue();

  const sorted = [...notifications];

  if (sortValue === "name-az") {
    sorted.sort((a, b) => {
      const nameA = String(a.patientName || "")
        .trim()
        .toLowerCase();

      const nameB = String(b.patientName || "")
        .trim()
        .toLowerCase();

      return nameA.localeCompare(nameB);
    });

    return sorted;
  }

  if (sortValue === "name-za") {
    sorted.sort((a, b) => {
      const nameA = String(a.patientName || "")
        .trim()
        .toLowerCase();

      const nameB = String(b.patientName || "")
        .trim()
        .toLowerCase();

      return nameB.localeCompare(nameA);
    });

    return sorted;
  }

  if (sortValue === "oldest") {
    sorted.sort((a, b) => {
      return getNotificationDate(a) - getNotificationDate(b);
    });

    return sorted;
  }

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

    if (!patientName) {
      return;
    }

    if (!phone) {
      return;
    }

    const appointmentId =
      appointment.id ||
      appointment.appointmentId ||
      appointment.appointment_id ||
      "";

    if (!appointmentId) {
      return;
    }

    const existingNotification = findAppointmentNotification(appointmentId);

    const appointmentDate =
      appointment.date ||
      appointment.appointmentDate ||
      appointment.scheduleDate ||
      "";

    const appointmentTime =
      appointment.start ||
      appointment.time ||
      appointment.appointmentTime ||
      "";

    if (existingNotification) {
      let notificationChanged = false;

      if (
        String(existingNotification.patientId || "") !==
        String(getPatientId(patient) || "")
      ) {
        existingNotification.patientId = getPatientId(patient);
        notificationChanged = true;
      }

      if (existingNotification.patientName !== patientName) {
        existingNotification.patientName = patientName;
        notificationChanged = true;
      }

      if (existingNotification.phone !== phone) {
        existingNotification.phone = phone;
        notificationChanged = true;
      }

      if (existingNotification.appointmentDate !== appointmentDate) {
        existingNotification.appointmentDate = appointmentDate;

        notificationChanged = true;
      }

      if (existingNotification.appointmentTime !== appointmentTime) {
        existingNotification.appointmentTime = appointmentTime;

        notificationChanged = true;
      }

      if (
        !existingNotification.type ||
        existingNotification.type === "Appointment Confirmation"
      ) {
        existingNotification.type = "Appointment Confirmation";
      }

      if (notificationChanged) {
        changed = true;
      }

      return;
    }

    const message = generateAutomaticAppointmentMessage(
      patientName,
      appointmentDate,
      appointmentTime,
      "Appointment Confirmation",
    );

    const notification = {
      id: createID(),

      appointmentId: appointmentId,

      patientId: getPatientId(patient),

      patientName: patientName,

      phone: phone,

      message: message,

      type: "Appointment Confirmation",

      appointmentType: "Appointment Confirmation",

      appointmentDate: appointmentDate,

      appointmentTime: appointmentTime,

      status: "Pending",

      deliveryStatus: "Pending",

      createdAt: new Date().toISOString(),

      sentAt: null,

      failedAt: null,

      failureReason: null,

      source: "appointment",
    };

    smsNotifications.unshift(notification);

    changed = true;
  });

  if (changed) {
    saveSMSNotifications();
  }
}

/* =========================================================
   REMOVE SMS RECORDS WITHOUT MATCHING PATIENT / APPOINTMENT
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
        const appointmentId =
          appointment.id ||
          appointment.appointmentId ||
          appointment.appointment_id ||
          "";

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

function findAppointmentNotification(appointmentId) {
  if (!appointmentId) {
    return null;
  }

  return (
    smsNotifications.find((notification) => {
      return String(notification.appointmentId || "") === String(appointmentId);
    }) || null
  );
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
      message = `Hello ${patientName}, this is a reminder that your appointment at DentaNueva Dental Clinic is scheduled`;

      if (formattedDate) {
        message += ` for ${formattedDate}`;
      }

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
   PATIENT SELECT
   ========================================================= */

function populatePatientSelect() {
  const select = document.getElementById("patientSelect");

  if (!select) {
    return;
  }

  select.innerHTML = `
    <option value="">
      Select patient
    </option>
  `;

  patients.forEach((patient, index) => {
    const id = getPatientId(patient) || String(index + 1);

    const name = getPatientName(patient);

    if (!name) {
      return;
    }

    const option = document.createElement("option");

    option.value = id;

    option.textContent = name;

    option.dataset.phone = getPatientPhone(patient);

    select.appendChild(option);
  });
}

function handlePatientSelection() {
  const select = document.getElementById("patientSelect");

  const phoneInput = document.getElementById("phoneInput");

  if (!select) {
    return;
  }

  const selectedOption = select.options[select.selectedIndex];

  if (!selectedOption) {
    return;
  }

  if (phoneInput) {
    phoneInput.value = selectedOption.dataset.phone || "";
  }

  const patient = patients.find((item, index) => {
    const id = getPatientId(item) || String(index + 1);

    return String(id) === String(select.value);
  });

  if (!patient) {
    return;
  }

  const appointment = getPatientAppointment(patient);

  if (appointment) {
    fillAppointmentInformation(appointment);

    generateAppointmentMessage();
  }
}

/* =========================================================
   PATIENT APPOINTMENT
   ========================================================= */

function getPatientAppointment(patient) {
  if (Array.isArray(patient.appointments) && patient.appointments.length) {
    return patient.appointments[0];
  }

  const patientId = getPatientId(patient);

  const patientName = getPatientName(patient);

  return (
    appointments.find((appointment) => {
      const appointmentPatientId =
        appointment.patientId ||
        appointment.patient_id ||
        appointment.patientID;

      const appointmentPatientName =
        appointment.patientName ||
        appointment.patient_name ||
        appointment.patient ||
        appointment.fullName ||
        appointment.name;

      if (
        patientId &&
        appointmentPatientId &&
        String(patientId) === String(appointmentPatientId)
      ) {
        return true;
      }

      if (
        patientName &&
        appointmentPatientName &&
        String(patientName).toLowerCase() ===
          String(appointmentPatientName).toLowerCase()
      ) {
        return true;
      }

      return false;
    }) || null
  );
}

function fillAppointmentInformation(appointment) {
  const dateInput = document.getElementById("appointmentDateInput");

  const timeInput = document.getElementById("appointmentTimeInput");

  if (dateInput) {
    dateInput.value = normalizeDateForInput(
      appointment.date ||
        appointment.appointmentDate ||
        appointment.scheduleDate ||
        "",
    );
  }

  if (timeInput) {
    timeInput.value = normalizeTimeForInput(
      appointment.time ||
        appointment.appointmentTime ||
        appointment.start ||
        "",
    );
  }
}

/* =========================================================
   MESSAGE GENERATION
   ========================================================= */

function generateAppointmentMessage() {
  const patientSelect = document.getElementById("patientSelect");

  const messageInput = document.getElementById("messageInput");

  const typeSelect = document.getElementById("notificationTypeInput");

  const dateInput = document.getElementById("appointmentDateInput");

  const timeInput = document.getElementById("appointmentTimeInput");

  if (!patientSelect || !messageInput || !typeSelect) {
    return;
  }

  if (!patientSelect.value) {
    return;
  }

  if (!typeSelect.value) {
    messageInput.value = "";

    updateCharacterCount();

    return;
  }

  const patient = patients.find((item, index) => {
    const id = getPatientId(item) || String(index + 1);

    return String(id) === String(patientSelect.value);
  });

  const patientName = patient ? getPatientName(patient) : "";

  if (!patientName) {
    return;
  }

  const date = dateInput?.value || "";

  const time = timeInput?.value || "";

  const message = generateAutomaticAppointmentMessage(
    patientName,
    date,
    time,
    typeSelect.value,
  );

  messageInput.value = message;

  updateCharacterCount();
}

/* =========================================================
   CREATE NOTIFICATION
   ========================================================= */

function createNotification(event) {
  event.preventDefault();

  const patientSelect = document.getElementById("patientSelect");

  const phoneInput = document.getElementById("phoneInput");

  const typeInput = document.getElementById("notificationTypeInput");

  const dateInput = document.getElementById("appointmentDateInput");

  const timeInput = document.getElementById("appointmentTimeInput");

  const messageInput = document.getElementById("messageInput");

  const selectedOption = patientSelect.options[patientSelect.selectedIndex];

  const patientName = selectedOption?.textContent?.trim() || "";

  if (!patientName) {
    showToast("Please select a patient.", "!");

    return;
  }

  if (!phoneInput.value.trim()) {
    showToast("Please enter a phone number.", "!");

    return;
  }

  if (!typeInput.value) {
    showToast("Please select a notification type.", "!");

    return;
  }

  if (!messageInput.value.trim()) {
    showToast("Please enter a notification message.", "!");

    return;
  }

  const notification = {
    id: createID(),

    appointmentId: null,

    patientId: patientSelect.value,

    patientName: patientName,

    phone: phoneInput.value.trim(),

    message: messageInput.value.trim(),

    type: typeInput.value,

    appointmentType: typeInput.value,

    appointmentDate: dateInput.value,

    appointmentTime: timeInput.value,

    status: "Pending",

    deliveryStatus: "Pending",

    createdAt: new Date().toISOString(),

    sentAt: null,

    failedAt: null,

    failureReason: null,

    source: "manual",
  };

  smsNotifications.unshift(notification);

  saveSMSNotifications();

  closeModal("notificationModal");

  renderPage();

  showToast("Notification created and stored as Pending.");
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

      <span class="type-badge">
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

      <span
        class="status-badge ${statusClass}"
      >

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

  return smsNotifications.filter((notification) => {
    const patientName = String(notification.patientName || "").toLowerCase();

    const phone = String(notification.phone || "").toLowerCase();

    const searchMatch =
      !search || patientName.includes(search) || phone.includes(search);

    return searchMatch;
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

function openNewNotificationModal() {
  resetNotificationForm();

  loadPatients();

  loadAppointments();

  populatePatientSelect();

  openModal("notificationModal");
}

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

function resetNotificationForm() {
  const form = document.getElementById("notificationForm");

  if (!form) {
    return;
  }

  form.reset();

  const counter = document.getElementById("messageCharacterCount");

  if (counter) {
    counter.textContent = "0";
  }
}

/* =========================================================
   CHARACTER COUNT
   ========================================================= */

function updateCharacterCount() {
  const messageInput = document.getElementById("messageInput");

  const counter = document.getElementById("messageCharacterCount");

  if (!messageInput || !counter) {
    return;
  }

  counter.textContent = messageInput.value.length;
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {
  document
    .getElementById("newNotificationBtn")
    ?.addEventListener("click", openNewNotificationModal);

  document
    .getElementById("patientSelect")
    ?.addEventListener("change", handlePatientSelection);

  document
    .getElementById("notificationTypeInput")
    ?.addEventListener("change", generateAppointmentMessage);

  document
    .getElementById("appointmentDateInput")
    ?.addEventListener("change", generateAppointmentMessage);

  document
    .getElementById("appointmentTimeInput")
    ?.addEventListener("change", generateAppointmentMessage);

  document
    .getElementById("messageInput")
    ?.addEventListener("input", updateCharacterCount);

  document
    .getElementById("notificationForm")
    ?.addEventListener("submit", createNotification);

  document
    .getElementById("closeModalBtn")
    ?.addEventListener("click", () => closeModal("notificationModal"));

  document
    .getElementById("cancelModalBtn")
    ?.addEventListener("click", () => closeModal("notificationModal"));

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

    populatePatientSelect();

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
