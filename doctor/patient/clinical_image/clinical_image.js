function buildClinicalImagesWorkspace(patient) {
  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "",
  );

  const images = Array.isArray(patient.clinicalImages)
    ? patient.clinicalImages
    : [];

  const sortedImages = [...images].sort(
    (a, b) =>
      new Date(b.date || b.createdAt || 0).getTime() -
      new Date(a.date || a.createdAt || 0).getTime(),
  );

  return `
    <div class="patient-record-section">
      <div class="patient-record-section-header">
        <div>
          <span class="patient-record-section-eyebrow">
            CLINICAL DOCUMENTATION
          </span>

          <h3>Clinical Images</h3>

          <p>
            Patient-specific clinical photographs and documentation.
          </p>
        </div>

        <button
          type="button"
          class="patient-record-edit-btn clinical-images-add-btn"
          id="addClinicalImageBtn"
        >
          <i class="fa-solid fa-plus"></i>
          Add Clinical Images
        </button>
      </div>

      <div
        class="clinical-images-form"
        id="clinicalImagesForm"
        hidden
      >
        <div class="clinical-images-form-header">
          <span>NEW CLINICAL IMAGES</span>
          <h4>Add Before & After Images</h4>
        </div>

        <div class="clinical-images-form-grid">
          <div class="clinical-images-form-field">
            <label for="clinicalImageTitle">
              TITLE
            </label>

            <input
              type="text"
              id="clinicalImageTitle"
              placeholder="e.g. Tooth Restoration, Orthodontic Progress"
              autocomplete="off"
            />
          </div>

          <div class="clinical-images-form-field">
            <label for="clinicalImageDate">
              DATE
            </label>

            <input
              type="date"
              id="clinicalImageDate"
              value="${getLocalDateString()}"
            />
          </div>

          <div class="clinical-images-form-field full">
            <label for="clinicalImageDescription">
              DESCRIPTION
              <span class="clinical-images-optional">
                (Optional)
              </span>
            </label>

            <textarea
              id="clinicalImageDescription"
              rows="3"
              placeholder="Enter clinical image description..."
            ></textarea>
          </div>
        </div>

        <div class="clinical-images-upload-grid">
          <div class="clinical-image-upload-box before">
            <div class="clinical-image-upload-label">
              <span>BEFORE</span>
            </div>

            <div
              class="clinical-image-upload-preview"
              id="clinicalBeforePreview"
            >
              <i class="fa-regular fa-image"></i>

              <strong>
                Click to upload before image
              </strong>

              <small>
                JPG, PNG, or WEBP (Max 2 MB)
              </small>
            </div>

            <input
              type="file"
              id="clinicalBeforeFile"
              accept="image/jpeg,image/png,image/webp"
              hidden
            />
          </div>

          <div class="clinical-image-upload-box after">
            <div class="clinical-image-upload-label">
              <span>AFTER</span>
            </div>

            <div
              class="clinical-image-upload-preview"
              id="clinicalAfterPreview"
            >
              <i class="fa-regular fa-image"></i>

              <strong>
                Click to upload after image
              </strong>

              <small>
                JPG, PNG, or WEBP (Max 2 MB)
              </small>
            </div>

            <input
              type="file"
              id="clinicalAfterFile"
              accept="image/jpeg,image/png,image/webp"
              hidden
            />
          </div>
        </div>

        <div class="clinical-images-form-actions">
          <button
            type="button"
            class="clinical-images-cancel-btn"
            id="cancelClinicalImageBtn"
          >
            Cancel
          </button>

          <button
            type="button"
            class="clinical-images-save-btn"
            id="saveClinicalImageBtn"
          >
            <i class="fa-solid fa-check"></i>
            Save Images
          </button>
        </div>
      </div>

      ${
        sortedImages.length
          ? `
            <div class="clinical-images-recorded-title">
              RECORDED CLINICAL IMAGES
            </div>

            <div class="clinical-images-grid">
              ${sortedImages
                .map((image) => {
                  const beforeImage =
                    image.beforeImageData ||
                    image.beforeImage ||
                    image.imageData ||
                    "";

                  const afterImage =
                    image.afterImageData || image.afterImage || "";

                  const title = image.title || "Clinical Images";

                  const date = image.date || image.createdAt || "";

                  const description = image.description || "";

                  return `
                    <div
                      class="clinical-image-card"
                      data-clinical-image-id="${escapeHTML(
                        String(image.id || ""),
                      )}"
                    >
                      <div class="clinical-image-pair">
                        <div class="clinical-image-side">
                          <div class="clinical-image-side-label before">
                            BEFORE
                          </div>

                          ${
                            beforeImage
                              ? `
                                <img
                                  src="${escapeHTML(beforeImage)}"
                                  alt="Before ${escapeHTML(title)}"
                                  data-clinical-view="${escapeHTML(
                                    String(image.id || ""),
                                  )}"
                                />
                              `
                              : `
                                <div class="clinical-image-no-image">
                                  <i class="fa-regular fa-image"></i>
                                  <span>No image</span>
                                </div>
                              `
                          }
                        </div>

                        <div class="clinical-image-side">
                          <div class="clinical-image-side-label after">
                            AFTER
                          </div>

                          ${
                            afterImage
                              ? `
                                <img
                                  src="${escapeHTML(afterImage)}"
                                  alt="After ${escapeHTML(title)}"
                                  data-clinical-view="${escapeHTML(
                                    String(image.id || ""),
                                  )}"
                                />
                              `
                              : `
                                <div class="clinical-image-no-image">
                                  <i class="fa-regular fa-image"></i>
                                  <span>No image</span>
                                </div>
                              `
                          }
                        </div>
                      </div>

                      <div class="clinical-image-card-body">
                        <h4 class="clinical-image-card-title">
                          ${escapeHTML(title)}
                        </h4>

                        <span class="clinical-image-card-date">
                          <i class="fa-regular fa-calendar"></i>
                          ${escapeHTML(formatDate(String(date).slice(0, 10)))}
                        </span>

                        ${
                          description
                            ? `
                              <p class="clinical-image-card-description">
                                ${escapeHTML(description)}
                              </p>
                            `
                            : ""
                        }

                        <div class="clinical-image-card-actions">
                          <button
                            type="button"
                            class="clinical-image-action-btn"
                            data-clinical-view="${escapeHTML(
                              String(image.id || ""),
                            )}"
                          >
                            <i class="fa-solid fa-expand"></i>
                            View
                          </button>

                          <button
                            type="button"
                            class="clinical-image-action-btn danger"
                            data-clinical-delete="${escapeHTML(
                              String(image.id || ""),
                            )}"
                          >
                            <i class="fa-solid fa-trash"></i>
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : `
            <div class="clinical-images-empty">
              <i class="fa-regular fa-images"></i>

              <strong>
                No clinical images yet
              </strong>

              <span>
                Add before and after clinical photographs
                to document the patient's treatment progress.
              </span>
            </div>
          `
      }
    </div>
  `;
}

function bindClinicalImagesWorkspace(patient) {
  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "",
  );

  const addButton = $("addClinicalImageBtn");
  const form = $("clinicalImagesForm");
  const cancelButton = $("cancelClinicalImageBtn");
  const saveButton = $("saveClinicalImageBtn");

  const titleInput = $("clinicalImageTitle");
  const dateInput = $("clinicalImageDate");
  const descriptionInput = $("clinicalImageDescription");

  const beforeFile = $("clinicalBeforeFile");
  const afterFile = $("clinicalAfterFile");

  const beforePreview = $("clinicalBeforePreview");

  const afterPreview = $("clinicalAfterPreview");

  if (
    !addButton ||
    !form ||
    !cancelButton ||
    !saveButton ||
    !titleInput ||
    !dateInput ||
    !descriptionInput ||
    !beforeFile ||
    !afterFile ||
    !beforePreview ||
    !afterPreview
  ) {
    return;
  }
  if (isStaffReadOnly()) {
    addButton.hidden = true;
    form.hidden = true;

    document
      .querySelectorAll("#patientPageImages [data-clinical-delete]")
      .forEach((button) => {
        button.hidden = true;
      });
  }

  let beforeImageData = "";
  let afterImageData = "";

  const resetForm = () => {
    titleInput.value = "";
    dateInput.value = getLocalDateString();
    descriptionInput.value = "";

    beforeFile.value = "";
    afterFile.value = "";

    beforeImageData = "";
    afterImageData = "";

    beforePreview.innerHTML = `
      <i class="fa-regular fa-image"></i>

      <strong>
        Click to upload before image
      </strong>

      <small>
        JPG, PNG, or WEBP (Max 2 MB)
      </small>
    `;

    afterPreview.innerHTML = `
      <i class="fa-regular fa-image"></i>

      <strong>
        Click to upload after image
      </strong>

      <small>
        JPG, PNG, or WEBP (Max 2 MB)
      </small>
    `;
  };

  const closeForm = () => {
    form.hidden = true;
    resetForm();
  };

  const openForm = () => {
    resetForm();
    form.hidden = false;
    titleInput.focus();
  };

  const readImageFile = (file, preview, type) => {
    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, PNG, or WEBP image.");

      return;
    }

    const maxSize = 2 * 1024 * 1024;

    if (file.size > maxSize) {
      alert("Image size must not exceed 2 MB.");

      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result || "";

      if (!result) {
        return;
      }

      if (type === "before") {
        beforeImageData = result;
      } else {
        afterImageData = result;
      }

      preview.innerHTML = `
        <img
          src="${escapeHTML(result)}"
          alt="${type === "before" ? "Before image" : "After image"}"
        />

        <div class="clinical-image-upload-change">
          Click to change image
        </div>
      `;
    };

    reader.readAsDataURL(file);
  };

  addButton.onclick = openForm;

  cancelButton.onclick = closeForm;

  beforePreview.onclick = () => {
    beforeFile.click();
  };

  afterPreview.onclick = () => {
    afterFile.click();
  };

  beforeFile.onchange = () => {
    readImageFile(beforeFile.files?.[0], beforePreview, "before");
  };

  afterFile.onchange = () => {
    readImageFile(afterFile.files?.[0], afterPreview, "after");
  };

  saveButton.onclick = () => {
    const title = titleInput.value.trim();

    const date = dateInput.value || getLocalDateString();

    const description = descriptionInput.value.trim();

    if (!title) {
      titleInput.focus();

      alert("Please enter a title for the clinical images.");

      return;
    }

    if (!beforeImageData) {
      alert("Please upload the BEFORE image.");

      return;
    }

    if (!afterImageData) {
      alert("Please upload the AFTER image.");

      return;
    }

    const targetPatient = findPatientById(patientId) || patient;

    if (!targetPatient) {
      return;
    }

    if (!Array.isArray(targetPatient.clinicalImages)) {
      targetPatient.clinicalImages = [];
    }

    const now = new Date().toISOString();

    targetPatient.clinicalImages.push({
      id: `clinical_image_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      patientId,

      title,

      description,

      beforeImageData,

      afterImageData,

      date,

      createdAt: now,

      updatedAt: now,
    });

    const patientIndex = patients.findIndex(
      (item) =>
        String(item.patientId || item.patient_id || item.id || "") ===
        patientId,
    );

    if (patientIndex !== -1) {
      patients[patientIndex] = targetPatient;
    }

    currentPatientRecord = targetPatient;

    savePatients();

    $("patientPageImages").innerHTML =
      buildClinicalImagesWorkspace(targetPatient);

    bindClinicalImagesWorkspace(targetPatient);
  };

  const viewImagePair = (imageId) => {
    const images = Array.isArray(patient.clinicalImages)
      ? patient.clinicalImages
      : [];

    const image = images.find((item) => String(item.id) === String(imageId));

    if (!image) {
      return;
    }

    const beforeImage =
      image.beforeImageData || image.beforeImage || image.imageData || "";

    const afterImage = image.afterImageData || image.afterImage || "";

    const modal = document.createElement("div");

    modal.className = "clinical-image-viewer";

    modal.innerHTML = `
      <div class="clinical-image-viewer-dialog">
        <button
          type="button"
          class="clinical-image-viewer-close"
          aria-label="Close"
        >
          <i class="fa-solid fa-xmark"></i>
        </button>

        <div class="clinical-image-viewer-header">
          <span>
            CLINICAL DOCUMENTATION
          </span>

          <h3>
            ${escapeHTML(image.title || "Clinical Images")}
          </h3>
        </div>

        <div class="clinical-image-viewer-pair">
          <div class="clinical-image-viewer-side">
            <span class="before">
              BEFORE
            </span>

            ${
              beforeImage
                ? `
                  <img
                    src="${escapeHTML(beforeImage)}"
                    alt="Before"
                  />
                `
                : `
                  <div class="clinical-image-viewer-empty">
                    No before image
                  </div>
                `
            }
          </div>

          <div class="clinical-image-viewer-side">
            <span class="after">
              AFTER
            </span>

            ${
              afterImage
                ? `
                  <img
                    src="${escapeHTML(afterImage)}"
                    alt="After"
                  />
                `
                : `
                  <div class="clinical-image-viewer-empty">
                    No after image
                  </div>
                `
            }
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeViewer = () => {
      modal.remove();
    };

    modal
      .querySelector(".clinical-image-viewer-close")
      ?.addEventListener("click", closeViewer);

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeViewer();
      }
    });

    document.addEventListener("keydown", function handleEscape(event) {
      if (event.key === "Escape") {
        closeViewer();

        document.removeEventListener("keydown", handleEscape);
      }
    });
  };

  const deleteImage = (imageId) => {
    const targetPatient = findPatientById(patientId) || patient;

    if (!targetPatient) {
      return;
    }

    if (!Array.isArray(targetPatient.clinicalImages)) {
      return;
    }

    const image = targetPatient.clinicalImages.find(
      (item) => String(item.id) === String(imageId),
    );

    if (!image) {
      return;
    }

    const confirmed = window.confirm(
      "Delete this before and after clinical image record?",
    );

    if (!confirmed) {
      return;
    }

    targetPatient.clinicalImages = targetPatient.clinicalImages.filter(
      (item) => String(item.id) !== String(imageId),
    );

    const patientIndex = patients.findIndex(
      (item) =>
        String(item.patientId || item.patient_id || item.id || "") ===
        patientId,
    );

    if (patientIndex !== -1) {
      patients[patientIndex] = targetPatient;
    }

    currentPatientRecord = targetPatient;

    savePatients();

    $("patientPageImages").innerHTML =
      buildClinicalImagesWorkspace(targetPatient);

    bindClinicalImagesWorkspace(targetPatient);
  };

  document
    .querySelectorAll("#patientPageImages [data-clinical-view]")
    .forEach((element) => {
      element.onclick = () => {
        viewImagePair(element.dataset.clinicalView);
      };
    });

  document
    .querySelectorAll("#patientPageImages [data-clinical-delete]")
    .forEach((element) => {
      element.onclick = () => {
        deleteImage(element.dataset.clinicalDelete);
      };
    });
}
