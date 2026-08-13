const PATIENTS_STORAGE_KEY = "patients";

const DEFAULT_PATIENTS = [
  {
    id: "P009",
    firstName: "Rico",
    lastName: "Bautista",
    phone: "09406581939",
    email: "",
    birthDate: "",
    gender: "",
    status: "active",
    createdAt: "2026-08-01",
    lastVisit: "",
    nextAppointment: "",
  },

  {
    id: "P004",
    firstName: "Bea",
    lastName: "Ramos",
    phone: "09207496050",
    email: "",
    birthDate: "",
    gender: "",
    status: "active",
    createdAt: "2026-07-28",
    lastVisit: "",
    nextAppointment: "",
  },

  {
    id: "P002",
    firstName: "John",
    lastName: "Reyes",
    phone: "09109730941",
    email: "",
    birthDate: "",
    gender: "",
    status: "active",
    createdAt: "2026-07-25",
    lastVisit: "",
    nextAppointment: "",
  },

  {
    id: "P007",
    firstName: "Maria",
    lastName: "Santos",
    phone: "09123456789",
    email: "",
    birthDate: "",
    gender: "Female",
    status: "active",
    createdAt: "2026-07-20",
    lastVisit: "",
    nextAppointment: "",
  },

  {
    id: "P001",
    firstName: "James",
    lastName: "Cruz",
    phone: "09187654321",
    email: "",
    birthDate: "",
    gender: "Male",
    status: "active",
    createdAt: "2026-07-15",
    lastVisit: "",
    nextAppointment: "",
  },
];

let patients = [];
let currentPatientId = null;
let currentActionPatientId = null;

document.addEventListener("DOMContentLoaded", () => {
  initializePatients();
  initializePatientEvents();
  renderPatients();
});

function initializePatients() {
  const storedPatients = localStorage.getItem(PATIENTS_STORAGE_KEY);

  if (storedPatients) {
    try {
      const parsed = JSON.parse(storedPatients);

      if (Array.isArray(parsed)) {
        patients = parsed.map(normalizePatient);
        return;
      }
    } catch (error) {
      console.error("Unable to read patient data:", error);
    }
  }

  patients = DEFAULT_PATIENTS.map(normalizePatient);

  savePatients();
}

function normalizePatient(patient) {
  return {
    id: patient.id || generatePatientId(),
    firstName: patient.firstName || "",
    lastName: patient.lastName || "",
    phone: patient.phone || "",
    email: patient.email || "",
    birthDate: patient.birthDate || "",
    gender: patient.gender || "",
    status: patient.status === "inactive" ? "inactive" : "active",
    createdAt: patient.createdAt || new Date().toISOString(),
    lastVisit: patient.lastVisit || "",
    nextAppointment: patient.nextAppointment || "",
  };
}

function savePatients() {
  localStorage.setItem(PATIENTS_STORAGE_KEY, JSON.stringify(patients));
}

function generatePatientId() {
  let highestNumber = 0;

  patients.forEach((patient) => {
    const number = parseInt(String(patient.id || "").replace(/\D/g, ""), 10);

    if (!Number.isNaN(number)) {
      highestNumber = Math.max(highestNumber, number);
    }
  });

  return `P${String(highestNumber + 1).padStart(3, "0")}`;
}

function initializePatientEvents() {
  const addButton = document.getElementById("addPatientBtn");
  const searchInput = document.getElementById("patientSearch");
  const statusFilter = document.getElementById("statusFilter");
  const sortPatients = document.getElementById("sortPatients");
  const closeModal = document.getElementById("closePatientModal");
  const cancelButton = document.getElementById("cancelPatientBtn");
  const form = document.getElementById("patientForm");

  if (addButton) {
    addButton.addEventListener("click", openAddPatientModal);
  }

  if (searchInput) {
    searchInput.addEventListener("input", renderPatients);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", renderPatients);
  }

  if (sortPatients) {
    sortPatients.addEventListener("change", renderPatients);
  }

  if (closeModal) {
    closeModal.addEventListener("click", closePatientModal);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closePatientModal);
  }

  if (form) {
    form.addEventListener("submit", handlePatientSubmit);
  }

  const backdrop = document.getElementById("patientModalBackdrop");

  if (backdrop) {
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closePatientModal();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closePatientModal();
      closeActionMenu();
    }
  });

  document.addEventListener("click", handleDocumentClick);
}

function handleDocumentClick(event) {
  const actionButton = event.target.closest(".patient-action-btn");

  const actionMenu = event.target.closest(".patient-action-menu");

  if (actionButton) {
    event.stopPropagation();

    currentActionPatientId = actionButton.dataset.patientId;

    openActionMenu(actionButton);

    return;
  }

  if (actionMenu) {
    return;
  }

  closeActionMenu();
}

function renderPatients() {
  const tableBody = document.getElementById("patientTableBody");

  const emptyState = document.getElementById("patientEmptyState");

  if (!tableBody) {
    return;
  }

  const searchValue = (document.getElementById("patientSearch")?.value || "")
    .trim()
    .toLowerCase();

  const statusValue = document.getElementById("statusFilter")?.value || "all";

  const sortValue = document.getElementById("sortPatients")?.value || "newest";

  let filteredPatients = [...patients];

  if (searchValue) {
    filteredPatients = filteredPatients.filter((patient) => {
      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();

      return (
        fullName.includes(searchValue) ||
        patient.id.toLowerCase().includes(searchValue) ||
        patient.phone.toLowerCase().includes(searchValue) ||
        patient.email.toLowerCase().includes(searchValue)
      );
    });
  }

  if (statusValue !== "all") {
    filteredPatients = filteredPatients.filter(
      (patient) => patient.status === statusValue,
    );
  }

  filteredPatients.sort((a, b) => {
    if (sortValue === "nameAsc") {
      return getFullName(a).localeCompare(getFullName(b));
    }

    if (sortValue === "nameDesc") {
      return getFullName(b).localeCompare(getFullName(a));
    }

    if (sortValue === "oldest") {
      return new Date(a.createdAt) - new Date(b.createdAt);
    }

    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  tableBody.innerHTML = "";

  if (filteredPatients.length === 0) {
    tableBody.style.display = "none";

    if (emptyState) {
      emptyState.hidden = false;
    }
  } else {
    tableBody.style.display = "";

    if (emptyState) {
      emptyState.hidden = true;
    }

    filteredPatients.forEach((patient) => {
      tableBody.appendChild(createPatientRow(patient));
    });
  }

  updateStatistics();
  updatePatientCount(filteredPatients.length);
}

function createPatientRow(patient) {
  const row = document.createElement("tr");

  const fullName = getFullName(patient);

  const initials = getInitials(patient.firstName, patient.lastName);

  const age = calculateAge(patient.birthDate);

  const gender = patient.gender || "Not specified";

  const lastVisit = patient.lastVisit || "No visit recorded";

  const nextAppointment = patient.nextAppointment || "No appointment";

  row.innerHTML = `
    <td>
      <div class="patient-person">
        <div class="patient-avatar">
          ${escapeHtml(initials)}
        </div>

        <div class="patient-person-info">
          <span class="patient-name">
            ${escapeHtml(fullName)}
          </span>

          <span class="patient-id">
            ${escapeHtml(patient.id)}
          </span>
        </div>
      </div>
    </td>

    <td>
      <div class="contact-info">
        <span class="contact-phone">
          ${escapeHtml(patient.phone || "No phone recorded")}
        </span>

        <span class="contact-email">
          ${escapeHtml(patient.email || "No email recorded")}
        </span>
      </div>
    </td>

    <td>
      <div class="age-info">
        <span class="age-main">
          ${escapeHtml(age)}
        </span>

        <span class="age-sub">
          ${escapeHtml(gender)}
        </span>
      </div>
    </td>

    <td>
      <span class="visit-text">
        ${escapeHtml(lastVisit)}
      </span>
    </td>

    <td>
      <span class="appointment-text">
        ${escapeHtml(nextAppointment)}
      </span>
    </td>

    <td>
      ${createStatusBadge(patient.status)}
    </td>

    <td class="action-cell">
      <button
        type="button"
        class="patient-action-btn"
        data-patient-id="${escapeHtml(patient.id)}"
        aria-label="Patient actions"
      >
        <i class="fa-solid fa-ellipsis"></i>
      </button>
    </td>
  `;

  return row;
}

function createStatusBadge(status) {
  const isActive = status === "active";

  return `
    <span
      class="status-badge ${isActive ? "active" : "inactive"}"
    >
      <span class="status-dot"></span>

      ${isActive ? "Active" : "Inactive"}
    </span>
  `;
}

function updateStatistics() {
  const total = patients.length;

  const active = patients.filter(
    (patient) => patient.status === "active",
  ).length;

  const inactive = patients.filter(
    (patient) => patient.status === "inactive",
  ).length;

  const currentDate = new Date();

  const currentMonth = currentDate.getMonth();

  const currentYear = currentDate.getFullYear();

  const newPatients = patients.filter((patient) => {
    if (!patient.createdAt) {
      return false;
    }

    const date = new Date(patient.createdAt);

    return (
      date.getMonth() === currentMonth && date.getFullYear() === currentYear
    );
  }).length;

  setText("totalPatients", total);
  setText("activePatients", active);
  setText("newPatients", newPatients);
  setText("inactivePatients", inactive);
}

function updatePatientCount(count) {
  const element = document.getElementById("patientCountLabel");

  if (!element) {
    return;
  }

  element.textContent = `${count} ${count === 1 ? "patient" : "patients"}`;
}

function openAddPatientModal() {
  currentPatientId = null;

  const form = document.getElementById("patientForm");

  if (form) {
    form.reset();
  }

  setText("patientModalTitle", "Add Patient");

  const idField = document.getElementById("patientId");

  if (idField) {
    idField.value = "";
  }

  openPatientModal();
}

function openEditPatient(patientId) {
  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    return;
  }

  currentPatientId = patient.id;

  const firstName = document.getElementById("firstName");

  const lastName = document.getElementById("lastName");

  const phone = document.getElementById("phone");

  const email = document.getElementById("email");

  const birthDate = document.getElementById("birthDate");

  const gender = document.getElementById("gender");

  const idField = document.getElementById("patientId");

  if (firstName) {
    firstName.value = patient.firstName;
  }

  if (lastName) {
    lastName.value = patient.lastName;
  }

  if (phone) {
    phone.value = patient.phone;
  }

  if (email) {
    email.value = patient.email;
  }

  if (birthDate) {
    birthDate.value = patient.birthDate;
  }

  if (gender) {
    gender.value = patient.gender;
  }

  if (idField) {
    idField.value = patient.id;
  }

  setText("patientModalTitle", "Edit Patient");

  openPatientModal();
}

function openPatientModal() {
  const backdrop = document.getElementById("patientModalBackdrop");

  if (!backdrop) {
    return;
  }

  backdrop.classList.add("active");

  backdrop.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    document.getElementById("firstName")?.focus();
  }, 100);
}

function closePatientModal() {
  const backdrop = document.getElementById("patientModalBackdrop");

  if (!backdrop) {
    return;
  }

  backdrop.classList.remove("active");

  backdrop.setAttribute("aria-hidden", "true");

  currentPatientId = null;
}

function handlePatientSubmit(event) {
  event.preventDefault();

  const firstName = document.getElementById("firstName")?.value.trim() || "";

  const lastName = document.getElementById("lastName")?.value.trim() || "";

  const phone = document.getElementById("phone")?.value.trim() || "";

  const email = document.getElementById("email")?.value.trim() || "";

  const birthDate = document.getElementById("birthDate")?.value || "";

  const gender = document.getElementById("gender")?.value || "";

  if (!firstName || !lastName) {
    alert("Please enter the patient's first and last name.");

    return;
  }

  if (currentPatientId) {
    const patient = patients.find((item) => item.id === currentPatientId);

    if (patient) {
      patient.firstName = firstName;

      patient.lastName = lastName;

      patient.phone = phone;

      patient.email = email;

      patient.birthDate = birthDate;

      patient.gender = gender;
    }
  } else {
    const newPatient = {
      id: generatePatientId(),

      firstName,

      lastName,

      phone,

      email,

      birthDate,

      gender,

      status: "active",

      createdAt: new Date().toISOString(),

      lastVisit: "",

      nextAppointment: "",
    };

    patients.unshift(newPatient);
  }

  savePatients();

  closePatientModal();

  renderPatients();
}

function openActionMenu(button) {
  const menu = document.getElementById("patientActionMenu");

  if (!menu) {
    return;
  }

  const rect = button.getBoundingClientRect();

  menu.classList.add("active");

  const menuWidth = menu.offsetWidth;

  const menuHeight = menu.offsetHeight;

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

  menu.style.left = `${left}px`;

  menu.style.top = `${top}px`;

  const buttons = menu.querySelectorAll("button");

  buttons.forEach((button) => {
    button.onclick = () => {
      handlePatientAction(button.dataset.action, currentActionPatientId);
    };
  });
}

function closeActionMenu() {
  const menu = document.getElementById("patientActionMenu");

  if (menu) {
    menu.classList.remove("active");
  }

  currentActionPatientId = null;
}

function handlePatientAction(action, patientId) {
  closeActionMenu();

  if (!patientId) {
    return;
  }

  const patient = patients.find((item) => item.id === patientId);

  if (!patient) {
    return;
  }

  if (action === "view") {
    alert(
      `Patient:\n\n${getFullName(patient)}\nPatient ID: ${patient.id}\nPhone: ${
        patient.phone || "Not recorded"
      }\nEmail: ${patient.email || "Not recorded"}`,
    );

    return;
  }

  if (action === "edit") {
    openEditPatient(patientId);

    return;
  }

  if (action === "toggle") {
    patient.status = patient.status === "active" ? "inactive" : "active";

    savePatients();

    renderPatients();
  }
}

function getFullName(patient) {
  const name = `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

  return name || "Unnamed Patient";
}

function getInitials(firstName, lastName) {
  const first = String(firstName || "")
    .trim()
    .charAt(0);

  const last = String(lastName || "")
    .trim()
    .charAt(0);

  const initials = `${first}${last}`.toUpperCase();

  return initials || "PT";
}

function calculateAge(birthDate) {
  if (!birthDate) {
    return "Age not available";
  }

  const birth = new Date(birthDate);

  if (Number.isNaN(birth.getTime())) {
    return "Age not available";
  }

  const today = new Date();

  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference = today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return `${age} years old`;
}

function setText(elementId, value) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = value;
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
