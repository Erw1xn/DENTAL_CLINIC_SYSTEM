function getDentalProcedureColor(procedure) {
  const value = String(procedure || "")
    .trim()
    .toLowerCase();

  if (!value) {
    return {
      color: "#7c8b83",
      background: "#f8fbf9",
      border: "#d2ded6",
    };
  }

  if (
    value.includes("brace") ||
    value.includes("orthodont") ||
    value.includes("retainer")
  ) {
    return {
      color: "#22a447",
      background: "#eaf8ee",
      border: "#8fd0a0",
    };
  }

  if (value.includes("root canal")) {
    return {
      color: "#ef4444",
      background: "#fff0f0",
      border: "#f3a1a1",
    };
  }

  if (value.includes("filling") || value.includes("restoration")) {
    return {
      color: "#2f80ed",
      background: "#edf5ff",
      border: "#9bc5f5",
    };
  }

  if (value.includes("crown")) {
    return {
      color: "#f59e0b",
      background: "#fff7e6",
      border: "#f5c56b",
    };
  }

  if (value.includes("extraction") || value.includes("wisdom tooth")) {
    return {
      color: "#8b5cf6",
      background: "#f3efff",
      border: "#bba5f5",
    };
  }

  if (value.includes("whitening")) {
    return {
      color: "#14b8a6",
      background: "#e9fbf8",
      border: "#83dcd2",
    };
  }

  if (
    value.includes("cleaning") ||
    value.includes("prophylaxis") ||
    value.includes("scaling") ||
    value.includes("polishing")
  ) {
    return {
      color: "#ec4899",
      background: "#fff0f7",
      border: "#f3a3c5",
    };
  }

  if (value.includes("gum") || value.includes("periodontal")) {
    return {
      color: "#8b5a2b",
      background: "#f8f1e9",
      border: "#cda982",
    };
  }

  const customColors = [
    {
      color: "#eab308",
      background: "#fffbea",
      border: "#e7cc63",
    },
    {
      color: "#06b6d4",
      background: "#eafbfd",
      border: "#82d9e6",
    },
    {
      color: "#6366f1",
      background: "#eff0ff",
      border: "#a8aaf2",
    },
    {
      color: "#f43f5e",
      background: "#fff0f3",
      border: "#f3a0b0",
    },
    {
      color: "#84cc16",
      background: "#f3fbe9",
      border: "#b8dc82",
    },
    {
      color: "#64748b",
      background: "#f1f4f7",
      border: "#aeb8c4",
    },
  ];

  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return customColors[hash % customColors.length];
}

function formatDentalUpdatedDate(value) {
  if (!value) {
    return "Not updated";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not updated";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDentalUpdatedTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}
function bindDentalChartWorkspace(patient) {
  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "",
  );

  const workspace = document.querySelector(
    `.dental-workspace[data-patient-id="${CSS.escape(patientId)}"]`,
  );

  if (!workspace) {
    return;
  }

  const editor = workspace.querySelector("#dentalToothEditor");
  const selectedTooth = workspace.querySelector("#dentalSelectedTooth");
  const currentProcedure = workspace.querySelector("#dentalCurrentProcedure");
  const procedureInput = workspace.querySelector("#dentalProcedureInput");
  const procedureSuggestions = workspace.querySelector(
    "#dentalProcedureSuggestions",
  );
  const procedureNote = workspace.querySelector("#dentalProcedureNote");
  const toothHistory = workspace.querySelector("#dentalToothHistory");

  const toothHistoryList = workspace.querySelector("#dentalToothHistoryList");

  const toothHistoryCount = workspace.querySelector("#dentalToothHistoryCount");
  const saveButton = workspace.querySelector("#saveDentalToothBtn");
  const clearButton = workspace.querySelector("#clearDentalToothBtn");
  const cancelButton = workspace.querySelector("#cancelDentalToothBtn");

  if (
    !editor ||
    !selectedTooth ||
    !currentProcedure ||
    !procedureInput ||
    !procedureSuggestions ||
    !procedureNote ||
    !saveButton ||
    !clearButton ||
    !cancelButton
  ) {
    return;
  }

  const procedureOptions = [
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
    "Tooth Fracture",
    "Tooth Sensitivity",
    "Gum Treatment",
    "Other",
  ];

  let activeTooth = "";

  const formatDentalHistoryDate = (value) => {
    if (!value) {
      return "Date not recorded";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Date not recorded";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDentalUpdatedDate = (value) => {
    if (!value) {
      return "Not updated";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not updated";
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDentalUpdatedTime = (value) => {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const renderToothHistory = (record) => {
    const history = Array.isArray(record?.history)
      ? record.history
      : record?.procedure
        ? [
            {
              procedure: record.procedure,
              note: record.note || "",
              updatedAt: record.updatedAt || "",
            },
          ]
        : [];

    if (!history.length) {
      toothHistory.hidden = true;
      toothHistoryList.innerHTML = "";
      toothHistoryCount.textContent = "0 records";
      return;
    }

    const orderedHistory = [...history].sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime(),
    );

    toothHistoryCount.textContent = `${orderedHistory.length} record${orderedHistory.length === 1 ? "" : "s"}`;

    toothHistoryList.innerHTML = orderedHistory
      .map(
        (entry, index) => `
              <div class="dental-tooth-history-item">
                <div class="dental-tooth-history-marker">
                  <span></span>
                </div>

                <div class="dental-tooth-history-content">
                  <div class="dental-tooth-history-title">
                    <strong>
                      ${escapeHTML(String(entry.procedure || "Procedure"))}
                    </strong>

                    ${
                      index === 0
                        ? `
                          <span class="dental-tooth-history-latest">
                            Latest
                          </span>
                        `
                        : ""
                    }
                  </div>

                  <span class="dental-tooth-history-date">
                    ${escapeHTML(formatDentalHistoryDate(entry.updatedAt))}
                  </span>

                  ${
                    entry.note
                      ? `
                        <p>
                          ${escapeHTML(String(entry.note))}
                        </p>
                      `
                      : ""
                  }
                </div>
              </div>
            `,
      )
      .join("");

    toothHistory.hidden = false;
  };

  const updateSelectedToothState = () => {
    workspace
      .querySelectorAll(".dental-workspace-tooth-button.is-selected")
      .forEach((button) => {
        button.classList.remove("is-selected");
      });

    if (!activeTooth) {
      return;
    }

    const selectedButton = workspace.querySelector(
      `.dental-workspace-tooth-button[data-tooth="${CSS.escape(activeTooth)}"]`,
    );

    if (selectedButton) {
      selectedButton.classList.add("is-selected");
    }
  };

  const closeEditor = () => {
    activeTooth = "";

    workspace
      .querySelectorAll(".dental-workspace-tooth-button.is-selected")
      .forEach((button) => {
        button.classList.remove("is-selected");
      });

    procedureSuggestions.innerHTML = "";
    procedureSuggestions.hidden = true;
    editor.hidden = true;
  };

  const showSuggestions = (value) => {
    const searchValue = String(value || "")
      .trim()
      .toLowerCase();

    const filtered = procedureOptions.filter((procedure) =>
      procedure.toLowerCase().includes(searchValue),
    );

    if (!filtered.length) {
      procedureSuggestions.innerHTML = "";
      procedureSuggestions.hidden = true;
      return;
    }

    procedureSuggestions.innerHTML = filtered
      .map(
        (procedure) => `
            <button
              type="button"
              class="dental-procedure-suggestion"
              data-procedure="${escapeHTML(procedure)}"
            >
              ${escapeHTML(procedure)}
            </button>
          `,
      )
      .join("");

    procedureSuggestions.hidden = false;
  };

  const openToothEditor = (toothNumber) => {
    const chart =
      patient.dentalChart && typeof patient.dentalChart === "object"
        ? patient.dentalChart
        : {
            teeth: {},
          };

    if (!chart.teeth || typeof chart.teeth !== "object") {
      chart.teeth = {};
    }

    const record = chart.teeth[toothNumber] || {};

    activeTooth = toothNumber;

    updateSelectedToothState();

    selectedTooth.textContent = `Tooth ${toothNumber}`;

    procedureInput.value = record.procedure || "";

    procedureNote.value = record.note || "";

    currentProcedure.textContent = record.procedure || "No procedure recorded";

    const currentUpdatedDate = editor.querySelector(
      "#dentalCurrentUpdatedDate",
    );

    const currentUpdatedTime = editor.querySelector(
      "#dentalCurrentUpdatedTime",
    );

    if (currentUpdatedDate) {
      currentUpdatedDate.textContent = formatDentalUpdatedDate(
        record.updatedAt,
      );
    }

    if (currentUpdatedTime) {
      currentUpdatedTime.textContent = formatDentalUpdatedTime(
        record.updatedAt,
      );
    }

    renderToothHistory(record);

    procedureSuggestions.innerHTML = "";
    procedureSuggestions.hidden = true;

    editor.hidden = false;

    if (isStaffReadOnly()) {
      procedureInput.readOnly = true;
      procedureNote.readOnly = true;

      saveButton.hidden = true;
      clearButton.hidden = true;
      cancelButton.textContent = "Close";

      procedureSuggestions.hidden = true;

      return;
    }

    procedureInput.focus();

    if (procedureInput.value.trim()) {
      showSuggestions(procedureInput.value);
    }
  };

  workspace
    .querySelectorAll(".dental-workspace-tooth-button")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const toothNumber = button.dataset.tooth || "";

        if (!toothNumber) {
          return;
        }

        openToothEditor(toothNumber);
      });
    });

  procedureInput.addEventListener("input", () => {
    showSuggestions(procedureInput.value);
  });

  procedureInput.addEventListener("focus", () => {
    showSuggestions(procedureInput.value);
  });

  procedureSuggestions.addEventListener("click", (event) => {
    const suggestion = event.target.closest("[data-procedure]");

    if (!suggestion) {
      return;
    }

    procedureInput.value = suggestion.dataset.procedure || "";

    procedureSuggestions.innerHTML = "";
    procedureSuggestions.hidden = true;

    procedureInput.focus();
  });

  document.addEventListener("click", (event) => {
    if (
      !editor.contains(event.target) &&
      !procedureInput.contains(event.target)
    ) {
      procedureSuggestions.innerHTML = "";
      procedureSuggestions.hidden = true;
    }
  });

  saveButton.addEventListener("click", () => {
    if (!activeTooth) {
      return;
    }

    const procedure = procedureInput.value.trim();

    const note = procedureNote.value.trim();

    if (!procedure) {
      procedureInput.focus();
      return;
    }

    const targetPatient = findPatient(patientId);

    if (!targetPatient) {
      console.error(
        "Unable to save dental chart. Patient not found:",
        patientId,
      );
      return;
    }

    if (
      !targetPatient.dentalChart ||
      typeof targetPatient.dentalChart !== "object"
    ) {
      targetPatient.dentalChart = {};
    }

    if (
      !targetPatient.dentalChart.teeth ||
      typeof targetPatient.dentalChart.teeth !== "object"
    ) {
      targetPatient.dentalChart.teeth = {};
    }

    targetPatient.dentalChart.dentition = "permanent";

    const previousRecord = targetPatient.dentalChart.teeth[activeTooth] || {};

    const previousHistory = Array.isArray(previousRecord.history)
      ? previousRecord.history
      : previousRecord.procedure
        ? [
            {
              procedure: previousRecord.procedure,
              note: previousRecord.note || "",
              updatedAt: previousRecord.updatedAt || "",
            },
          ]
        : [];

    const previousProcedure = String(previousRecord.procedure || "").trim();

    const previousNote = String(previousRecord.note || "").trim();

    const hasChanged = previousProcedure !== procedure || previousNote !== note;

    const now = new Date().toISOString();

    const history = [...previousHistory];

    if (!history.length) {
      history.push({
        procedure,
        note,
        updatedAt: now,
      });
    } else if (hasChanged) {
      history.push({
        procedure,
        note,
        updatedAt: now,
      });
    }

    targetPatient.dentalChart.teeth[activeTooth] = {
      procedure,
      note,
      updatedAt: now,
      history,
    };

    targetPatient.dentalChart.updatedAt = new Date().toISOString();

    const patientIndex = patients.findIndex(
      (item) =>
        String(item.patientId || item.patient_id || item.id || "") ===
        patientId,
    );

    if (patientIndex === -1) {
      console.error(
        "Unable to save dental chart. Patient index not found:",
        patientId,
      );
      return;
    }

    patients[patientIndex] = targetPatient;
    currentPatientRecord = targetPatient;

    savePatients();

    closeEditor();

    $("patientPageDental").innerHTML = buildDentalChartWorkspace(targetPatient);

    bindDentalChartWorkspace(targetPatient);
  });

  clearButton.addEventListener("click", () => {
    if (!activeTooth) {
      return;
    }

    const targetPatient = findPatient(patientId);

    if (!targetPatient) {
      return;
    }

    if (targetPatient.dentalChart && targetPatient.dentalChart.teeth) {
      delete targetPatient.dentalChart.teeth[activeTooth];

      targetPatient.dentalChart.updatedAt = new Date().toISOString();
    }

    const patientIndex = patients.findIndex(
      (item) =>
        String(item.patientId || item.patient_id || item.id || "") ===
        patientId,
    );

    if (patientIndex !== -1) {
      patients[patientIndex] = targetPatient;
      currentPatientRecord = targetPatient;
      savePatients();
    }

    closeEditor();

    $("patientPageDental").innerHTML = buildDentalChartWorkspace(targetPatient);

    bindDentalChartWorkspace(targetPatient);
  });

  cancelButton.addEventListener("click", () => {
    closeEditor();
  });
}
function buildDentalChartWorkspace(patient) {
  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "",
  );

  const dentalChart =
    patient.dentalChart && typeof patient.dentalChart === "object"
      ? patient.dentalChart
      : {};

  const teeth =
    dentalChart.teeth && typeof dentalChart.teeth === "object"
      ? dentalChart.teeth
      : {};

  const upperLeft = ["18", "17", "16", "15", "14", "13", "12", "11"];

  const upperRight = ["21", "22", "23", "24", "25", "26", "27", "28"];

  const lowerLeft = ["48", "47", "46", "45", "44", "43", "42", "41"];

  const lowerRight = ["31", "32", "33", "34", "35", "36", "37", "38"];

  const tooth = (number) => {
    const record = teeth[number] || {};
    const procedure = String(record.procedure || "").trim();
    const history = Array.isArray(record.history)
      ? record.history
      : procedure
        ? [
            {
              procedure,
              note: record.note || "",
              updatedAt: record.updatedAt || "",
            },
          ]
        : [];

    const historyCount = history.length;
    const procedureColor = getDentalProcedureColor(procedure);

    return `
        <div
          class="dental-workspace-tooth"
          data-patient-id="${escapeHTML(patientId)}"
          data-tooth="${number}"
        >
          <span class="dental-workspace-tooth-number">
            ${number}
          </span>

          <button
            type="button"
            class="dental-workspace-tooth-button${procedure ? " has-condition" : ""}${historyCount ? " has-history" : ""}"
            data-tooth="${number}"
            data-procedure="${escapeHTML(procedure)}"
            data-history-count="${historyCount}"
            aria-label="Tooth ${number}"
            title="${escapeHTML(
              procedure
                ? `${procedure} • ${historyCount} record${historyCount === 1 ? "" : "s"}`
                : "Select tooth",
            )}"
            style="
              --tooth-color: ${procedureColor.color};
              --tooth-background: ${procedureColor.background};
              --tooth-border: ${procedureColor.border};
            "
          >
            <i class="fa-solid fa-tooth"></i>

            ${
              historyCount
                ? `
                  <span
                    class="dental-tooth-history-badge"
                    aria-hidden="true"
                  >
                    ${historyCount}
                  </span>
                `
                : ""
            }
          </button>
        </div>
      `;
  };

  const recordedCount = Object.keys(teeth).filter(
    (number) => teeth[number] && String(teeth[number].procedure || "").trim(),
  ).length;
  const latestDentalUpdate =
    Object.values(teeth)
      .map((record) => record?.updatedAt || "")
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || "";

  return `
      <div
        class="dental-workspace"
        data-patient-id="${escapeHTML(patientId)}"
      >
        <div class="dental-workspace-header">
          <div>
            <span class="dental-workspace-eyebrow">
              ODONTOGRAM
            </span>

            <h3>Dental Chart</h3>

            <p>
              Patient-specific dental chart for
              ${escapeHTML(getFullName(patient) || "Unnamed Patient")}
            </p>
          </div>

          <div class="dental-workspace-toolbar">
            <label for="dentalDentitionSelect">
              DENTITION
            </label>

            <select id="dentalDentitionSelect">
              <option value="permanent">
                Permanent
              </option>
            </select>
          </div>
        </div>

        <div class="dental-workspace-canvas">
          <div class="dental-workspace-arch-title">
            UPPER ARCH
          </div>

          <div class="dental-workspace-row">
            <div class="dental-workspace-half">
              ${upperLeft.map(tooth).join("")}
            </div>

            <div class="dental-workspace-midline"></div>

            <div class="dental-workspace-half">
              ${upperRight.map(tooth).join("")}
            </div>
          </div>

          <div class="dental-workspace-center">
            <span>MIDLINE</span>
          </div>

          <div class="dental-workspace-row dental-workspace-lower">
            <div class="dental-workspace-half">
              ${lowerLeft.map(tooth).join("")}
            </div>

            <div class="dental-workspace-midline"></div>

            <div class="dental-workspace-half">
              ${lowerRight.map(tooth).join("")}
            </div>
          </div>

          <div class="dental-workspace-arch-title lower">
            LOWER ARCH
          </div>
        </div>

        <div class="dental-tooth-editor" id="dentalToothEditor" hidden>
          <div class="dental-tooth-editor-header">
            <div>
              <span class="dental-tooth-editor-eyebrow">
                TOOTH RECORD
              </span>

              <h4 id="dentalSelectedTooth">
                Tooth
              </h4>
            </div>

            <div class="dental-tooth-editor-current-wrap">
              <span
                class="dental-tooth-editor-current"
                id="dentalCurrentProcedure"
              >
                No procedure recorded
              </span>

              <span class="dental-tooth-editor-updated">
                <i class="fa-regular fa-clock"></i>
                <span id="dentalCurrentUpdatedDate">
                  Not updated
                </span>
                <span
                  id="dentalCurrentUpdatedTime"
                ></span>
              </span>
            </div>
          </div>

          <div class="dental-tooth-editor-fields">
            <div class="dental-tooth-editor-field">
              <label for="dentalProcedureInput">
                SERVICE / PROCEDURE
              </label>

              <div class="dental-procedure-input-wrapper">
                <input
                  type="text"
                  id="dentalProcedureInput"
                  autocomplete="off"
                  placeholder="Type service or procedure..."
                />

                <div
                  class="dental-procedure-suggestions"
                  id="dentalProcedureSuggestions"
                  hidden
                ></div>
              </div>
            </div>

            <div class="dental-tooth-editor-field">
              <label for="dentalProcedureNote">
                CLINICAL NOTE
              </label>

              <textarea
                id="dentalProcedureNote"
                rows="3"
                placeholder="Enter clinical findings or notes..."
              ></textarea>
            </div>
            <div
            class="dental-tooth-history"
            id="dentalToothHistory"
            hidden
          >
            <div class="dental-tooth-history-header">
              <div>
                <span class="dental-tooth-history-eyebrow">
                  PROCEDURE HISTORY
                </span>
                <h5>Previous Records</h5>
              </div>

              <span
                class="dental-tooth-history-count"
                id="dentalToothHistoryCount"
              >
                0 records
              </span>
            </div>

            <div
              class="dental-tooth-history-list"
              id="dentalToothHistoryList"
            ></div>
          </div>

          <div class="dental-tooth-editor-actions">
            <button
              type="button"
              class="dental-tooth-editor-cancel"
              id="cancelDentalToothBtn"
            >
              Cancel
            </button>

            <button
              type="button"
              class="dental-tooth-editor-clear"
              id="clearDentalToothBtn"
            >
              Clear
            </button>

            <button
              type="button"
              class="dental-tooth-editor-save"
              id="saveDentalToothBtn"
            >
              <i class="fa-solid fa-check"></i>
              Save Tooth
            </button>
          </div>
        </div>
        
                <div class="dental-procedure-legend">
          <div class="dental-procedure-legend-header">
            <div>
              <span class="dental-procedure-legend-eyebrow">
                PROCEDURE GUIDE
              </span>
              <h4>Procedure Colors</h4>
            </div>

            <span class="dental-procedure-legend-note">
              Colors indicate recorded procedures
            </span>
          </div>

          <div class="dental-procedure-legend-list">
            ${(() => {
              const recordedProcedures = [
                ...new Set(
                  Object.values(teeth)
                    .map((record) => String(record?.procedure || "").trim())
                    .filter(Boolean),
                ),
              ];

              if (!recordedProcedures.length) {
                return `
                  <div class="dental-procedure-legend-empty">
                    No recorded procedures yet
                  </div>
                `;
              }

              return recordedProcedures
                .sort((a, b) => a.localeCompare(b))
                .map((procedure) => {
                  const color = getDentalProcedureColor(procedure);

                  return `
                    <div
                      class="dental-procedure-legend-item"
                      title="${escapeHTML(procedure)}"
                    >
                      <span
                        class="dental-procedure-legend-dot"
                        style="
                          --legend-color: ${color.color};
                          --legend-background: ${color.background};
                          --legend-border: ${color.border};
                        "
                      ></span>

                      <span>
                        ${escapeHTML(procedure)}
                      </span>
                    </div>
                  `;
                })
                .join("");
            })()}
          </div>
        </div>

        <div class="dental-workspace-status">
          <div class="dental-workspace-status-icon">
            <i class="fa-solid fa-tooth"></i>
          </div>

          <div class="dental-workspace-status-content">
            <strong>
              ${recordedCount} tooth${recordedCount === 1 ? "" : "s"} recorded
            </strong>

            <span>
              ${
                latestDentalUpdate
                  ? `Last updated ${formatDentalUpdatedDate(latestDentalUpdate)}${formatDentalUpdatedTime(latestDentalUpdate) ? ` • ${formatDentalUpdatedTime(latestDentalUpdate)}` : ""}`
                  : "No clinical tooth records have been updated yet"
              }
            </span>
          </div>

          <div class="dental-workspace-status-indicator">
            <span class="dental-workspace-status-dot"></span>

            <span>
              ${recordedCount ? "Clinical record active" : "No records yet"}
            </span>
          </div>
        </div>
      </div>
    `;
}
