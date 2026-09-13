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

  const negativeExperience = medical.negativeExperience || "";

  const negativeExperienceNote = medical.negativeExperienceNote || "";

  return `
		<div class="medical-record-workspace">

			<div class="medical-record-summary">
				<div class="medical-record-summary-icon">
					<i class="fa-solid fa-notes-medical"></i>
				</div>

				<div class="medical-record-summary-content">
					<span class="medical-record-summary-eyebrow">
						MEDICAL RECORD
					</span>

					<h3>
						${escapeHTML(getFullName(patient))}
					</h3>

					<span>
						Patient ID:
						${escapeHTML(patient.patientId || patient.id || "N/A")}
					</span>
				</div>

				<div class="medical-record-complete-badge">
					<span></span>
					Completed
				</div>
			</div>

			<section class="medical-record-card">
				<div class="medical-record-card-header">
					<div class="medical-record-card-icon">
						<i class="fa-solid fa-tooth"></i>
					</div>

					<div>
						<span>VISIT INFORMATION</span>
						<h3>Dental Concern</h3>
					</div>
				</div>

				<div class="medical-record-card-body">
					<div class="medical-record-field full">
						<span class="medical-record-field-label">
							Reason for Visit
						</span>

						${renderResultTags(concerns)}
					</div>

					<div class="medical-record-field">
						<span class="medical-record-field-label">
							Previous Negative Dental Experience
						</span>

						<div class="medical-record-field-value">
							${escapeHTML(valueOrNone(negativeExperience))}
						</div>
					</div>

					<div class="medical-record-field">
						<span class="medical-record-field-label">
							Experience Notes
						</span>

						<div class="medical-record-field-value">
							${escapeHTML(valueOrNone(negativeExperienceNote))}
						</div>
					</div>
				</div>
			</section>

			<section class="medical-record-card">
				<div class="medical-record-card-header">
					<div class="medical-record-card-icon">
						<i class="fa-solid fa-heart-pulse"></i>
					</div>

					<div>
						<span>HEALTH INFORMATION</span>
						<h3>Medical History</h3>
					</div>
				</div>

				<div class="medical-record-card-body">

					<div class="medical-record-field full">
						<span class="medical-record-field-label">
							Medical Conditions
						</span>

						${renderResultTags(medicalHistory)}
					</div>

					<div class="medical-record-field">
						<span class="medical-record-field-label">
							Current Medications
						</span>

						<div class="medical-record-field-value">
							${escapeHTML(valueOrNone(medical.currentMedications))}
						</div>
					</div>

					<div class="medical-record-field">
						<span class="medical-record-field-label">
							Allergies
						</span>

						${renderResultTags(allergies)}
					</div>

					<div class="medical-record-field full">
						<span class="medical-record-field-label">
							Medication / Supplement List
						</span>

						<div class="medical-record-field-value large">
							${escapeHTML(valueOrNone(medical.currentMedicationsList))}
						</div>
					</div>

				</div>
			</section>

			<section class="medical-record-card">
				<div class="medical-record-card-header">
					<div class="medical-record-card-icon">
						<i class="fa-solid fa-calendar-check"></i>
					</div>

					<div>
						<span>DENTAL HISTORY</span>
						<h3>Previous Dental Care</h3>
					</div>
				</div>

				<div class="medical-record-card-body">

					<div class="medical-record-field">
						<span class="medical-record-field-label">
							Last Dental Visit
						</span>

						<div class="medical-record-field-value">
							${escapeHTML(
                medical.medLastVisit
                  ? formatDate(medical.medLastVisit)
                  : "Not provided",
              )}
						</div>
					</div>

					<div class="medical-record-field">
						<span class="medical-record-field-label">
							Last Dental Treatment
						</span>

						<div class="medical-record-field-value">
							${escapeHTML(valueOrNone(medical.medLastTreatment))}
						</div>
					</div>

				</div>
			</section>

			<div class="medical-record-consent">
				<div class="medical-record-consent-icon">
					<i class="fa-solid fa-circle-check"></i>
				</div>

				<div>
					<strong>Patient Consent Confirmed</strong>

					<p>
						The patient confirmed that the information
						provided was accurate and agreed to the
						DentaNueva consent.
					</p>
				</div>
			</div>

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
