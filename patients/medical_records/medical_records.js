"use strict";

const PATIENT_STORAGE_KEY = "dentanueva_patients";
const CURRENT_USER_KEY = "currentUser";

let currentUser = null;
let currentPatient = null;

let currentStep = 1;
const TOTAL_STEPS = 5;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  initializeMedicalRecords();
});

function initializeMedicalRecords() {
  currentUser = getCurrentUser();
  loadOrCreatePatientRecord();
  bindEvents();
  populatePatientProfile();
  updatePageState();
}

function getCurrentUser() {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.error("Unable to read currentUser:", error);
    return null;
  }
}

function getPatients() {
  try {
    const stored = localStorage.getItem(PATIENT_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read patient records:", error);
    return [];
  }
}

function savePatients(patients) {
  localStorage.setItem(PATIENT_STORAGE_KEY, JSON.stringify(patients));
}

function loadOrCreatePatientRecord() {
  const patients = getPatients();

  if (!currentUser) {
    currentPatient = null;
    return;
  }

  const currentUserPatientId = String(currentUser.patientId || "").trim();

  const userId = String(
    currentUser.id || currentUser.userId || currentUser.user_id || "",
  ).trim();

  const userEmail = String(currentUser.email || currentUser.emailAddress || "")
    .trim()
    .toLowerCase();

  let existingPatient = null;

  if (currentUserPatientId) {
    existingPatient = patients.find((patient) => {
      const patientId = String(patient.patientId || patient.id || "").trim();

      return patientId === currentUserPatientId;
    });
  }

  if (!existingPatient && userId) {
    existingPatient = patients.find((patient) => {
      const patientUserId = String(
        patient.userId || patient.userIdRef || patient.user_id || "",
      ).trim();

      return patientUserId && patientUserId === userId;
    });
  }

  if (!existingPatient && userEmail) {
    existingPatient = patients.find((patient) => {
      const patientEmail = String(patient.email || "")
        .trim()
        .toLowerCase();

      return patientEmail && patientEmail === userEmail;
    });
  }

  if (existingPatient) {
    currentPatient = normalizePatient(existingPatient);

    if (userId && !currentPatient.userId) {
      currentPatient.userId = userId;
    }

    const patientsIndex = patients.findIndex(
      (patient) =>
        String(patient.patientId || patient.id || "").trim() ===
        String(currentPatient.patientId || currentPatient.id || "").trim(),
    );

    if (patientsIndex !== -1) {
      patients[patientsIndex] = {
        ...patients[patientsIndex],
        ...currentPatient,
        userId:
          currentPatient.userId ||
          patients[patientsIndex].userId ||
          userId ||
          "",
      };

      savePatients(patients);
    }

    const patientId = currentPatient.patientId || currentPatient.id;

    if (patientId && currentUser.patientId !== patientId) {
      currentUser.patientId = patientId;
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    }

    return;
  }

  const firstName = currentUser.firstName || currentUser.firstname || "";

  const lastName = currentUser.lastName || currentUser.lastname || "";

  const fullName = String(
    currentUser.fullName ||
      currentUser.full_name ||
      currentUser.name ||
      `${firstName} ${lastName}`,
  ).trim();

  const patientId = currentUserPatientId || generatePatientId();

  const now = new Date().toISOString();

  const newPatient = {
    id: patientId,
    patientId: patientId,
    userId: currentUser.id || currentUser.userId || currentUser.user_id || "",
    firstName: firstName,
    lastName: lastName,
    fullName: fullName,
    dateOfBirth: currentUser.dateOfBirth || "",
    gender: currentUser.gender || currentUser.patientGender || "",
    patientGender: currentUser.gender || currentUser.patientGender || "",
    phone:
      currentUser.phone ||
      currentUser.contactNumber ||
      currentUser.contact ||
      "",
    email: currentUser.email || currentUser.emailAddress || "",
    address: currentUser.address || "",
    emergencyName: currentUser.emergencyName || "",
    emergencyContact: currentUser.emergencyContact || "",
    appointments: [],
    medicalForm: null,
    createdAt: now,
    updatedAt: now,
  };

  patients.push(newPatient);

  savePatients(patients);

  currentPatient = newPatient;

  currentUser.patientId = patientId;

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
}

function normalizePatient(patient) {
  const normalized = {
    ...patient,
  };

  if (!normalized.patientId) {
    normalized.patientId = normalized.id || generatePatientId();
  }

  if (!normalized.id) {
    normalized.id = normalized.patientId;
  }

  if (!normalized.userId && currentUser) {
    normalized.userId =
      currentUser.id || currentUser.userId || currentUser.user_id || "";
  }

  if (!normalized.firstName && currentUser) {
    normalized.firstName = currentUser.firstName || currentUser.firstname || "";
  }

  if (!normalized.lastName && currentUser) {
    normalized.lastName = currentUser.lastName || currentUser.lastname || "";
  }

  if (!normalized.fullName && currentUser) {
    normalized.fullName =
      currentUser.fullName || currentUser.full_name || currentUser.name || "";
  }

  if (!normalized.email && currentUser) {
    normalized.email = currentUser.email || currentUser.emailAddress || "";
  }

  if (!normalized.phone && currentUser) {
    normalized.phone =
      currentUser.phone ||
      currentUser.contactNumber ||
      currentUser.contact ||
      "";
  }

  if (!normalized.dateOfBirth && currentUser) {
    normalized.dateOfBirth = currentUser.dateOfBirth || "";
  }

  if (!normalized.gender && currentUser) {
    normalized.gender = currentUser.gender || currentUser.patientGender || "";
  }

  if (!normalized.patientGender) {
    normalized.patientGender = normalized.gender || "";
  }

  if (!normalized.address && currentUser) {
    normalized.address = currentUser.address || "";
  }

  if (!normalized.emergencyName && currentUser) {
    normalized.emergencyName = currentUser.emergencyName || "";
  }

  if (!normalized.emergencyContact && currentUser) {
    normalized.emergencyContact = currentUser.emergencyContact || "";
  }

  if (!Array.isArray(normalized.appointments)) {
    normalized.appointments = [];
  }

  if (!Object.prototype.hasOwnProperty.call(normalized, "medicalForm")) {
    normalized.medicalForm = null;
  }

  return normalized;
}

function generatePatientId() {
  const patients = getPatients();

  let highestNumber = 0;

  patients.forEach((patient) => {
    const value = String(patient.patientId || patient.id || "");

    const match = value.match(/PN-(\d+)/i);

    if (match) {
      highestNumber = Math.max(highestNumber, Number(match[1]));
    }
  });

  const nextNumber = highestNumber + 1;

  return `PN-${String(nextNumber).padStart(4, "0")}`;
}

function getPatientFullName(patient) {
  if (!patient) {
    return "Patient";
  }

  const firstName = patient.firstName || patient.firstname || "";

  const lastName = patient.lastName || patient.lastname || "";

  const combined = `${firstName} ${lastName}`.trim();

  return (
    combined ||
    patient.fullName ||
    patient.name ||
    patient.patientName ||
    "Patient"
  );
}

function getInitials(name) {
  const cleanName = String(name || "").trim();

  if (!cleanName) {
    return "PT";
  }

  const parts = cleanName.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function bindEvents() {
  $("startRecordBtn")?.addEventListener("click", openMedicalModal);

  $("viewPatientInformationBtn")?.addEventListener(
    "click",
    openPatientInformationModal,
  );

  $("closePatientInformation")?.addEventListener(
    "click",
    closePatientInformationModal,
  );

  $("closeMedicalModal")?.addEventListener("click", closeMedicalModal);

  $("cancelMedicalBtn")?.addEventListener("click", closeMedicalModal);

  $("nextMedicalBtn")?.addEventListener("click", nextStep);

  $("backMedicalBtn")?.addEventListener("click", previousStep);

  $("medicalRecordForm")?.addEventListener("submit", saveMedicalRecord);

  $("successCloseBtn")?.addEventListener("click", closeSuccessModal);

  $("medicalModalBackdrop")?.addEventListener("mousedown", (event) => {
    if (event.target === $("medicalModalBackdrop")) {
      closeMedicalModal();
    }
  });

  $("patientInformationModalBackdrop")?.addEventListener(
    "mousedown",
    (event) => {
      if (event.target === $("patientInformationModalBackdrop")) {
        closePatientInformationModal();
      }
    },
  );

  $("successModalBackdrop")?.addEventListener("mousedown", (event) => {
    if (event.target === $("successModalBackdrop")) {
      closeSuccessModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    closeMedicalModal();
    closePatientInformationModal();
    closeSuccessModal();
  });

  document.querySelectorAll('input[name="allergies"]').forEach((checkbox) => {
    checkbox.addEventListener("change", handleAllergySelection);
  });

  $("dentalConcernOtherCheck")?.addEventListener(
    "change",
    updateOtherFieldState,
  );

  $("medicalOtherCheck")?.addEventListener("change", updateOtherFieldState);

  $("allergyOtherCheck")?.addEventListener("change", updateOtherFieldState);

  $("phone")?.addEventListener("input", sanitizePhone);

  $("emergencyContact")?.addEventListener("input", sanitizePhone);
}

function populatePatientProfile() {
  if (!currentPatient) {
    $("profileName").textContent = "Patient";
    $("profilePatientId").textContent = "Patient ID: —";
    $("profileEmail").textContent = "—";
    $("profilePhone").textContent = "—";
    $("profileBirthDate").textContent = "—";
    $("profileGender").textContent = "—";

    if ($("profileAvatar")) {
      $("profileAvatar").textContent = "PT";
    }

    return;
  }

  const fullName = getPatientFullName(currentPatient);

  const patientId = currentPatient.patientId || currentPatient.id || "—";

  const email =
    currentPatient.email ||
    currentUser?.email ||
    currentUser?.emailAddress ||
    "—";

  const phone =
    currentPatient.phone ||
    currentUser?.phone ||
    currentUser?.contactNumber ||
    currentUser?.contact ||
    "—";

  const dateOfBirth =
    currentPatient.dateOfBirth || currentUser?.dateOfBirth || "";

  const gender =
    currentPatient.gender ||
    currentPatient.patientGender ||
    currentUser?.gender ||
    currentUser?.patientGender ||
    "—";

  $("profileName").textContent = fullName;

  $("profilePatientId").textContent = `Patient ID: ${patientId}`;

  $("profileEmail").textContent = email;

  $("profilePhone").textContent = phone;

  $("profileBirthDate").textContent = formatDate(dateOfBirth);

  $("profileGender").textContent = gender;

  if ($("profileAvatar")) {
    $("profileAvatar").textContent = getInitials(fullName);
  }
}

function updatePageState() {
  const hasProfile = currentPatient && isProfileComplete(currentPatient);
  const medical = currentPatient?.medicalForm || null;
  const hasMedical = medical?.completed === true;

  const percentage = hasMedical ? 100 : 0;

  if ($("overallProgressFill")) {
    $("overallProgressFill").style.width = `${percentage}%`;
  }

  if ($("progressPercentage")) {
    $("progressPercentage").textContent = hasMedical
      ? "Completed"
      : "Incomplete";

    $("progressPercentage").classList.toggle("status-completed", hasMedical);

    $("progressPercentage").classList.toggle("status-incomplete", !hasMedical);
  }

  setChecklistState("checkProfile", hasMedical && hasProfile);

  setChecklistState(
    "checkDentalConcern",
    hasMedical && hasDentalConcern(medical),
  );

  setChecklistState(
    "checkDentalHistory",
    hasMedical && hasDentalHistory(medical),
  );

  setChecklistState(
    "checkMedicalHistory",
    hasMedical && hasMedicalHistory(medical),
  );

  setChecklistState("checkConsent", hasMedical && medical.consent === true);

  if (hasMedical) {
    if ($("recordDescription")) {
      $("recordDescription").textContent =
        "Your medical record has been submitted and is available for clinic review.";
    }

    if ($("startRecordBtnText")) {
      $("startRecordBtnText").textContent = "Edit Medical Record";
    }
  } else {
    if ($("recordDescription")) {
      $("recordDescription").textContent =
        "Your medical record has not been completed yet.";
    }

    if ($("startRecordBtnText")) {
      $("startRecordBtnText").textContent = "Complete Medical Record";
    }
  }
}

function isProfileComplete(patient) {
  if (!patient) {
    return false;
  }

  const requiredFields = [
    patient.firstName,
    patient.lastName,
    patient.dateOfBirth,
    patient.gender || patient.patientGender,
    patient.phone,
    patient.email,
    patient.address,
    patient.emergencyName,
    patient.emergencyContact,
  ];

  return requiredFields.every((value) => String(value || "").trim() !== "");
}

function setChecklistState(elementId, complete) {
  const element = $(elementId);

  if (!element) {
    return;
  }

  element.classList.toggle("complete", Boolean(complete));
}

function getCompletedSections() {
  if (!currentPatient) {
    return 0;
  }

  const medical = currentPatient.medicalForm;

  let completed = 0;

  if (isProfileComplete(currentPatient)) {
    completed++;
  }

  if (medical && hasDentalConcern(medical)) {
    completed++;
  }

  if (medical && hasDentalHistory(medical)) {
    completed++;
  }

  if (medical && hasMedicalHistory(medical)) {
    completed++;
  }

  if (medical && medical.consent === true) {
    completed++;
  }

  return completed;
}

function hasDentalConcern(medical) {
  if (!medical) {
    return false;
  }

  const concerns = Array.isArray(medical.dentalConcern)
    ? medical.dentalConcern
    : [];

  return (
    concerns.length > 0 ||
    Boolean(String(medical.dentalConcernOther || "").trim())
  );
}

function hasDentalHistory(medical) {
  if (!medical) {
    return false;
  }

  return (
    Boolean(String(medical.medLastVisit || "").trim()) ||
    Boolean(String(medical.medLastTreatment || "").trim()) ||
    Boolean(String(medical.currentMedications || "").trim()) ||
    Boolean(String(medical.currentMedicationsList || "").trim())
  );
}

function hasMedicalHistory(medical) {
  if (!medical) {
    return false;
  }

  const conditions = Array.isArray(medical.medicalHistory)
    ? medical.medicalHistory
    : [];

  const allergies = Array.isArray(medical.allergies) ? medical.allergies : [];

  return (
    conditions.length > 0 ||
    allergies.length > 0 ||
    Boolean(String(medical.medicalOther || "").trim()) ||
    Boolean(String(medical.allergyOther || "").trim())
  );
}

function openPatientInformationModal() {
  if (!currentPatient) {
    alert("Your patient profile could not be loaded. Please log in again.");
    return;
  }

  populatePatientInformation();

  $("patientInformationModalBackdrop")?.classList.add("open");

  $("patientInformationModalBackdrop")?.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

function closePatientInformationModal() {
  $("patientInformationModalBackdrop")?.classList.remove("open");

  $("patientInformationModalBackdrop")?.setAttribute("aria-hidden", "true");

  if (
    !$("medicalModalBackdrop")?.classList.contains("open") &&
    !$("successModalBackdrop")?.classList.contains("open")
  ) {
    document.body.style.overflow = "";
  }
}

function populatePatientInformation() {
  if (!currentPatient) {
    return;
  }

  const fullName = getPatientFullName(currentPatient);

  const patientId = currentPatient.patientId || currentPatient.id || "—";

  const dateOfBirth =
    currentPatient.dateOfBirth || currentUser?.dateOfBirth || "";

  const gender =
    currentPatient.gender ||
    currentPatient.patientGender ||
    currentUser?.gender ||
    currentUser?.patientGender ||
    "—";

  const phone =
    currentPatient.phone ||
    currentUser?.phone ||
    currentUser?.contactNumber ||
    currentUser?.contact ||
    "—";

  const email =
    currentPatient.email ||
    currentUser?.email ||
    currentUser?.emailAddress ||
    "—";

  const emergencyName =
    currentPatient.emergencyName || currentUser?.emergencyName || "—";

  const emergencyContact =
    currentPatient.emergencyContact || currentUser?.emergencyContact || "—";

  const address = currentPatient.address || currentUser?.address || "—";

  $("patientInformationModalTitle").textContent = fullName;

  $("patientInformationName").textContent = fullName;

  $("patientInformationPatientId").textContent = patientId;

  $("patientInformationBirthDate").textContent = formatDate(dateOfBirth);

  $("patientInformationAge").textContent = getAge(dateOfBirth);

  $("patientInformationGender").textContent = gender;

  $("patientInformationPhone").textContent = phone;

  $("patientInformationEmail").textContent = email;

  $("patientInformationEmergencyName").textContent = emergencyName;

  $("patientInformationEmergencyContact").textContent = emergencyContact;

  $("patientInformationAddress").textContent = address;

  if ($("patientInformationAvatar")) {
    $("patientInformationAvatar").textContent = getInitials(fullName);
  }
}

function getAge(dateValue) {
  if (!dateValue) {
    return "—";
  }

  const birthDate = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(birthDate.getTime())) {
    return "—";
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

  if (age < 0) {
    return "—";
  }

  return `${age} years`;
}

function openMedicalModal() {
  if (!currentPatient) {
    alert("Your patient profile could not be loaded. Please log in again.");
    return;
  }

  currentStep = 1;

  loadExistingPatientData();
  loadExistingMedicalData();
  updateOtherFieldState();
  updateModalStep();

  $("medicalModalBackdrop").classList.add("open");

  $("medicalModalBackdrop").setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

function closeMedicalModal() {
  $("medicalModalBackdrop")?.classList.remove("open");

  $("medicalModalBackdrop")?.setAttribute("aria-hidden", "true");

  if (
    !$("patientInformationModalBackdrop")?.classList.contains("open") &&
    !$("successModalBackdrop")?.classList.contains("open")
  ) {
    document.body.style.overflow = "";
  }
}

function loadExistingPatientData() {
  if (!currentPatient) {
    return;
  }

  $("recordPatientId").value =
    currentPatient.patientId || currentPatient.id || "";

  $("firstName").value = currentPatient.firstName || "";

  $("lastName").value = currentPatient.lastName || "";

  $("dateOfBirth").value = currentPatient.dateOfBirth || "";

  $("gender").value =
    currentPatient.gender || currentPatient.patientGender || "";

  $("phone").value = currentPatient.phone || "";

  $("email").value = currentPatient.email || currentUser?.email || "";

  $("address").value = currentPatient.address || "";

  $("emergencyName").value = currentPatient.emergencyName || "";

  $("emergencyContact").value = currentPatient.emergencyContact || "";
}

function loadExistingMedicalData() {
  clearMedicalFields();

  const medical = currentPatient?.medicalForm;

  if (!medical) {
    return;
  }

  const concerns = Array.isArray(medical.dentalConcern)
    ? medical.dentalConcern
    : [];

  document
    .querySelectorAll('input[name="dentalConcern"]')
    .forEach((checkbox) => {
      checkbox.checked = concerns.includes(checkbox.value);
    });

  $("dentalConcernOther").value = medical.dentalConcernOther || "";

  $("dentalConcernOtherCheck").checked = Boolean(medical.dentalConcernOther);

  const negativeExperience = medical.negativeExperience || "No";

  const negativeRadio = document.querySelector(
    `input[name="negativeExperience"][value="${escapeSelectorValue(
      negativeExperience,
    )}"]`,
  );

  if (negativeRadio) {
    negativeRadio.checked = true;
  }

  $("negativeExperienceNote").value = medical.negativeExperienceNote || "";

  $("lastDentalVisit").value = medical.medLastVisit || "";

  $("lastDentalTreatment").value = medical.medLastTreatment || "";

  const currentMedications = medical.currentMedications || "No";

  const medicationRadio = document.querySelector(
    `input[name="currentMedications"][value="${escapeSelectorValue(
      currentMedications,
    )}"]`,
  );

  if (medicationRadio) {
    medicationRadio.checked = true;
  }

  $("medicationList").value = medical.currentMedicationsList || "";

  const medicalHistory = Array.isArray(medical.medicalHistory)
    ? medical.medicalHistory
    : [];

  document
    .querySelectorAll('input[name="medicalHistory"]')
    .forEach((checkbox) => {
      checkbox.checked = medicalHistory.includes(checkbox.value);
    });

  $("medicalOther").value = medical.medicalOther || "";

  $("medicalOtherCheck").checked = Boolean(medical.medicalOther);

  const allergies = Array.isArray(medical.allergies) ? medical.allergies : [];

  document.querySelectorAll('input[name="allergies"]').forEach((checkbox) => {
    checkbox.checked = allergies.includes(checkbox.value);
  });

  $("allergyOther").value = medical.allergyOther || "";

  $("allergyOtherCheck").checked = Boolean(medical.allergyOther);

  $("consentCheckbox").checked = medical.consent === true;
}

function clearMedicalFields() {
  document
    .querySelectorAll('input[name="dentalConcern"]')
    .forEach((checkbox) => (checkbox.checked = false));

  document
    .querySelectorAll('input[name="medicalHistory"]')
    .forEach((checkbox) => (checkbox.checked = false));

  document
    .querySelectorAll('input[name="allergies"]')
    .forEach((checkbox) => (checkbox.checked = false));

  $("dentalConcernOther").value = "";
  $("dentalConcernOtherCheck").checked = false;

  $("negativeExperienceNote").value = "";

  $("lastDentalVisit").value = "";

  $("lastDentalTreatment").value = "";

  $("medicationList").value = "";

  $("medicalOther").value = "";
  $("medicalOtherCheck").checked = false;

  $("allergyOther").value = "";
  $("allergyOtherCheck").checked = false;

  $("consentCheckbox").checked = false;

  const noExperience = document.querySelector(
    'input[name="negativeExperience"][value="No"]',
  );

  if (noExperience) {
    noExperience.checked = true;
  }

  const noMedication = document.querySelector(
    'input[name="currentMedications"][value="No"]',
  );

  if (noMedication) {
    noMedication.checked = true;
  }
}

function nextStep() {
  if (!validateCurrentStep()) {
    return;
  }

  if (currentStep >= TOTAL_STEPS) {
    return;
  }

  currentStep++;

  updateModalStep();
}

function previousStep() {
  if (currentStep <= 1) {
    return;
  }

  currentStep--;

  updateModalStep();
}

function updateModalStep() {
  document.querySelectorAll(".medical-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step);

    step.classList.toggle("active", stepNumber === currentStep);
  });

  const percentage = (currentStep / TOTAL_STEPS) * 100;

  $("medicalProgressFill").style.width = `${percentage}%`;

  document.querySelectorAll(".medical-progress-step").forEach((step) => {
    const stepNumber = Number(step.dataset.step);

    step.classList.toggle("active", stepNumber === currentStep);

    step.classList.toggle("completed", stepNumber < currentStep);
  });

  $("backMedicalBtn").hidden = currentStep === 1;

  $("nextMedicalBtn").hidden = currentStep === TOTAL_STEPS;

  $("saveMedicalBtn").hidden = currentStep !== TOTAL_STEPS;

  if (currentStep === TOTAL_STEPS) {
    buildReview();
  }

  $("medicalStepViewport").scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function validateCurrentStep() {
  if (currentStep === 1) {
    const fields = [
      $("firstName"),
      $("lastName"),
      $("dateOfBirth"),
      $("gender"),
      $("phone"),
      $("email"),
      $("address"),
      $("emergencyName"),
      $("emergencyContact"),
    ];

    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }

    if (!isValidPhilippinePhone($("phone").value)) {
      $("phone").setCustomValidity(
        "Please enter a valid Philippine phone number.",
      );

      $("phone").reportValidity();

      $("phone").setCustomValidity("");

      return false;
    }

    if (!isValidPhilippinePhone($("emergencyContact").value)) {
      $("emergencyContact").setCustomValidity(
        "Please enter a valid Philippine emergency contact number.",
      );

      $("emergencyContact").reportValidity();

      $("emergencyContact").setCustomValidity("");

      return false;
    }

    return true;
  }

  if (currentStep === 2) {
    const concerns = getCheckedValues("dentalConcern");

    const other = $("dentalConcernOther").value.trim();

    if (concerns.length === 0 && !other) {
      alert("Please select at least one dental concern.");

      return false;
    }

    return true;
  }

  if (currentStep === 3) {
    return true;
  }

  if (currentStep === 4) {
    const noKnownAllergies = document.querySelector(
      'input[name="allergies"][value="No Known Allergies"]',
    );

    const otherAllergy = $("allergyOther").value.trim();

    const allergyValues = getCheckedValues("allergies");

    if (
      noKnownAllergies?.checked &&
      (allergyValues.length > 1 || otherAllergy)
    ) {
      alert(
        "No Known Allergies cannot be selected together with another allergy.",
      );

      return false;
    }

    return true;
  }

  if (currentStep === 5) {
    if (!$("consentCheckbox").checked) {
      alert("Please confirm the consent before saving your medical record.");

      $("consentCheckbox").focus();

      return false;
    }

    return true;
  }

  return true;
}

function saveMedicalRecord(event) {
  event.preventDefault();

  if (!validateCurrentStep()) {
    return;
  }

  if (!currentPatient) {
    alert("Patient record could not be found. Please log in again.");

    return;
  }

  const dentalConcern = getCheckedValues("dentalConcern");

  const medicalHistory = getCheckedValues("medicalHistory");

  const allergies = getCheckedValues("allergies");

  const dentalConcernOther = $("dentalConcernOther").value.trim();

  const medicalOther = $("medicalOther").value.trim();

  const allergyOther = $("allergyOther").value.trim();

  const cleanedAllergies = normalizeAllergies(allergies, allergyOther);

  const negativeExperience = getRadioValue("negativeExperience") || "No";

  const currentMedications = getRadioValue("currentMedications") || "No";

  const now = new Date().toISOString();

  currentPatient.firstName = $("firstName").value.trim();

  currentPatient.lastName = $("lastName").value.trim();

  currentPatient.fullName =
    `${currentPatient.firstName} ${currentPatient.lastName}`.trim();

  currentPatient.dateOfBirth = $("dateOfBirth").value;

  currentPatient.gender = $("gender").value;

  currentPatient.patientGender = $("gender").value;

  currentPatient.phone = $("phone").value.trim();

  currentPatient.email = $("email").value.trim();

  currentPatient.address = $("address").value.trim();

  currentPatient.emergencyName = $("emergencyName").value.trim();

  currentPatient.emergencyContact = $("emergencyContact").value.trim();

  currentPatient.medicalForm = {
    dentalConcern,
    dentalConcernOther,
    negativeExperience,
    negativeExperienceNote: $("negativeExperienceNote").value.trim(),
    medLastVisit: $("lastDentalVisit").value,
    medLastTreatment: $("lastDentalTreatment").value.trim(),
    currentMedications,
    currentMedicationsList: $("medicationList").value.trim(),
    medicalHistory,
    medicalOther,
    allergies: cleanedAllergies,
    allergyOther,
    consent: $("consentCheckbox").checked,
    completed: true,
    submittedBy: "patient",
    createdAt: currentPatient.medicalForm?.createdAt || now,
    updatedAt: now,
  };

  currentPatient.updatedAt = now;

  const patients = getPatients();

  const currentId = String(
    currentPatient.patientId || currentPatient.id || "",
  ).trim();

  const index = patients.findIndex(
    (patient) =>
      String(patient.patientId || patient.id || "").trim() === currentId,
  );

  if (index !== -1) {
    const existingPatient = patients[index];

    patients[index] = {
      ...existingPatient,
      ...currentPatient,
      patientId: currentPatient.patientId || existingPatient.patientId,
      id: currentPatient.id || existingPatient.id,
      userId:
        currentPatient.userId ||
        existingPatient.userId ||
        currentUser?.id ||
        currentUser?.userId ||
        currentUser?.user_id ||
        "",
      appointments: Array.isArray(currentPatient.appointments)
        ? currentPatient.appointments
        : Array.isArray(existingPatient.appointments)
          ? existingPatient.appointments
          : [],
      medicalForm: currentPatient.medicalForm,
      updatedAt: now,
    };

    currentPatient = normalizePatient(patients[index]);

    patients[index] = currentPatient;
  } else {
    patients.push(currentPatient);
  }

  savePatients(patients);

  if (currentUser) {
    currentUser.patientId = currentPatient.patientId || currentPatient.id;

    currentUser.firstName = currentPatient.firstName;

    currentUser.lastName = currentPatient.lastName;

    currentUser.fullName = currentPatient.fullName;

    currentUser.email = currentPatient.email;

    currentUser.phone = currentPatient.phone;

    currentUser.dateOfBirth = currentPatient.dateOfBirth;

    currentUser.gender = currentPatient.gender;

    currentUser.address = currentPatient.address;

    currentUser.emergencyName = currentPatient.emergencyName;

    currentUser.emergencyContact = currentPatient.emergencyContact;

    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
  }

  closeMedicalModal();

  populatePatientProfile();

  updatePageState();

  openSuccessModal();
}

function getCheckedValues(fieldName) {
  return Array.from(
    document.querySelectorAll(`input[name="${fieldName}"]:checked`),
  ).map((input) => input.value);
}

function getRadioValue(fieldName) {
  const selected = document.querySelector(`input[name="${fieldName}"]:checked`);

  return selected ? selected.value : "";
}

function normalizeAllergies(allergies, otherAllergy) {
  let values = [...allergies];

  if (
    values.includes("No Known Allergies") &&
    (values.length > 1 || otherAllergy)
  ) {
    values = values.filter((value) => value !== "No Known Allergies");
  }

  return values;
}

function handleAllergySelection(event) {
  const selected = event.target;

  if (selected.value === "No Known Allergies" && selected.checked) {
    document.querySelectorAll('input[name="allergies"]').forEach((checkbox) => {
      if (checkbox !== selected) {
        checkbox.checked = false;
      }
    });

    $("allergyOther").value = "";

    $("allergyOtherCheck").checked = false;

    updateOtherFieldState();
  } else if (selected.checked) {
    const noKnown = document.querySelector(
      'input[name="allergies"][value="No Known Allergies"]',
    );

    if (noKnown) {
      noKnown.checked = false;
    }
  }
}

function updateOtherFieldState() {
  const otherFields = [
    {
      check: $("dentalConcernOtherCheck"),
      input: $("dentalConcernOther"),
    },
    {
      check: $("medicalOtherCheck"),
      input: $("medicalOther"),
    },
    {
      check: $("allergyOtherCheck"),
      input: $("allergyOther"),
    },
  ];

  otherFields.forEach(({ check, input }) => {
    if (!check || !input) {
      return;
    }

    input.disabled = !check.checked;

    if (!check.checked) {
      input.value = "";
    }
  });
}

function sanitizePhone(event) {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 11);
}

function isValidPhilippinePhone(value) {
  return /^09\d{9}$/.test(String(value || "").trim());
}

function buildReview() {
  const container = $("medicalReview");

  if (!container) {
    return;
  }

  const concerns = getCheckedValues("dentalConcern");

  const dentalConcernOther = $("dentalConcernOther").value.trim();

  const medicalHistory = getCheckedValues("medicalHistory");

  const medicalOther = $("medicalOther").value.trim();

  const allergies = normalizeAllergies(
    getCheckedValues("allergies"),
    $("allergyOther").value.trim(),
  );

  const allergyOther = $("allergyOther").value.trim();

  const negativeExperience = getRadioValue("negativeExperience") || "No";

  const currentMedications = getRadioValue("currentMedications") || "No";

  const concernValues = [...concerns];

  if (dentalConcernOther) {
    concernValues.push(dentalConcernOther);
  }

  const medicalValues = [...medicalHistory];

  if (medicalOther) {
    medicalValues.push(medicalOther);
  }

  const allergyValues = [...allergies];

  if (allergyOther && !allergyValues.includes(allergyOther)) {
    allergyValues.push(allergyOther);
  }

  container.innerHTML = `
    <div class="review-card">
      <h4>Dental Concern</h4>
      ${reviewRow(
        "Reason for Visit",
        concernValues.length ? concernValues.join(", ") : "None provided",
      )}
      ${reviewRow("Negative Dental Experience", negativeExperience)}
      ${reviewRow("Explanation", $("negativeExperienceNote").value.trim())}
    </div>
    <div class="review-card">
      <h4>Dental History</h4>
      ${reviewRow("Last Dental Visit", formatDate($("lastDentalVisit").value))}
      ${reviewRow("Last Treatment", $("lastDentalTreatment").value.trim())}
      ${reviewRow("Current Medications", currentMedications)}
      ${reviewRow(
        "Medication / Supplement List",
        $("medicationList").value.trim(),
      )}
    </div>
    <div class="review-card">
      <h4>Medical History</h4>
      ${reviewRow(
        "Medical Conditions",
        medicalValues.length ? medicalValues.join(", ") : "None provided",
      )}
    </div>
    <div class="review-card">
      <h4>Allergies</h4>
      ${reviewRow(
        "Allergies",
        allergyValues.length ? allergyValues.join(", ") : "None provided",
      )}
    </div>
  `;
}

function reviewRow(label, value) {
  const cleanValue = String(value || "").trim();

  return `
    <div class="review-row">
      <span class="review-label">
        ${escapeHTML(label)}
      </span>
      <span class="review-value ${cleanValue ? "" : "empty"}">
        ${escapeHTML(cleanValue || "Not provided")}
      </span>
    </div>
  `;
}

function openSuccessModal() {
  $("successModalBackdrop")?.classList.add("open");

  $("successModalBackdrop")?.setAttribute("aria-hidden", "false");

  document.body.style.overflow = "hidden";
}

function closeSuccessModal() {
  $("successModalBackdrop")?.classList.remove("open");

  $("successModalBackdrop")?.setAttribute("aria-hidden", "true");

  if (
    !$("medicalModalBackdrop")?.classList.contains("open") &&
    !$("patientInformationModalBackdrop")?.classList.contains("open")
  ) {
    document.body.style.overflow = "";
  }
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "Not provided";
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Not provided";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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

function escapeSelectorValue(value) {
  return String(value || "").replace(/"/g, '\\"');
}

window.addEventListener("storage", (event) => {
  if (event.key === PATIENT_STORAGE_KEY) {
    loadOrCreatePatientRecord();
    populatePatientProfile();
    updatePageState();
  }

  if (event.key === CURRENT_USER_KEY) {
    currentUser = getCurrentUser();

    loadOrCreatePatientRecord();
    populatePatientProfile();
    updatePageState();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    currentUser = getCurrentUser();

    loadOrCreatePatientRecord();
    populatePatientProfile();
    updatePageState();
  }
});

setInterval(() => {
  if (document.visibilityState !== "visible") {
    return;
  }

  currentUser = getCurrentUser();

  loadOrCreatePatientRecord();
  populatePatientProfile();
  updatePageState();
}, 1500);
