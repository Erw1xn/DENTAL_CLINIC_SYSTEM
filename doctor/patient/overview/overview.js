function renderPatientOverview(patient, context = {}) {
  const overviewElement =
    context.overviewElement || document.getElementById("patientPageOverview");

  const name = getFullName(patient);
  const age = calculateAge(patient.dateOfBirth);
  const gender = patient.gender || patient.patientGender || "Not specified";

  const medical = patient.medicalForm || null;

  const appointments = Array.isArray(patient.appointments)
    ? patient.appointments
    : [];

  const patientId = String(
    patient.patientId || patient.patient_id || patient.id || "N/A",
  );

  overviewElement.innerHTML = `
  <div class="patient-overview">

    <div class="patient-overview-heading">
  <div>
    <span class="patient-overview-eyebrow">PATIENT OVERVIEW</span>
    <h3>Patient Overview</h3>
    <p>Summary of the patient's current clinical records and visit history.</p>
  </div>
</div>

    <section class="patient-overview-summary-card">
      <div class="patient-overview-summary-avatar">
        ${escapeHTML(getInitials(patient))}
      </div>

      <div class="patient-overview-summary-main">
        <span class="patient-overview-label">PATIENT SUMMARY</span>
        <h3>${escapeHTML(name || "Unnamed Patient")}</h3>

        <div class="patient-overview-summary-meta">
          <span>
            <i class="fa-regular fa-id-card"></i>
            ${escapeHTML(patientId)}
          </span>

          <span>
            <i class="fa-solid fa-venus-mars"></i>
            ${escapeHTML(gender)}
          </span>

          <span>
            <i class="fa-solid fa-cake-candles"></i>
            ${age === "" ? "Age not provided" : `${age} years old`}
          </span>

          <span>
            <i class="fa-solid fa-phone"></i>
            ${escapeHTML(valueOrNone(patient.phone))}
          </span>
        </div>
      </div>
    </section>

    <div class="patient-overview-stats">

      <div class="patient-overview-stat-card">
        <div class="patient-overview-stat-icon">
          <i class="fa-regular fa-calendar-check"></i>
        </div>

        <div>
          <span>APPOINTMENTS</span>
          <strong>${appointments.length}</strong>
          <small>
            ${
              appointments.length === 1
                ? "recorded appointment"
                : "recorded appointments"
            }
          </small>
        </div>
      </div>

      <div class="patient-overview-stat-card">
        <div class="patient-overview-stat-icon">
          <i class="fa-solid fa-tooth"></i>
        </div>

        <div>
          <span>TREATMENTS</span>
          <strong>${
            Array.isArray(patient.treatments) ? patient.treatments.length : 0
          }</strong>
          <small>
            ${
              (Array.isArray(patient.treatments)
                ? patient.treatments.length
                : 0) === 1
                ? "actual treatment"
                : "actual treatments"
            }
          </small>
        </div>
      </div>

    </div>

    ${
      appointments.length
        ? (() => {
            const sortedOverviewAppointments = [...appointments].sort(
              (a, b) => {
                const dateA = a.date || a.appointment_date || "";

                const dateB = b.date || b.appointment_date || "";

                const timeA = a.start || a.appointment_time || "";

                const timeB = b.start || b.appointment_time || "";

                return `${dateB} ${timeB}`.localeCompare(`${dateA} ${timeA}`);
              },
            );

            const latestAppointment = sortedOverviewAppointments[0];

            const latestAppointmentDate =
              latestAppointment.date ||
              latestAppointment.appointment_date ||
              "";

            const latestAppointmentTime =
              latestAppointment.start ||
              latestAppointment.appointment_time ||
              "";

            const latestAppointmentService =
              latestAppointment.type ||
              latestAppointment.service_type ||
              "Appointment";

            const latestAppointmentDentist =
              latestAppointment.dentist ||
              latestAppointment.dentist_id ||
              "Not provided";

            const latestAppointmentStatus =
              latestAppointment.status ||
              latestAppointment.appointmentStatus ||
              latestAppointment.state ||
              "Not provided";

            const latestStatusClass = String(latestAppointmentStatus)
              .toLowerCase()
              .replace(/\s+/g, "-");

            return `
              <section class="patient-overview-card patient-overview-latest">

                <div class="patient-overview-card-header">
                  <div>
                    <span class="patient-overview-eyebrow">
                      VISIT HISTORY
                    </span>
                    <h3>Latest Appointment</h3>
                  </div>

                  <span
                    class="patient-overview-status status-${escapeHTML(
                      latestStatusClass,
                    )}"
                  >
                    <span></span>
                    ${escapeHTML(latestAppointmentStatus)}
                  </span>
                </div>

                <div class="patient-overview-latest-content">

                  <div class="patient-overview-latest-main">
                    <strong>
                      ${escapeHTML(latestAppointmentService)}
                    </strong>

                    <div class="patient-overview-latest-meta">
                      <span>
                        <i class="fa-regular fa-calendar"></i>
                        ${escapeHTML(formatDate(latestAppointmentDate))}
                      </span>

                      ${
                        latestAppointmentTime
                          ? `
                            <span>
                              <i class="fa-regular fa-clock"></i>
                              ${escapeHTML(
                                formatTime12Hour(latestAppointmentTime),
                              )}
                            </span>
                          `
                          : ""
                      }
                    </div>
                  </div>

                  <div class="patient-overview-latest-dentist">
                    <span>DENTIST</span>
                    <strong>
                      ${escapeHTML(latestAppointmentDentist)}
                    </strong>
                  </div>

                </div>

              </section>
            `;
          })()
        : `
          <section class="patient-overview-card">

            <div class="patient-overview-card-header">
              <div>
                <span class="patient-overview-eyebrow">
                  VISIT HISTORY
                </span>
                <h3>Latest Appointment</h3>
              </div>
            </div>

            <div class="patient-overview-empty">
              <i class="fa-regular fa-calendar"></i>
              <strong>No appointments recorded</strong>
              <span>
                This patient does not have an appointment history yet.
              </span>
            </div>

          </section>
        `
    }

    <section class="patient-overview-card">

      <div class="patient-overview-card-header">
        <div>
          <span class="patient-overview-eyebrow">
            MEDICAL INFORMATION
          </span>
          <h3>Medical Summary</h3>
        </div>

        ${
          medical
            ? `
              <span class="patient-overview-record-badge">
                <i class="fa-solid fa-circle-check"></i>
                Completed
              </span>
            `
            : `
              <span class="patient-overview-record-badge empty">
                No Record
              </span>
            `
        }
      </div>

      ${
        medical
          ? (() => {
              const concerns = Array.isArray(medical.dentalConcern)
                ? medical.dentalConcern
                : medical.dentalConcern
                  ? [medical.dentalConcern]
                  : [];

              const medicalConditions = Array.isArray(medical.medicalHistory)
                ? medical.medicalHistory
                : medical.medicalHistory
                  ? [medical.medicalHistory]
                  : [];

              const allergies = Array.isArray(medical.allergies)
                ? medical.allergies
                : medical.allergies
                  ? [medical.allergies]
                  : [];

              if (medical.medicalOther) {
                medicalConditions.push(medical.medicalOther);
              }

              if (medical.allergyOther) {
                allergies.push(medical.allergyOther);
              }

              return `
                <div class="patient-overview-medical-grid">

                  <div class="patient-overview-medical-item">
                    <span>Dental Concern</span>
                    <strong>
                      ${
                        concerns.length
                          ? escapeHTML(concerns.join(", "))
                          : "None reported"
                      }
                    </strong>
                  </div>

                  <div class="patient-overview-medical-item">
                    <span>Medical Conditions</span>
                    <strong>
                      ${
                        medicalConditions.length
                          ? escapeHTML(medicalConditions.join(", "))
                          : "None reported"
                      }
                    </strong>
                  </div>

                  <div class="patient-overview-medical-item">
                    <span>Allergies</span>
                    <strong>
                      ${
                        allergies.length
                          ? escapeHTML(allergies.join(", "))
                          : "None reported"
                      }
                    </strong>
                  </div>

                </div>
              `;
            })()
          : `
            <div class="patient-overview-empty compact">
              <i class="fa-solid fa-notes-medical"></i>
              <strong>No medical record</strong>
              <span>
                No completed medical form is available for this patient.
              </span>
            </div>
          `
      }

    </section>

    <section class="patient-overview-card">

      <div class="patient-overview-card-header">
        <div>
          <span class="patient-overview-eyebrow">
            CLINICAL RECORDS
          </span>
          <h3>Clinical Record Summary</h3>
        </div>
      </div>

      <div class="patient-overview-record-grid">

        <div class="patient-overview-record-item">
          <div class="patient-overview-record-icon">
            <i class="fa-solid fa-tooth"></i>
          </div>

          <div>
            <strong>Dental Chart</strong>
            <span>
              ${
                patient.dentalChart &&
                patient.dentalChart.teeth &&
                typeof patient.dentalChart.teeth === "object"
                  ? Object.keys(patient.dentalChart.teeth).length
                  : 0
              }
              teeth recorded
            </span>
          </div>
        </div>

        <div class="patient-overview-record-item">
          <div class="patient-overview-record-icon">
            <i class="fa-regular fa-images"></i>
          </div>

          <div>
            <strong>Clinical Images</strong>
            <span>
              ${
                Array.isArray(patient.clinicalImages)
                  ? patient.clinicalImages.length
                  : 0
              }
              ${
                Array.isArray(patient.clinicalImages) &&
                patient.clinicalImages.length === 1
                  ? "record"
                  : "records"
              }
            </span>
          </div>
        </div>

        <div class="patient-overview-record-item">
          <div class="patient-overview-record-icon">
            <i class="fa-solid fa-file-medical"></i>
          </div>

          <div>
            <strong>Treatments</strong>
            <span>
              ${
                Array.isArray(patient.treatments)
                  ? patient.treatments.length
                  : 0
              }
              actual ${
                Array.isArray(patient.treatments) &&
                patient.treatments.length === 1
                  ? "treatment"
                  : "treatments"
              }
            </span>
          </div>
        </div>

        <div class="patient-overview-record-item">
          <div class="patient-overview-record-icon">
            <i class="fa-regular fa-calendar-days"></i>
          </div>

          <div>
            <strong>Appointments</strong>
            <span>
              ${appointments.length}
              ${
                appointments.length === 1 ? "visit recorded" : "visits recorded"
              }
            </span>
          </div>
        </div>

      </div>

    </section>

  </div>
`;
}

window.renderPatientOverview = renderPatientOverview;
