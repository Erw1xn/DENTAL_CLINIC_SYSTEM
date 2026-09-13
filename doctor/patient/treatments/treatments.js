function buildTreatmentWorkspace(patient) {
  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "",
  );

  const treatments = Array.isArray(patient.treatments)
    ? patient.treatments
    : [];

  const appointments = Array.isArray(patient.appointments)
    ? patient.appointments
    : [];

  const treatmentOptions = [
    "Dental Consultation",
    "Dental Cleaning",
    "Dental Filling",
    "Tooth Extraction",
    "Root Canal Treatment",
    "Braces Adjustment",
    "Dental Whitening",
    "Dental X-ray",
    "Scaling and Polishing",
    "Denture Fitting",
    "Wisdom Tooth Extraction",
    "Implant Consultation",
    "Oral Prophylaxis",
    "Retainer Fitting",
    "Dental Crown",
    "Temporary Filling",
    "Permanent Filling",
    "Tooth Restoration",
    "Gum Treatment",
    "Other",
  ];

  const sortedTreatments = [...treatments].sort(
    (a, b) =>
      new Date(b.date || b.createdAt || 0).getTime() -
      new Date(a.date || a.createdAt || 0).getTime(),
  );

  return `
    <div class="patient-record-section">
      <div class="patient-record-section-header">
        <div>
          <span class="patient-record-section-eyebrow">
            CLINICAL HISTORY
          </span>

          <h3>Actual Treatments & Procedures</h3>
        </div>

        <button
          type="button"
          class="patient-record-edit-btn"
          id="addTreatmentBtn"
        >
          <i class="fa-solid fa-plus"></i>
          Add Treatment
        </button>
      </div>

      <div
        class="treatment-workspace"
        id="treatmentWorkspace"
        hidden
      >
        <div class="medical-result-grid">
          <div class="medical-result-item full">
            <span class="medical-result-label">
              APPOINTMENT / VISIT
            </span>

            <select id="treatmentAppointment">
              <option value="">
                Select appointment
              </option>

              ${appointments
                .map((appointment) => {
                  const appointmentId =
                    appointment.id || appointment.appointmentId || "";

                  const date =
                    appointment.date || appointment.appointment_date || "";

                  const time =
                    appointment.start || appointment.appointment_time || "";

                  const service =
                    appointment.type ||
                    appointment.service_type ||
                    "Appointment";

                  return `
                    <option value="${escapeHTML(appointmentId)}">
                      ${escapeHTML(
                        `${date || "No date"}${
                          time ? ` · ${formatTime12Hour(time)}` : ""
                        } · ${service}`,
                      )}
                    </option>
                  `;
                })
                .join("")}
            </select>
          </div>

          <div class="medical-result-item">
            <span class="medical-result-label">
              TOOTH NUMBER
            </span>

            <input
              type="text"
              id="treatmentTooth"
              placeholder="Example: 16"
              maxlength="2"
            />
          </div>

          <div class="medical-result-item">
            <span class="medical-result-label">
              TREATMENT DATE
            </span>

            <input
              type="date"
              id="treatmentDate"
              value="${getLocalDateString()}"
            />
          </div>

          <div class="medical-result-item full">
            <span class="medical-result-label">
              TREATMENT / PROCEDURE
            </span>

            <div class="treatment-procedure-wrapper">
              <input
                type="text"
                id="treatmentProcedure"
                autocomplete="off"
                placeholder="Type treatment or procedure..."
              />

              <div
                class="treatment-procedure-suggestions"
                id="treatmentProcedureSuggestions"
                hidden
              >
                ${treatmentOptions
                  .map(
                    (procedure) => `
                      <button
                        type="button"
                        data-treatment-procedure="${escapeHTML(procedure)}"
                      >
                        ${escapeHTML(procedure)}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          </div>

          <div class="medical-result-item full">
            <span class="medical-result-label">
              CLINICAL NOTE
            </span>

            <textarea
              id="treatmentNote"
              rows="4"
              placeholder="Enter actual treatment performed, findings, materials used, or other clinical notes..."
            ></textarea>
          </div>
        </div>

        <div class="treatment-form-actions">
          <button
            type="button"
            class="patient-record-edit-btn"
            id="cancelTreatmentBtn"
          >
            Cancel
          </button>

          <button
            type="button"
            class="patient-record-edit-btn"
            id="saveTreatmentBtn"
          >
            <i class="fa-solid fa-check"></i>
            Save Treatment
          </button>
        </div>
      </div>

      ${
        sortedTreatments.length
          ? `
            <div class="treatment-history-list">
              ${sortedTreatments
                .map((treatment) => {
                  const procedure =
                    treatment.procedure || treatment.treatment || "Treatment";

                  const tooth = treatment.toothNumber || treatment.tooth || "";

                  const date =
                    treatment.date ||
                    treatment.treatmentDate ||
                    treatment.createdAt ||
                    "";

                  const treatmentTime = treatment.createdAt || "";

                  const note = treatment.note || treatment.clinicalNote || "";

                  return `
                    <div
                      class="patient-record-appointment"
                      data-treatment-id="${escapeHTML(treatment.id || "")}"
                    >
                      <div class="patient-record-appointment-date">
                            <span>
                              ${escapeHTML(
                                formatDate(String(date).slice(0, 10)),
                              )}
                            </span>

                            <strong class="treatment-history-time">
                              <i class="fa-regular fa-clock"></i>
                              ${escapeHTML(
                                treatmentTime
                                  ? new Date(treatmentTime).toLocaleTimeString(
                                      "en-US",
                                      {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "",
                              )}
                            </strong>

                            ${
                              tooth
                                ? `<strong class="treatment-history-tooth">Tooth ${escapeHTML(tooth)}</strong>`
                                : ""
                            }
                          </div>

                      <div class="patient-record-appointment-info">
                        <strong>
                          ${escapeHTML(procedure)}
                        </strong>

                        ${note ? `<span>${escapeHTML(note)}</span>` : ""}
                      </div>

                      <div
                        style="display:flex;gap:6px;align-items:center;margin-left:auto;"
                      >
                        <button
                          type="button"
                          class="patient-record-edit-btn"
                          data-treatment-edit="${escapeHTML(
                            treatment.id || "",
                          )}"
                          title="Edit Treatment"
                        >
                          <i class="fa-solid fa-pen"></i>
                        </button>

                        <button
                          type="button"
                          class="patient-record-edit-btn"
                          data-treatment-delete="${escapeHTML(
                            treatment.id || "",
                          )}"
                          title="Delete Treatment"
                        >
                          <i class="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : ` 
            <div class="patient-record-empty">
              <i class="fa-solid fa-stethoscope"></i>

              <strong>
                No treatments recorded
              </strong>

              <span>
                Actual procedures performed by the dentist will
                appear here after clinical assessment.
              </span>
            </div>
          `
      }
    </div>
  `;
}

function bindTreatmentWorkspace(patient) {
  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "",
  );

  const addButton = $("addTreatmentBtn");
  const workspace = $("treatmentWorkspace");
  const appointmentInput = $("treatmentAppointment");
  const toothInput = $("treatmentTooth");
  const dateInput = $("treatmentDate");
  const procedureInput = $("treatmentProcedure");
  const suggestions = $("treatmentProcedureSuggestions");
  const noteInput = $("treatmentNote");
  const saveButton = $("saveTreatmentBtn");
  const cancelButton = $("cancelTreatmentBtn");

  if (
    !addButton ||
    !workspace ||
    !appointmentInput ||
    !toothInput ||
    !dateInput ||
    !procedureInput ||
    !suggestions ||
    !noteInput ||
    !saveButton ||
    !cancelButton
  ) {
    return;
  }

  if (isStaffReadOnly()) {
    addButton.hidden = true;
    workspace.hidden = true;

    document
      .querySelectorAll(
        "#patientPageTreatments [data-treatment-edit], #patientPageTreatments [data-treatment-delete]",
      )
      .forEach((button) => {
        button.hidden = true;
      });

    return;
  }

  const treatmentOptions = [
    "Dental Consultation",
    "Dental Cleaning",
    "Dental Filling",
    "Tooth Extraction",
    "Root Canal Treatment",
    "Braces Adjustment",
    "Dental Whitening",
    "Dental X-ray",
    "Scaling and Polishing",
    "Denture Fitting",
    "Wisdom Tooth Extraction",
    "Implant Consultation",
    "Oral Prophylaxis",
    "Retainer Fitting",
    "Dental Crown",
    "Temporary Filling",
    "Permanent Filling",
    "Tooth Restoration",
    "Gum Treatment",
    "Other",
  ];

  let editingTreatmentId = null;

  const closeForm = () => {
    editingTreatmentId = null;
    workspace.hidden = true;
    appointmentInput.value = "";
    toothInput.value = "";
    dateInput.value = getLocalDateString();
    procedureInput.value = "";
    noteInput.value = "";
    suggestions.hidden = true;
  };

  const showSuggestions = (value) => {
    const searchValue = String(value || "")
      .trim()
      .toLowerCase();

    const filtered = treatmentOptions.filter((item) =>
      item.toLowerCase().includes(searchValue),
    );

    suggestions.innerHTML = filtered
      .map(
        (procedure) => `
          <button
            type="button"
            data-treatment-procedure="${escapeHTML(procedure)}"
          >
            ${escapeHTML(procedure)}
          </button>
        `,
      )
      .join("");

    suggestions.hidden = filtered.length === 0;
  };

  const openAddForm = () => {
    editingTreatmentId = null;
    workspace.hidden = false;
    appointmentInput.value = "";
    toothInput.value = "";
    dateInput.value = getLocalDateString();
    procedureInput.value = "";
    noteInput.value = "";
    suggestions.hidden = true;
    procedureInput.focus();
  };

  const openEditForm = (treatment) => {
    if (!treatment) {
      return;
    }

    editingTreatmentId = treatment.id || null;

    workspace.hidden = false;

    appointmentInput.value =
      treatment.appointmentId || treatment.appointment_id || "";

    toothInput.value = treatment.toothNumber || treatment.tooth || "";

    dateInput.value =
      treatment.date || treatment.treatmentDate || getLocalDateString();

    procedureInput.value = treatment.procedure || treatment.treatment || "";

    noteInput.value = treatment.note || treatment.clinicalNote || "";

    suggestions.hidden = true;

    procedureInput.focus();
  };

  addButton.addEventListener("click", openAddForm);

  cancelButton.addEventListener("click", closeForm);

  procedureInput.addEventListener("input", () => {
    showSuggestions(procedureInput.value);
  });

  procedureInput.addEventListener("focus", () => {
    showSuggestions(procedureInput.value);
  });

  suggestions.addEventListener("click", (event) => {
    const button = event.target.closest("[data-treatment-procedure]");

    if (!button) {
      return;
    }

    procedureInput.value = button.dataset.treatmentProcedure || "";

    suggestions.hidden = true;
    procedureInput.focus();
  });

  const historyList = document.querySelector(".treatment-history-list");

  historyList?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-treatment-edit]");

    if (editButton) {
      const treatmentId = editButton.dataset.treatmentEdit || "";

      const targetPatient = findPatientById(patientId);

      if (!targetPatient) {
        return;
      }

      const treatment = Array.isArray(targetPatient.treatments)
        ? targetPatient.treatments.find(
            (item) => String(item.id || "") === String(treatmentId),
          )
        : null;

      if (!treatment) {
        return;
      }

      openEditForm(treatment);
      return;
    }

    const deleteButton = event.target.closest("[data-treatment-delete]");

    if (deleteButton) {
      const treatmentId = deleteButton.dataset.treatmentDelete || "";

      const targetPatient = findPatientById(patientId);

      if (!targetPatient) {
        return;
      }

      if (!Array.isArray(targetPatient.treatments)) {
        return;
      }

      const treatmentIndex = targetPatient.treatments.findIndex(
        (item) => String(item.id || "") === String(treatmentId),
      );

      if (treatmentIndex === -1) {
        return;
      }

      const treatment = targetPatient.treatments[treatmentIndex];

      const procedure =
        treatment.procedure || treatment.treatment || "this treatment";

      const confirmed = window.confirm(
        `Are you sure you want to delete "${procedure}"?`,
      );

      if (!confirmed) {
        return;
      }

      targetPatient.treatments.splice(treatmentIndex, 1);

      targetPatient.updatedAt = new Date().toISOString();

      const patientIndex = patients.findIndex(
        (item) =>
          String(item.patientId || item.patient_id || item.id || "") ===
          patientId,
      );

      if (patientIndex === -1) {
        return;
      }

      patients[patientIndex] = targetPatient;

      currentPatientRecord = targetPatient;

      savePatients();

      $("patientPageTreatments").innerHTML =
        buildTreatmentWorkspace(targetPatient);

      bindTreatmentWorkspace(targetPatient);
    }
  });

  saveButton.addEventListener("click", () => {
    const procedure = procedureInput.value.trim();

    const tooth = toothInput.value.trim();

    const note = noteInput.value.trim();

    const date = dateInput.value || getLocalDateString();

    if (!procedure) {
      procedureInput.focus();
      return;
    }

    if (date > getLocalDateString()) {
      dateInput.focus();
      return;
    }

    const targetPatient = findPatientById(patientId);

    if (!targetPatient) {
      return;
    }

    if (!Array.isArray(targetPatient.treatments)) {
      targetPatient.treatments = [];
    }

    const appointmentId = appointmentInput.value || "";

    const now = new Date().toISOString();

    if (editingTreatmentId) {
      const treatmentIndex = targetPatient.treatments.findIndex(
        (item) => String(item.id || "") === String(editingTreatmentId),
      );

      if (treatmentIndex === -1) {
        return;
      }

      const existingTreatment = targetPatient.treatments[treatmentIndex];

      targetPatient.treatments[treatmentIndex] = {
        ...existingTreatment,
        patientId,
        appointmentId,
        toothNumber: tooth,
        procedure,
        note,
        date,
        updatedAt: now,
      };
    } else {
      targetPatient.treatments.push({
        id: `treatment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        patientId,
        appointmentId,
        toothNumber: tooth,
        procedure,
        note,
        date,
        createdAt: now,
        updatedAt: now,
      });
    }

    const patientIndex = patients.findIndex(
      (item) =>
        String(item.patientId || item.patient_id || item.id || "") ===
        patientId,
    );

    if (patientIndex === -1) {
      return;
    }

    patients[patientIndex] = targetPatient;

    currentPatientRecord = targetPatient;

    savePatients();

    $("patientPageTreatments").innerHTML =
      buildTreatmentWorkspace(targetPatient);

    bindTreatmentWorkspace(targetPatient);
  });
}
