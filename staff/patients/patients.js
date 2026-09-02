"use strict";

const PATIENT_STORAGE_KEY = "dentanueva_patients";
const TOTAL_PATIENTS_STORAGE_KEY = "dentanueva_total_patients";

let patients = [];
let currentPatientId = null;
let currentMedicalPatientId = null;
let currentActionPatientId = null;
let currentMedicalStep = 1;
let appointmentRefreshInterval = null;
let patientFormValidationBound = false;

const $ = (id) => document.getElementById(id);

const patientTableBody = $("patientTableBody");
const patientEmptyState = $("patientEmptyState");
const patientCountLabel = $("patientCount");
const patientSearch = $("patientSearch");
const sortPatients = $("sortPatients");
const patientActionMenu = $("patientActionMenu");

document.addEventListener("DOMContentLoaded", () => {
  loadPatients();
  bindPatientEvents();
  bindMedicalFormEvents();
  bindActionMenuEvents();
  removeMedicalFormFromActionMenu();
  setupPatientFormValidation();
  renderPatients();
  updateTotalPatientCount();
  startAppointmentRealtimeRefresh();
  setupModalLayout();
});

function setupModalLayout() {
  if (document.getElementById("dentaNuevaModalLayout")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "dentaNuevaModalLayout";
  style.textContent = `
    .appointment-doctor { display:inline-flex; align-items:center; gap:4px; margin-left:5px; padding:2px 6px; border:1px solid #c8e7d4; border-radius:5px; background:#f1faf4; color:#19733f; font-size:8px; font-weight:600; line-height:1.2; white-space:nowrap; vertical-align:middle; box-sizing:border-box; }
    .appointment-doctor i { font-size:7px; line-height:1; }
    #patientModalBackdrop,
    #patientDetailsModalBackdrop,
    #medicalFormModalBackdrop,
    #medicalResultModalBackdrop {
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      overflow: hidden;
    }
    #patientModalBackdrop > *,
    #patientDetailsModalBackdrop > *,
    #medicalFormModalBackdrop > *,
    #medicalResultModalBackdrop > * {
      width: min(100%, 760px);
      max-width: 760px;
      max-height: calc(100vh - 40px);
      margin: 0;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    #patientDetailsModalBackdrop > *,
    #medicalResultModalBackdrop > * {
      width: min(100%, 820px);
      max-width: 820px;
    }
    #medicalFormModalBackdrop > * {
      width: min(100%, 920px);
      max-width: 920px;
    }
    #patientModalBackdrop .modal-body,
    #patientDetailsModalBackdrop .modal-body,
    #medicalFormModalBackdrop .modal-body,
    #medicalResultModalBackdrop .modal-body,
    #patientModalBackdrop .modal-content,
    #patientDetailsModalBackdrop .modal-content,
    #medicalFormModalBackdrop .modal-content,
    #medicalResultModalBackdrop .modal-content {
      min-height: 0;
    }
    #patientModalBackdrop .modal-body,
    #patientDetailsModalBackdrop .modal-body,
    #medicalFormModalBackdrop .modal-body,
    #medicalResultModalBackdrop .modal-body {
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: thin;
    }
    #patientDetailsModalBackdrop .details-profile,
    #medicalResultModalBackdrop .medical-result-profile {
      margin: 0;
    }
    #patientDetailsModalBackdrop .details-profile-header {
      margin-bottom: 16px;
      padding-bottom: 14px;
    }
    #patientDetailsModalBackdrop .details-grid,
    #medicalResultModalBackdrop .medical-result-grid {
      gap: 12px;
      margin: 0;
    }
    #patientDetailsModalBackdrop .details-item,
    #medicalResultModalBackdrop .medical-result-item {
      min-width: 0;
      box-sizing: border-box;
    }
    #medicalResultModalBackdrop .medical-result-section {
      margin: 0 0 14px;
      padding: 14px;
    }
    #medicalResultModalBackdrop .medical-result-section:last-of-type {
      margin-bottom: 0;
    }
    #medicalResultModalBackdrop .medical-result-profile {
      margin-bottom: 14px;
      padding: 14px 16px;
    }
    #medicalResultModalBackdrop .medical-result-consent {
      margin-top: 14px;
      padding: 12px 14px;
    }
    #medicalResultModalBackdrop .medical-result-list {
      gap: 6px;
    }
    #medicalFormModalBackdrop .medform-step,
    #medicalFormModalBackdrop .review-card {
      box-sizing: border-box;
    }
    #medicalFormModalBackdrop #medformStepViewport {
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
    }
    #medicalFormModalBackdrop #medformReview {
      display: grid;
      gap: 12px;
    }
    #medicalFormModalBackdrop .review-card {
      margin: 0;
      padding: 14px;
    }
    #medicalFormModalBackdrop .review-row {
      gap: 10px;
      padding: 8px 0;
    }
    #patientModalBackdrop form,
    #medicalFormModalBackdrop form {
      min-height: 0;
    }
    #patientModalBackdrop .modal-header,
    #patientDetailsModalBackdrop .modal-header,
    #medicalFormModalBackdrop .modal-header,
    #medicalResultModalBackdrop .modal-header {
      flex-shrink: 0;
    }
    #patientModalBackdrop .modal-footer,
    #patientDetailsModalBackdrop .modal-footer,
    #medicalFormModalBackdrop .modal-footer,
    #medicalResultModalBackdrop .modal-footer,
    #medformStepActions {
      flex-shrink: 0;
    }
    @media (max-width: 700px) {
      #patientModalBackdrop,
      #patientDetailsModalBackdrop,
      #medicalFormModalBackdrop,
      #medicalResultModalBackdrop {
        padding: 10px;
      }
      #patientModalBackdrop > *,
      #patientDetailsModalBackdrop > *,
      #medicalFormModalBackdrop > *,
      #medicalResultModalBackdrop > * {
        max-height: calc(100vh - 20px);
        border-radius: 14px;
      }
      #patientDetailsModalBackdrop .details-grid,
      #medicalResultModalBackdrop .medical-result-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function startAppointmentRealtimeRefresh() {
  if (appointmentRefreshInterval) {
    clearInterval(appointmentRefreshInterval);
  }

  appointmentRefreshInterval = setInterval(() => {
    loadPatients();
    renderPatients();
  }, 1000);
}

window.addEventListener("storage", (event) => {
  if (
    event.key === PATIENT_STORAGE_KEY ||
    event.key === TOTAL_PATIENTS_STORAGE_KEY
  ) {
    loadPatients();
    renderPatients();
  }
});

function removeMedicalFormFromActionMenu() {
  document
    .querySelectorAll(
      '#patientActionMenu [data-action="medicalForm"], #patientActionMenu button[data-action="medicalForm"], [data-action-menu] [data-action="medicalForm"]',
    )
    .forEach((button) => {
      button.remove();
    });
}

function setupPatientFormValidation() {
  const form = $("patientForm");

  if (!form) {
    return;
  }

  const fields = form.querySelectorAll(
    'input:not([type="hidden"]), select, textarea',
  );

  fields.forEach((field) => {
    field.required = true;
  });

  const phoneField = $("phone");

  if (phoneField) {
    phoneField.type = "tel";
    phoneField.required = true;
    phoneField.maxLength = 11;
    phoneField.minLength = 11;
    phoneField.pattern = "^09\\d{9}$";
    phoneField.inputMode = "numeric";
    phoneField.title = "Please enter exactly 11 digits starting with 09.";
    phoneField.setAttribute("placeholder", "09XXXXXXXXX");
  }

  const emergencyContactField = $("emergencyContact");

  if (emergencyContactField) {
    emergencyContactField.type = "tel";
    emergencyContactField.required = true;
    emergencyContactField.maxLength = 11;
    emergencyContactField.minLength = 11;
    emergencyContactField.pattern = "^09\\d{9}$";
    emergencyContactField.inputMode = "numeric";
    emergencyContactField.title =
      "Please enter exactly 11 digits starting with 09.";
    emergencyContactField.setAttribute("placeholder", "09XXXXXXXXX");
  }

  const emailField = $("email");

  if (emailField) {
    emailField.type = "email";
    emailField.required = true;
  }

  if (patientFormValidationBound) {
    return;
  }

  patientFormValidationBound = true;

  form.addEventListener("submit", (event) => {
    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    const phoneValue = phoneField?.value.trim() || "";

    if (phoneValue && !/^(09\d{9}|\+639\d{9})$/.test(phoneValue)) {
      event.preventDefault();

      if (phoneField) {
        phoneField.setCustomValidity(
          "Please enter a valid Philippine phone number (09XXXXXXXXX or +639XXXXXXXXX).",
        );

        phoneField.reportValidity();
        phoneField.focus();

        setTimeout(() => {
          phoneField.setCustomValidity("");
        }, 100);
      }

      return;
    }

    if (phoneField) {
      phoneField.setCustomValidity("");
    }

    const emergencyContactValue = emergencyContactField?.value.trim() || "";

    if (
      emergencyContactValue &&
      !/^(09\d{9}|\+639\d{9})$/.test(emergencyContactValue)
    ) {
      event.preventDefault();

      if (emergencyContactField) {
        emergencyContactField.setCustomValidity(
          "Please enter a valid Philippine emergency contact number (09XXXXXXXXX or +639XXXXXXXXX).",
        );

        emergencyContactField.reportValidity();
        emergencyContactField.focus();

        setTimeout(() => {
          emergencyContactField.setCustomValidity("");
        }, 100);
      }

      return;
    }

    if (emergencyContactField) {
      emergencyContactField.setCustomValidity("");
    }
  });
}

function loadPatients() {
  try {
    const stored = localStorage.getItem(PATIENT_STORAGE_KEY);

    if (!stored) {
      patients = [];
      localStorage.setItem(TOTAL_PATIENTS_STORAGE_KEY, "0");
      return;
    }

    const parsed = JSON.parse(stored);
    patients = Array.isArray(parsed) ? parsed : [];
    patients = patients.map((patient) => normalizePatient(patient));
    patients = mergePatientRecords(patients);

    localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(patients));

    localStorage.setItem(TOTAL_PATIENTS_STORAGE_KEY, String(patients.length));
  } catch (error) {
    console.error("Unable to load DentaNueva patients:", error);
    patients = [];
    localStorage.setItem(TOTAL_PATIENTS_STORAGE_KEY, "0");
  }
}

function normalizePatient(patient) {
  const normalized = {
    ...patient,
  };

  if (!normalized.patientId) {
    normalized.patientId =
      normalized.id || `PN-${String(Date.now()).slice(-8)}`;
  }

  if (!normalized.id) {
    normalized.id = normalized.patientId;
  }

  if (!normalized.fullName) {
    normalized.fullName = [normalized.firstName, normalized.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  if ((!normalized.firstName || !normalized.lastName) && normalized.fullName) {
    const nameParts = String(normalized.fullName).trim().split(/\s+/);

    if (!normalized.firstName) {
      normalized.firstName = nameParts.shift() || "";
    }

    if (!normalized.lastName) {
      normalized.lastName = nameParts.join(" ");
    }
  }

  if (!normalized.gender && normalized.patientGender) {
    normalized.gender = normalized.patientGender;
  }

  if (!normalized.patientGender && normalized.gender) {
    normalized.patientGender = normalized.gender;
  }

  if (!Array.isArray(normalized.appointments)) {
    normalized.appointments = [];
  }

  if (!normalized.medicalForm) {
    normalized.medicalForm = null;
  }

  return normalized;
}

function getPatientIdentityKeys(patient) {
  const keys = [];

  const patientId = String(patient.patientId || patient.id || "")
    .trim()
    .toLowerCase();

  const userId = String(patient.userId || patient.userIdRef || "")
    .trim()
    .toLowerCase();

  const email = String(patient.email || "")
    .trim()
    .toLowerCase();

  if (patientId) {
    keys.push(`patient:${patientId}`);
  }

  if (userId) {
    keys.push(`user:${userId}`);
  }

  if (email) {
    keys.push(`email:${email}`);
  }

  return keys;
}

function mergePatientRecords(records) {
  const merged = [];
  const keyMap = new Map();

  records.forEach((record) => {
    const patient = normalizePatient(record);
    const keys = getPatientIdentityKeys(patient);

    let existingIndex = -1;

    for (const key of keys) {
      if (keyMap.has(key)) {
        existingIndex = keyMap.get(key);
        break;
      }
    }

    if (existingIndex === -1) {
      const index = merged.length;
      merged.push(patient);

      keys.forEach((key) => keyMap.set(key, index));

      return;
    }

    const existing = merged[existingIndex];

    const mergedPatient = normalizePatient({
      ...existing,
      ...patient,
      id: existing.id || patient.id || existing.patientId || patient.patientId,
      patientId:
        existing.patientId || patient.patientId || existing.id || patient.id,
      appointments: patient.appointments?.length
        ? patient.appointments
        : existing.appointments || [],
      medicalForm: patient.medicalForm || existing.medicalForm || null,
      createdAt:
        existing.createdAt || patient.createdAt || new Date().toISOString(),
      updatedAt:
        patient.updatedAt || existing.updatedAt || new Date().toISOString(),
    });

    merged[existingIndex] = mergedPatient;

    getPatientIdentityKeys(mergedPatient).forEach((key) =>
      keyMap.set(key, existingIndex),
    );
  });

  return merged;
}

function savePatients() {
  try {
    localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(patients));

    localStorage.setItem(TOTAL_PATIENTS_STORAGE_KEY, String(patients.length));

    updateTotalPatientCount();
  } catch (error) {
    console.error("Unable to save DentaNueva patients:", error);
  }
}

function updateTotalPatientCount() {
  const totalPatients = patients.length;

  try {
    localStorage.setItem(TOTAL_PATIENTS_STORAGE_KEY, String(totalPatients));
  } catch (error) {
    console.error("Unable to synchronize total patient count:", error);
  }

  document.querySelectorAll("[data-total-patients]").forEach((element) => {
    element.textContent = `${totalPatients} ${
      totalPatients === 1 ? "patient" : "patients"
    }`;
  });

  const totalPatientsElement = $("totalPatients");

  if (totalPatientsElement) {
    totalPatientsElement.textContent = `${totalPatients} ${
      totalPatients === 1 ? "patient" : "patients"
    }`;
  }

  if (patientCountLabel && !patientSearch?.value?.trim()) {
    patientCountLabel.textContent = `${totalPatients} ${
      totalPatients === 1 ? "patient" : "patients"
    }`;
  }
}

function generatePatientId() {
  let maxNumber = 0;

  patients.forEach((patient) => {
    const match = String(patient.patientId || "").match(/(\d+)$/);

    if (match) {
      maxNumber = Math.max(maxNumber, Number(match[1]));
    }
  });

  return `PN-${String(maxNumber + 1).padStart(4, "0")}`;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return "";
  }

  const birthDate = new Date(`${dateOfBirth}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return "";
  }

  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return Math.max(age, 0);
}

function formatDate(dateString) {
  if (!dateString) {
    return "Not provided";
  }

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

function getFullName(patient) {
  return (
    [patient.firstName, patient.lastName].filter(Boolean).join(" ").trim() ||
    patient.fullName ||
    patient.name ||
    patient.patientName ||
    ""
  ).trim();
}

function getInitials(patient) {
  const name = getFullName(patient);

  if (!name) {
    return "PT";
  }

  const parts = name.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function valueOrNone(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "Not provided";
  }

  return String(value);
}

function arrayValue(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (!value) {
    return [];
  }

  return [value];
}

function findPatient(patientId) {
  if (patientId === undefined || patientId === null || patientId === "") {
    return null;
  }

  return (
    patients.find(
      (patient) =>
        String(patient.id) === String(patientId) ||
        String(patient.patientId) === String(patientId),
    ) || null
  );
}

function findPatientById(patientId) {
  if (!patientId) {
    return null;
  }

  return (
    patients.find(
      (patient) =>
        String(patient.id) === String(patientId) ||
        String(patient.patientId) === String(patientId),
    ) || null
  );
}

function findPatientByName(name) {
  if (!name) {
    return null;
  }

  const target = String(name).trim().toLowerCase();

  return (
    patients.find(
      (patient) => getFullName(patient).trim().toLowerCase() === target,
    ) || null
  );
}

function setupPatientDatalist() {
  const patientInput = document.getElementById("f_patient");

  if (!patientInput) {
    return;
  }

  let datalist = document.getElementById("appointmentPatientList");

  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "appointmentPatientList";
    document.body.appendChild(datalist);
  }

  patientInput.setAttribute("list", "appointmentPatientList");

  refreshPatientSelector();
}

function refreshPatientSelector() {
  const patientInput = document.getElementById("f_patient");

  if (!patientInput) {
    return;
  }

  let datalist = document.getElementById("appointmentPatientList");

  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "appointmentPatientList";
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = "";

  patients
    .slice()
    .sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
    .forEach((patient) => {
      const option = document.createElement("option");

      option.value = getFullName(patient);

      option.label = `${getFullName(patient)} · ${
        patient.patientId || patient.id
      }`;

      datalist.appendChild(option);
    });

  patientInput.setAttribute("list", "appointmentPatientList");
}

function handlePatientInputChange() {
  const patientInput = document.getElementById("f_patient");

  if (!patientInput) {
    return;
  }

  const patient = findPatientByName(patientInput.value);

  if (patient) {
    patientInput.value = getFullName(patient);
  }
}

function getCurrentFormPatient() {
  const patientInput = document.getElementById("f_patient");

  if (!patientInput) {
    return null;
  }

  const value = patientInput.value.trim();

  if (!value) {
    return null;
  }

  return findPatientByName(value);
}

function bindPatientEvents() {
  $("addPatientBtn")?.addEventListener("click", () => {
    openAddPatientModal();
  });

  $("closePatientModal")?.addEventListener("click", closePatientModal);

  $("cancelPatientBtn")?.addEventListener("click", closePatientModal);

  $("patientModalBackdrop")?.addEventListener("click", (event) => {
    if (event.target === $("patientModalBackdrop")) {
      closePatientModal();
    }
  });

  $("patientForm")?.addEventListener("submit", savePatientFromForm);

  $("closePatientDetailsModal")?.addEventListener(
    "click",
    closePatientDetailsModal,
  );

  $("patientDetailsModalBackdrop")?.addEventListener("click", (event) => {
    if (event.target === $("patientDetailsModalBackdrop")) {
      closePatientDetailsModal();
    }
  });

  patientSearch?.addEventListener("input", renderPatients);

  sortPatients?.addEventListener("change", renderPatients);
}

function openAddPatientModal() {
  currentPatientId = null;

  const form = $("patientForm");

  form?.reset();

  setupPatientFormValidation();

  $("patientId").value = "";
  $("patientModalTitle").textContent = "Add Patient";

  $("patientModalBackdrop").classList.add("open");

  $("patientModalBackdrop").setAttribute("aria-hidden", "false");

  setTimeout(() => {
    $("firstName")?.focus();
  }, 50);
}

function openEditPatientModal(patientId) {
  const patient = findPatient(patientId);

  if (!patient) {
    return;
  }

  currentPatientId = patient.id || patient.patientId;

  $("patientModalTitle").textContent = "Edit Patient";

  $("patientId").value = patient.id || patient.patientId || "";

  $("firstName").value = patient.firstName || "";

  $("lastName").value = patient.lastName || "";

  $("dateOfBirth").value = patient.dateOfBirth || "";

  $("patientGender").value = patient.gender || patient.patientGender || "";

  $("phone").value = patient.phone || "";

  $("email").value = patient.email || "";

  $("address").value = patient.address || "";

  $("emergencyName").value = patient.emergencyName || "";

  $("emergencyContact").value = patient.emergencyContact || "";

  setupPatientFormValidation();

  $("patientModalBackdrop").classList.add("open");

  $("patientModalBackdrop").setAttribute("aria-hidden", "false");
}

function savePatientFromForm(event) {
  event.preventDefault();

  const form = $("patientForm");

  if (form && !form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const phoneField = $("phone");
  const phoneValue = phoneField?.value.trim() || "";

  if (!/^(09\d{9}|\+639\d{9})$/.test(phoneValue)) {
    if (phoneField) {
      phoneField.setCustomValidity(
        "Please enter a valid Philippine phone number (09XXXXXXXXX or +639XXXXXXXXX).",
      );

      phoneField.reportValidity();
      phoneField.focus();

      setTimeout(() => {
        phoneField.setCustomValidity("");
      }, 100);
    }

    return;
  }

  if (phoneField) {
    phoneField.setCustomValidity("");
  }

  const emergencyContactField = $("emergencyContact");

  const emergencyContactValue = emergencyContactField?.value.trim() || "";

  if (!/^(09\d{9}|\+639\d{9})$/.test(emergencyContactValue)) {
    if (emergencyContactField) {
      emergencyContactField.setCustomValidity(
        "Please enter a valid Philippine emergency contact number (09XXXXXXXXX or +639XXXXXXXXX).",
      );

      emergencyContactField.reportValidity();
      emergencyContactField.focus();

      setTimeout(() => {
        emergencyContactField.setCustomValidity("");
      }, 100);
    }

    return;
  }

  if (emergencyContactField) {
    emergencyContactField.setCustomValidity("");
  }

  const emailValue = String($("email")?.value || "")
    .trim()
    .toLowerCase();

  const existingPatient = currentPatientId
    ? findPatient(currentPatientId)
    : patients.find(
        (item) =>
          emailValue &&
          String(item.email || "")
            .trim()
            .toLowerCase() === emailValue,
      ) || null;

  const patientId = existingPatient?.patientId || generatePatientId();

  const id = existingPatient?.id || patientId;

  const now = new Date().toISOString();

  const patient = {
    ...(existingPatient || {}),
    id,
    patientId,
    firstName: $("firstName").value.trim(),
    lastName: $("lastName").value.trim(),
    fullName:
      `${$("firstName").value.trim()} ${$("lastName").value.trim()}`.trim(),
    dateOfBirth: $("dateOfBirth").value,
    gender: $("patientGender").value,
    patientGender: $("patientGender").value,
    phone: $("phone").value.trim(),
    email: $("email").value.trim(),
    address: $("address").value.trim(),
    emergencyName: $("emergencyName").value.trim(),
    emergencyContact: $("emergencyContact").value.trim(),
    appointments: Array.isArray(existingPatient?.appointments)
      ? existingPatient.appointments
      : [],
    updatedAt: now,
  };

  if (!existingPatient) {
    patient.createdAt = now;
    patient.medicalForm = null;
    patients.push(patient);
  } else {
    const index = patients.findIndex(
      (item) =>
        String(item.id || item.patientId) ===
        String(existingPatient.id || existingPatient.patientId),
    );

    if (index !== -1) {
      patients[index] = patient;
    }
  }

  savePatients();
  closePatientModal();
  renderPatients();
}

function closePatientModal() {
  $("patientModalBackdrop")?.classList.remove("open");

  $("patientModalBackdrop")?.setAttribute("aria-hidden", "true");

  currentPatientId = null;
}

function renderPatients() {
  if (!patientTableBody) {
    return;
  }

  let filteredPatients = [...patients];

  const search = patientSearch?.value?.trim().toLowerCase() || "";

  if (search) {
    filteredPatients = filteredPatients.filter((patient) => {
      const searchable = [
        getFullName(patient),
        patient.patientId,
        patient.id,
        patient.email,
        patient.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(search);
    });
  }

  const sort = sortPatients?.value || "newest";

  if (sort === "withSchedule") {
    filteredPatients = filteredPatients.filter((patient) => {
      return getNextAppointment(patient) !== null;
    });
  }

  filteredPatients.sort((a, b) => {
    if (sort === "nameAsc" || sort === "nameDesc") {
      const nameA = getFullName(a).toLowerCase();

      const nameB = getFullName(b).toLowerCase();

      return sort === "nameAsc"
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
    }

    const dateA = new Date(a.createdAt || a.updatedAt || 0).getTime();

    const dateB = new Date(b.createdAt || b.updatedAt || 0).getTime();

    return sort === "oldest" ? dateA - dateB : dateB - dateA;
  });

  patientTableBody.innerHTML = "";

  const displayedPatientCount = filteredPatients.length;

  if (patientCountLabel) {
    patientCountLabel.textContent = `${displayedPatientCount} ${
      displayedPatientCount === 1 ? "patient" : "patients"
    }`;
  }

  if (!displayedPatientCount) {
    if (patientEmptyState) {
      patientEmptyState.hidden = false;
    }

    updateTotalPatientCount();
    return;
  }

  if (patientEmptyState) {
    patientEmptyState.hidden = true;
  }

  filteredPatients.forEach((patient) => {
    const row = document.createElement("tr");

    row.innerHTML = createPatientRow(patient);

    patientTableBody.appendChild(row);
  });

  updateTotalPatientCount();

  if (patientCountLabel) {
    patientCountLabel.textContent = `${displayedPatientCount} ${
      displayedPatientCount === 1 ? "patient" : "patients"
    }`;
  }
}

function createPatientRow(patient) {
  const name = getFullName(patient) || "Unnamed Patient";

  const patientId = patient.patientId || patient.id || "N/A";

  const age = calculateAge(patient.dateOfBirth);

  const gender = patient.gender || patient.patientGender || "Not specified";

  const medicalForm = patient.medicalForm || null;

  const hasMedicalForm = !!medicalForm && medicalForm.completed !== false;

  const medicalButtonClass = hasMedicalForm ? "completed" : "pending";

  const medicalButtonText = hasMedicalForm ? "View Form" : "Fill Form";

  const nextAppointment = getNextAppointment(patient);

  return `
    <td>
      <div class="patient-cell">
        <div class="patient-avatar">
          ${escapeHTML(getInitials(patient))}
        </div>
        <div class="patient-main-info">
          <p class="patient-name">
            ${escapeHTML(name)}
          </p>
          <span class="patient-id">
            ${escapeHTML(patientId)}
          </span>
        </div>
      </div>
    </td>
    <td>
      <span class="contact-primary">
        ${escapeHTML(valueOrNone(patient.phone))}
      </span>
      <span class="contact-secondary">
        ${escapeHTML(valueOrNone(patient.email))}
      </span>
    </td>
    <td>
      <span class="age-primary">
        ${escapeHTML(age === "" ? "—" : `${age} years old`)}
      </span>
      <span class="age-secondary">
        ${escapeHTML(gender)}
      </span>
    </td>
    <td>
      ${renderAppointment(nextAppointment)}
    </td>
    <td>
      <button
        type="button"
        class="medical-form-button ${medicalButtonClass}"
        data-medical-form-id="${escapeHTML(patient.id || patient.patientId)}"
      >
        ${medicalButtonText}
      </button>
    </td>
    <td class="patient-action-cell">
      <button
        type="button"
        class="patient-action-trigger"
        data-action-trigger
        data-patient-id="${escapeHTML(patient.id || patient.patientId)}"
        aria-label="Patient actions"
      >
        <i class="fa-solid fa-ellipsis-vertical"></i>
      </button>
    </td>
  `;
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createAppointmentDateTime(date, time) {
  if (!date) {
    return null;
  }

  const normalizedTime = time || "00:00";

  const dateTime = new Date(`${date}T${normalizedTime}`);

  if (Number.isNaN(dateTime.getTime())) {
    return null;
  }

  return dateTime;
}

function getAppointmentStatus(appointment) {
  const status = String(
    appointment.status ||
      appointment.appointmentStatus ||
      appointment.state ||
      "",
  )
    .trim()
    .toLowerCase();

  if (status === "completed" || status === "complete") {
    return "completed";
  }

  if (status === "cancelled" || status === "canceled") {
    return "cancelled";
  }

  if (status === "no_show" || status === "no show" || status === "noshow") {
    return "no_show";
  }

  if (status === "confirmed") {
    return "confirmed";
  }

  return "pending";
}

function isAppointmentToday(appointment) {
  return appointment.date === getLocalDateString(new Date());
}

function isFutureAppointment(appointment) {
  const today = getLocalDateString(new Date());

  return appointment.date > today;
}

function isPastAppointmentDate(appointment) {
  const today = getLocalDateString(new Date());

  return appointment.date < today;
}

function getNextAppointment(patient) {
  const appointments = Array.isArray(patient.appointments)
    ? patient.appointments
    : [];

  if (!appointments.length) {
    return null;
  }

  const now = new Date();

  const today = getLocalDateString(now);

  const normalizedAppointments = appointments
    .map((appointment) => {
      const date =
        appointment.date ||
        appointment.appointmentDate ||
        appointment.scheduleDate ||
        "";

      const time =
        appointment.time ||
        appointment.start ||
        appointment.appointmentTime ||
        "00:00";

      const duration = Number(
        appointment.duration || appointment.durationMinutes || 0,
      );

      const dateTime = createAppointmentDateTime(date, time);

      let endTime = time;
      let endDateTime = null;

      if (dateTime && Number.isFinite(duration) && duration > 0) {
        endDateTime = new Date(dateTime.getTime() + duration * 60 * 1000);

        endTime = `${String(endDateTime.getHours()).padStart(2, "0")}:${String(
          endDateTime.getMinutes(),
        ).padStart(2, "0")}`;
      }

      return {
        ...appointment,
        date,
        time,
        duration,
        endTime,
        dateTime,
        endDateTime,
        status: getAppointmentStatus(appointment),
      };
    })
    .filter((appointment) => appointment.date);

  if (!normalizedAppointments.length) {
    return null;
  }

  const todaysAppointments = normalizedAppointments
    .filter((appointment) => {
      if (appointment.status === "cancelled") {
        return false;
      }

      return appointment.date === today;
    })
    .sort(
      (a, b) => (a.dateTime?.getTime() || 0) - (b.dateTime?.getTime() || 0),
    );

  if (todaysAppointments.length) {
    const activeToday = todaysAppointments
      .filter((appointment) => {
        if (
          appointment.status === "completed" ||
          appointment.status === "no_show"
        ) {
          return false;
        }

        if (appointment.endDateTime) {
          return appointment.endDateTime >= now;
        }

        if (appointment.dateTime) {
          return appointment.dateTime >= now;
        }

        return false;
      })
      .sort(
        (a, b) => (a.dateTime?.getTime() || 0) - (b.dateTime?.getTime() || 0),
      );

    if (activeToday.length) {
      return activeToday[0];
    }

    const completedToday = todaysAppointments
      .filter((appointment) => appointment.status === "completed")
      .sort(
        (a, b) => (b.dateTime?.getTime() || 0) - (a.dateTime?.getTime() || 0),
      );

    if (completedToday.length) {
      return completedToday[0];
    }

    return todaysAppointments[todaysAppointments.length - 1];
  }

  const futureAppointments = normalizedAppointments
    .filter((appointment) => {
      if (appointment.status === "cancelled") {
        return false;
      }

      return appointment.date > today;
    })
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }

      return (a.dateTime?.getTime() || 0) - (b.dateTime?.getTime() || 0);
    });

  if (futureAppointments.length) {
    return futureAppointments[0];
  }

  return null;
}

function formatTime12Hour(timeString) {
  if (!timeString) {
    return "";
  }

  const time = String(timeString).trim();

  if (/[APap][Mm]$/.test(time)) {
    return time;
  }

  const match = time.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return time;
  }

  let hours = Number(match[1]);

  const minutes = match[2];

  if (Number.isNaN(hours) || hours < 0 || hours > 23) {
    return time;
  }

  const period = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;

  if (hours === 0) {
    hours = 12;
  }

  return `${hours}:${minutes} ${period}`;
}

function renderAppointment(appointment) {
  if (!appointment) {
    return `
      <span class="appointment-none">
        No upcoming appointment
      </span>
    `;
  }

  const startTime = formatTime12Hour(appointment.time || "");

  const endTime = formatTime12Hour(
    appointment.endTime || appointment.time || "",
  );

  const timeDisplay =
    appointment.duration > 0 ? `${startTime} – ${endTime}` : startTime;

  const dentistNames = {
    santos: "Dr. Santos",
    cruz: "Dr. Cruz",
    ramos: "Dr. Ramos",
  };

  const assignedDoctor =
    dentistNames[String(appointment.dentist || "").toLowerCase()] || "";

  const doctorDisplay = assignedDoctor
    ? `
      <span class="appointment-doctor">
        <i class="fa-solid fa-user-doctor"></i>
        ${escapeHTML(assignedDoctor)}
      </span>
    `
    : "";

  const status = appointment.status || "pending";

  const isCompleted = status === "completed";

  const isToday = isAppointmentToday(appointment);

  const todayDisplay = isToday
    ? `
      <span class="appointment-status appointment-status-today">
        Today
      </span>
    `
    : "";

  const completedDisplay = isCompleted
    ? `
      <span class="appointment-status appointment-status-completed completed">
        Completed
      </span>
    `
    : "";

  return `
    <div class="appointment-date">
      ${escapeHTML(formatDate(appointment.date))}
    </div>
    <div class="appointment-time">
      ${escapeHTML(timeDisplay)}
    </div>
    <div class="appointment-meta">
      ${doctorDisplay}
      ${todayDisplay}
      ${completedDisplay}
    </div>
  `;
}

patientTableBody?.addEventListener("click", (event) => {
  const medicalButton = event.target.closest("[data-medical-form-id]");

  if (medicalButton) {
    const patientId = medicalButton.dataset.medicalFormId;

    const patient = findPatient(patientId);

    if (!patient) {
      return;
    }

    if (patient.medicalForm) {
      openMedicalForm(patient, 5);
    } else {
      openMedicalForm(patient, 1);
    }

    return;
  }

  const actionTrigger = event.target.closest("[data-action-trigger]");

  if (actionTrigger) {
    const patientId = actionTrigger.dataset.patientId;

    openActionMenu(actionTrigger, patientId);
  }
});

function bindActionMenuEvents() {
  patientActionMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button || !patientActionMenu.contains(button)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset.action;

    if (!action || action === "medicalForm") {
      return;
    }

    const patientId = button.dataset.patientId || currentActionPatientId;

    closeActionMenu();

    handlePatientAction(action, patientId);
  });

  document.addEventListener("click", (event) => {
    if (patientActionMenu && patientActionMenu.classList.contains("open")) {
      const clickedInsideMenu = patientActionMenu.contains(event.target);

      const clickedTrigger = event.target.closest("[data-action-trigger]");

      if (!clickedInsideMenu && !clickedTrigger) {
        closeActionMenu();
      }
    }
  });

  window.addEventListener("resize", closeActionMenu);

  window.addEventListener("scroll", closeActionMenu, true);
}

function openActionMenu(trigger, patientId) {
  removeMedicalFormFromActionMenu();

  currentActionPatientId = patientId;

  const rect = trigger.getBoundingClientRect();

  patientActionMenu.classList.add("open");

  const menuWidth = patientActionMenu.offsetWidth;

  const menuHeight = patientActionMenu.offsetHeight;

  let left = rect.right - menuWidth;

  let top = rect.bottom + 7;

  if (left < 10) {
    left = 10;
  }

  if (left + menuWidth > window.innerWidth - 10) {
    left = window.innerWidth - menuWidth - 10;
  }

  if (top + menuHeight > window.innerHeight - 10) {
    top = rect.top - menuHeight - 7;
  }

  patientActionMenu.style.left = `${left}px`;

  patientActionMenu.style.top = `${top}px`;

  document
    .querySelectorAll(".patient-action-trigger.active")
    .forEach((button) => button.classList.remove("active"));

  trigger.classList.add("active");
}

function closeActionMenu() {
  patientActionMenu?.classList.remove("open");

  document
    .querySelectorAll(".patient-action-trigger.active")
    .forEach((button) => button.classList.remove("active"));

  currentActionPatientId = null;
}

function handlePatientAction(action, patientId) {
  const patient = findPatient(patientId);

  if (!patient) {
    return;
  }

  switch (action) {
    case "view":
      openPatientDetails(patient);
      break;

    case "edit":
      openEditPatientModal(patientId);
      break;

    case "delete":
      deletePatient(patientId);
      break;
  }
}

function openPatientDetails(patient) {
  const name = getFullName(patient);

  const age = calculateAge(patient.dateOfBirth);

  const gender = patient.gender || patient.patientGender || "Not specified";

  $("patientDetailsTitle").textContent = name || "Patient Details";

  $("patientDetailsBody").innerHTML = `
    <div class="details-profile">
      <div class="details-profile-header">
        <div class="details-profile-avatar">
          ${escapeHTML(getInitials(patient))}
        </div>

        <div class="details-profile-name">
          <h3>
            ${escapeHTML(name || "Unnamed Patient")}
          </h3>

          <span>
            ${escapeHTML(patient.patientId || patient.id || "N/A")}
          </span>
        </div>
      </div>

      <div class="details-grid">
        <div class="details-item">
          <label>DATE OF BIRTH</label>
          <p>
            ${escapeHTML(formatDate(patient.dateOfBirth))}
          </p>
        </div>

        <div class="details-item">
          <label>AGE</label>
          <p>
            ${escapeHTML(age === "" ? "Not provided" : `${age} years`)}
          </p>
        </div>

        <div class="details-item">
          <label>GENDER</label>
          <p>
            ${escapeHTML(gender)}
          </p>
        </div>

        <div class="details-item">
          <label>PHONE</label>
          <p>
            ${escapeHTML(valueOrNone(patient.phone))}
          </p>
        </div>

        <div class="details-item">
          <label>EMAIL</label>
          <p>
            ${escapeHTML(valueOrNone(patient.email))}
          </p>
        </div>

        <div class="details-item">
          <label>EMERGENCY CONTACT</label>
          <p>
            ${escapeHTML(valueOrNone(patient.emergencyName))}
          </p>
        </div>

        <div class="details-item">
          <label>EMERGENCY CONTACT NO.</label>
          <p>
            ${escapeHTML(valueOrNone(patient.emergencyContact))}
          </p>
        </div>

        <div class="details-item full">
          <label>ADDRESS</label>
          <p>
            ${escapeHTML(valueOrNone(patient.address))}
          </p>
        </div>
      </div>
    </div>
  `;

  $("patientDetailsModalBackdrop").classList.add("open");

  $("patientDetailsModalBackdrop").setAttribute("aria-hidden", "false");
}

function closePatientDetailsModal() {
  $("patientDetailsModalBackdrop")?.classList.remove("open");

  $("patientDetailsModalBackdrop")?.setAttribute("aria-hidden", "true");
}

function bindMedicalFormEvents() {
  $("closeMedicalFormModal")?.addEventListener("click", closeMedicalForm);

  $("cancelMedicalFormBtn")?.addEventListener("click", closeMedicalForm);

  $("medicalFormModalBackdrop")?.addEventListener("click", (event) => {
    if (event.target === $("medicalFormModalBackdrop")) {
      closeMedicalForm();
    }
  });

  $("medformNextBtn")?.addEventListener("click", () => {
    if (currentMedicalStep >= 5) {
      updateMedicalStep();
      return;
    }

    currentMedicalStep++;
    updateMedicalStep();
  });

  $("medformBackBtn")?.addEventListener("click", () => {
    if (currentMedicalStep > 1) {
      currentMedicalStep--;
      updateMedicalStep();
    }
  });

  $("medicalForm")?.addEventListener("submit", saveMedicalForm);

  $("medConsent")?.addEventListener("change", updateSubmitButton);
}

function openMedicalForm(patient, step = 1) {
  currentMedicalPatientId = patient.id || patient.patientId;

  currentMedicalStep = Math.min(Math.max(step, 1), 5);

  resetMedicalForm();
  populateMedicalProfile(patient);

  if (patient.medicalForm) {
    populateExistingMedicalForm(patient.medicalForm);
  }

  $("medicalFormModalBackdrop").classList.add("open");

  $("medicalFormModalBackdrop").setAttribute("aria-hidden", "false");

  updateMedicalStep();

  setTimeout(() => {
    if ($("medformStepViewport")) {
      $("medformStepViewport").scrollTop = 0;
    }
  }, 0);
}

function resetMedicalForm() {
  $("medicalForm")?.reset();

  $("medFormPatientId").value = "";

  $("medPatientName").value = "";

  $("medPatientIdDisplay").value = "";

  $("medDateOfBirth").value = "";

  $("medAge").value = "";

  $("medGender").value = "";

  $("medContact").value = "";

  $("medAddress").value = "";

  $("medEmergencyName").value = "";

  $("medEmergencyContact").value = "";

  $("dentalConcernOther").value = "";

  $("negativeExperienceNote").value = "";

  $("medLastVisit").value = "";

  $("medLastTreatment").value = "";

  $("currentMedicationsList").value = "";

  $("medicalOther").value = "";

  $("allergyOther").value = "";

  $("medConsent").checked = false;

  $("medicalLastUpdated").hidden = true;

  $("medicalLastUpdated").textContent = "";

  $("medformReview").innerHTML = "";
}

function populateMedicalProfile(patient) {
  const name = getFullName(patient);

  const age = calculateAge(patient.dateOfBirth);

  $("medFormPatientId").value = patient.id || patient.patientId || "";

  $("medPatientName").value = name;

  $("medPatientIdDisplay").value = patient.patientId || patient.id || "";

  $("medDateOfBirth").value = formatDate(patient.dateOfBirth);

  $("medAge").value = age === "" ? "" : `${age} years`;

  $("medGender").value = patient.gender || patient.patientGender || "";

  $("medContact").value = patient.phone || "";

  $("medAddress").value = patient.address || "";

  $("medEmergencyName").value = patient.emergencyName || "";

  $("medEmergencyContact").value = patient.emergencyContact || "";
}

function populateExistingMedicalForm(medical) {
  setCheckboxValues("dentalConcern", medical.dentalConcern);

  if (medical.dentalConcernOther) {
    $("dentalConcernOtherCheck").checked = true;

    $("dentalConcernOther").value = medical.dentalConcernOther;
  }

  setRadioValue("negativeExperience", medical.negativeExperience);

  $("negativeExperienceNote").value = medical.negativeExperienceNote || "";

  $("medLastVisit").value = medical.medLastVisit || "";

  $("medLastTreatment").value = medical.medLastTreatment || "";

  setRadioValue("currentMedications", medical.currentMedications);

  $("currentMedicationsList").value = medical.currentMedicationsList || "";

  setCheckboxValues("medicalHistory", medical.medicalHistory);

  if (medical.medicalOther) {
    $("medicalOtherCheck").checked = true;

    $("medicalOther").value = medical.medicalOther;
  }

  setCheckboxValues("allergies", medical.allergies);

  if (medical.allergyOther) {
    $("allergyOtherCheck").checked = true;

    $("allergyOther").value = medical.allergyOther;
  }

  $("medConsent").checked = !!medical.consent;

  if (medical.updatedAt) {
    $("medicalLastUpdated").hidden = false;

    $("medicalLastUpdated").textContent = `Last updated ${formatDateTime(
      medical.updatedAt,
    )}`;
  }
}

function setCheckboxValues(name, values) {
  const normalized = arrayValue(values);

  document.querySelectorAll(`input[name="${name}"]`).forEach((checkbox) => {
    checkbox.checked = normalized.includes(checkbox.value);
  });
}

function setRadioValue(name, value) {
  if (!value) {
    return;
  }

  const radio = document.querySelector(
    `input[name="${name}"][value="${CSS.escape(value)}"]`,
  );

  if (radio) {
    radio.checked = true;
  }
}

function updateMedicalStep() {
  document.querySelectorAll(".medform-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step);

    step.classList.toggle("active", stepNumber === currentMedicalStep);
  });

  document.querySelectorAll(".medform-progress-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step);

    step.classList.toggle("active", stepNumber === currentMedicalStep);

    step.classList.toggle("completed", stepNumber < currentMedicalStep);
  });

  const progress = ((currentMedicalStep - 1) / 4) * 100;

  if ($("medformProgressFill")) {
    $("medformProgressFill").style.width = `${progress}%`;
  }

  const backButton = $("medformBackBtn");

  const nextButton = $("medformNextBtn");

  const submitButton = $("medformSubmitBtn");

  if (backButton) {
    const firstStep = currentMedicalStep === 1;

    backButton.hidden = firstStep;

    backButton.setAttribute("aria-hidden", firstStep ? "true" : "false");

    backButton.tabIndex = firstStep ? -1 : 0;
  }

  if (nextButton) {
    const isFinalStep = currentMedicalStep === 5;

    nextButton.hidden = isFinalStep;

    nextButton.disabled = isFinalStep;

    nextButton.setAttribute("aria-hidden", isFinalStep ? "true" : "false");

    nextButton.tabIndex = isFinalStep ? -1 : 0;

    if (isFinalStep) {
      nextButton.style.setProperty("display", "none", "important");
    } else {
      nextButton.style.removeProperty("display");
    }
  }

  if (submitButton) {
    const isFinalStep = currentMedicalStep === 5;

    submitButton.hidden = !isFinalStep;

    submitButton.setAttribute("aria-hidden", !isFinalStep ? "true" : "false");

    if (isFinalStep) {
      submitButton.style.removeProperty("display");
    } else {
      submitButton.style.setProperty("display", "none", "important");
    }
  }

  $("medformStepActions")?.classList.toggle(
    "is-final-step",
    currentMedicalStep === 5,
  );

  if (currentMedicalStep === 5) {
    buildMedicalReview();
  }

  if ($("medformStepViewport")) {
    $("medformStepViewport").scrollTop = 0;
  }

  updateSubmitButton();
}

function updateSubmitButton() {
  const submitButton = $("medformSubmitBtn");

  if (!submitButton) {
    return;
  }

  if (currentMedicalStep !== 5) {
    submitButton.disabled = false;

    return;
  }

  submitButton.disabled = !$("medConsent").checked;
}

function buildMedicalReview() {
  const data = collectMedicalFormData(false);

  $("medformReview").innerHTML = `
    <div class="review-card">
      <h4>Dental Concern</h4>
      ${reviewRow(
        "Reason for Visit",
        data.dentalConcern.join(", ") || "Not provided",
      )}
      ${reviewRow("Other Concern", data.dentalConcernOther || "None")}
      ${reviewRow("Negative Experience", data.negativeExperience || "No")}
      ${reviewRow("Explanation", data.negativeExperienceNote || "None")}
    </div>

    <div class="review-card">
      <h4>Dental History</h4>
      ${reviewRow(
        "Last Dental Visit",
        data.medLastVisit ? formatDate(data.medLastVisit) : "Not provided",
      )}
      ${reviewRow("Last Treatment", data.medLastTreatment || "Not provided")}
      ${reviewRow("Current Medications", data.currentMedications || "No")}
      ${reviewRow("Medication List", data.currentMedicationsList || "None")}
    </div>

    <div class="review-card">
      <h4>Medical History</h4>
      ${reviewRow(
        "Medical Conditions",
        data.medicalHistory.join(", ") || "None",
      )}
      ${reviewRow("Other Condition", data.medicalOther || "None")}
    </div>

    <div class="review-card">
      <h4>Allergies</h4>
      ${reviewRow("Allergies", data.allergies.join(", ") || "None")}
      ${reviewRow("Other Allergy", data.allergyOther || "None")}
    </div>
  `;
}

function reviewRow(label, value) {
  return `
    <div class="review-row">
      <span class="review-label">
        ${escapeHTML(label)}
      </span>
      <span class="review-value">
        ${escapeHTML(value)}
      </span>
    </div>
  `;
}

function collectMedicalFormData(includeConsent = true) {
  return {
    dentalConcern: Array.from(
      document.querySelectorAll('input[name="dentalConcern"]:checked'),
    ).map((input) => input.value),

    dentalConcernOther: $("dentalConcernOther")?.value.trim() || "",

    negativeExperience:
      document.querySelector('input[name="negativeExperience"]:checked')
        ?.value || "No",

    negativeExperienceNote: $("negativeExperienceNote")?.value.trim() || "",

    medLastVisit: $("medLastVisit")?.value || "",

    medLastTreatment: $("medLastTreatment")?.value.trim() || "",

    currentMedications:
      document.querySelector('input[name="currentMedications"]:checked')
        ?.value || "No",

    currentMedicationsList: $("currentMedicationsList")?.value.trim() || "",

    medicalHistory: Array.from(
      document.querySelectorAll('input[name="medicalHistory"]:checked'),
    ).map((input) => input.value),

    medicalOther: $("medicalOther")?.value.trim() || "",

    allergies: Array.from(
      document.querySelectorAll('input[name="allergies"]:checked'),
    ).map((input) => input.value),

    allergyOther: $("allergyOther")?.value.trim() || "",

    consent: includeConsent ? $("medConsent").checked : false,
  };
}

function saveMedicalForm(event) {
  event.preventDefault();

  if (currentMedicalStep !== 5) {
    return;
  }

  if (!$("medConsent").checked) {
    $("medConsent").focus();
    return;
  }

  const patient = findPatient(currentMedicalPatientId);

  if (!patient) {
    return;
  }

  const medicalData = collectMedicalFormData(true);

  const now = new Date().toISOString();

  patient.medicalForm = {
    ...medicalData,
    completed: true,
    createdAt: patient.medicalForm?.createdAt || now,
    updatedAt: now,
  };

  patient.updatedAt = now;

  savePatients();
  closeMedicalForm();
  renderPatients();
}

function closeMedicalForm() {
  $("medicalFormModalBackdrop")?.classList.remove("open");

  $("medicalFormModalBackdrop")?.setAttribute("aria-hidden", "true");

  currentMedicalPatientId = null;

  currentMedicalStep = 1;

  const nextButton = $("medformNextBtn");

  if (nextButton) {
    nextButton.disabled = false;

    nextButton.hidden = false;

    nextButton.removeAttribute("aria-hidden");

    nextButton.tabIndex = 0;

    nextButton.style.removeProperty("display");
  }

  const submitButton = $("medformSubmitBtn");

  if (submitButton) {
    submitButton.hidden = true;

    submitButton.disabled = false;

    submitButton.setAttribute("aria-hidden", "true");

    submitButton.style.setProperty("display", "none", "important");
  }
}

function openMedicalResult(patient) {
  const medical = patient.medicalForm;

  if (!medical) {
    $("medicalResultUpdated").textContent =
      "No medical form has been completed yet.";

    $("medicalResultBody").innerHTML = `
      <div class="medical-result-section">
        <h3>
          Medical Form Not Completed
        </h3>

        <div class="medical-result-value">
          The patient does not have a saved
          Medical &amp; Dental History form yet.
        </div>
      </div>
    `;

    $("editMedicalResultBtn").textContent = "Fill Out Medical Form";

    $("editMedicalResultBtn").dataset.mode = "fill";
  } else {
    $("medicalResultUpdated").textContent = medical.updatedAt
      ? `Last updated ${formatDateTime(medical.updatedAt)}`
      : "";

    $("medicalResultBody").innerHTML = buildMedicalResult(patient, medical);

    $("editMedicalResultBtn").textContent = "Edit Medical Form";

    $("editMedicalResultBtn").dataset.mode = "edit";
  }

  $("editMedicalResultBtn").dataset.patientId = patient.id || patient.patientId;

  $("medicalResultModalBackdrop").classList.add("open");

  $("medicalResultModalBackdrop").setAttribute("aria-hidden", "false");
}

function buildMedicalResult(patient, medical) {
  const concerns = [...arrayValue(medical.dentalConcern)];

  if (medical.dentalConcernOther) {
    concerns.push(medical.dentalConcernOther);
  }

  const medicalHistory = [...arrayValue(medical.medicalHistory)];

  if (medical.medicalOther) {
    medicalHistory.push(medical.medicalOther);
  }

  const allergies = [...arrayValue(medical.allergies)];

  if (medical.allergyOther) {
    allergies.push(medical.allergyOther);
  }

  return `
    <div class="medical-result-profile">
      <h3>
        ${escapeHTML(getFullName(patient))}
      </h3>

      <p>
        Patient ID:
        ${escapeHTML(patient.patientId || patient.id || "N/A")}
      </p>
    </div>

    <section class="medical-result-section">
      <h3>Dental Concern</h3>

      <div class="medical-result-grid">
        <div class="medical-result-item full">
          <span class="medical-result-label">
            Reason for Visit
          </span>

          ${renderResultTags(concerns)}
        </div>

        <div class="medical-result-item">
          <span class="medical-result-label">
            Negative Dental Experience
          </span>

          <div class="medical-result-value">
            ${escapeHTML(valueOrNone(medical.negativeExperience))}
          </div>
        </div>

        <div class="medical-result-item">
          <span class="medical-result-label">
            Explanation
          </span>

          <div class="medical-result-value">
            ${escapeHTML(valueOrNone(medical.negativeExperienceNote))}
          </div>
        </div>
      </div>
    </section>

    <section class="medical-result-section">
      <h3>Dental History</h3>

      <div class="medical-result-grid">
        <div class="medical-result-item">
          <span class="medical-result-label">
            Last Dental Visit
          </span>

          <div class="medical-result-value">
            ${escapeHTML(
              medical.medLastVisit
                ? formatDate(medical.medLastVisit)
                : "Not provided",
            )}
          </div>
        </div>

        <div class="medical-result-item">
          <span class="medical-result-label">
            Current Medications
          </span>

          <div class="medical-result-value">
            ${escapeHTML(valueOrNone(medical.currentMedications))}
          </div>
        </div>

        <div class="medical-result-item full">
          <span class="medical-result-label">
            Last Treatment
          </span>

          <div class="medical-result-value">
            ${escapeHTML(valueOrNone(medical.medLastTreatment))}
          </div>
        </div>

        <div class="medical-result-item full">
          <span class="medical-result-label">
            Medication / Supplement List
          </span>

          <div class="medical-result-value">
            ${escapeHTML(valueOrNone(medical.currentMedicationsList))}
          </div>
        </div>
      </div>
    </section>

    <section class="medical-result-section">
      <h3>Medical History</h3>

      <div class="medical-result-grid">
        <div class="medical-result-item full">
          <span class="medical-result-label">
            Medical Conditions
          </span>

          ${renderResultTags(medicalHistory)}
        </div>
      </div>
    </section>

    <section class="medical-result-section">
      <h3>Allergies</h3>

      <div class="medical-result-grid">
        <div class="medical-result-item full">
          <span class="medical-result-label">
            Allergies
          </span>

          ${renderResultTags(allergies)}
        </div>
      </div>
    </section>

    <div class="medical-result-consent">
      <strong>Consent:</strong>
      The patient confirmed that the
      information provided was accurate
      and agreed to the DentaNueva consent.
    </div>
  `;
}

function renderResultTags(values) {
  const cleanValues = values.filter((value) => value && String(value).trim());

  if (!cleanValues.length) {
    return `
      <div class="medical-result-value empty">
        None reported
      </div>
    `;
  }

  return `
    <div class="medical-result-list">
      ${cleanValues
        .map(
          (value) => `
            <span class="medical-result-tag">
              ${escapeHTML(value)}
            </span>
          `,
        )
        .join("")}
    </div>
  `;
}

$("closeMedicalResultModal")?.addEventListener("click", closeMedicalResult);

$("closeMedicalResultBtn")?.addEventListener("click", closeMedicalResult);

$("medicalResultModalBackdrop")?.addEventListener("click", (event) => {
  if (event.target === $("medicalResultModalBackdrop")) {
    closeMedicalResult();
  }
});

$("editMedicalResultBtn")?.addEventListener("click", () => {
  const patientId = $("editMedicalResultBtn").dataset.patientId;

  const mode = $("editMedicalResultBtn").dataset.mode;

  const patient = findPatient(patientId);

  if (!patient) {
    return;
  }

  closeMedicalResult();

  if (mode === "fill" || mode === "edit") {
    openMedicalForm(patient, 1);
  }
});

function closeMedicalResult() {
  $("medicalResultModalBackdrop")?.classList.remove("open");

  $("medicalResultModalBackdrop")?.setAttribute("aria-hidden", "true");
}

function deletePatient(patientId) {
  const patient = findPatient(patientId);

  if (!patient) {
    return;
  }

  const name = getFullName(patient) || "this patient";

  const confirmed = window.confirm(
    `Delete ${name}?\n\nThis will remove the patient record and saved medical form from this browser.`,
  );

  if (!confirmed) {
    return;
  }

  patients = patients.filter(
    (item) =>
      String(item.id || item.patientId) !==
      String(patient.id || patient.patientId),
  );

  savePatients();
  renderPatients();
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if ($("medicalResultModalBackdrop")?.classList.contains("open")) {
    closeMedicalResult();
    return;
  }

  if ($("medicalFormModalBackdrop")?.classList.contains("open")) {
    closeMedicalForm();
    return;
  }

  if ($("patientDetailsModalBackdrop")?.classList.contains("open")) {
    closePatientDetailsModal();
    return;
  }

  if ($("patientModalBackdrop")?.classList.contains("open")) {
    closePatientModal();
    return;
  }

  closeActionMenu();
});
