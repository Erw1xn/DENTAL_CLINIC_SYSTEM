function renderPatientAppointments(patient) {
  const appointments = Array.isArray(patient.appointments)
    ? patient.appointments
    : [];

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = a.date || a.appointment_date || "";
    const dateB = b.date || b.appointment_date || "";
    const timeA = a.start || a.appointment_time || "";
    const timeB = b.start || b.appointment_time || "";

    return `${dateB} ${timeB}`.localeCompare(`${dateA} ${timeA}`);
  });

  if (!sortedAppointments.length) {
    return `
      <div class="patient-record-section appointment-history-section">
        <div class="patient-record-section-header">
          <div>
            <span class="patient-record-section-eyebrow">VISIT HISTORY</span>
            <h3>Appointment History</h3>
            <p class="appointment-history-description">
              Patient appointment schedule and visit status.
            </p>
          </div>
        </div>
        <div class="patient-record-empty">
          <i class="fa-regular fa-calendar"></i>
          <strong>No appointments found</strong>
          <span>
            No appointments are currently recorded for this patient.
          </span>
        </div>
      </div>
    `;
  }

  return `
    <div class="patient-record-section appointment-history-section">
      <div class="patient-record-section-header">
        <div>
          <span class="patient-record-section-eyebrow">VISIT HISTORY</span>
          <h3>Appointment History</h3>
          <p class="appointment-history-description">
            Patient appointment schedule and visit status.
          </p>
        </div>
        <div class="appointment-history-count">
          ${sortedAppointments.length}
          ${sortedAppointments.length === 1 ? "Appointment" : "Appointments"}
        </div>
      </div>
      <div class="patient-appointment-history-list">
        ${sortedAppointments
          .map((appointment) => {
            const appointmentDate =
              appointment.date || appointment.appointment_date || "";
            const appointmentTime =
              appointment.start || appointment.appointment_time || "";
            const service =
              appointment.type || appointment.service_type || "Appointment";
            const dentist =
              appointment.dentist || appointment.dentist_id || "Not provided";
            const status =
              appointment.status ||
              appointment.appointmentStatus ||
              appointment.state ||
              "Not provided";
            const appointmentId =
              appointment.id || appointment.appointmentId || "";
            const normalizedStatus = String(status)
              .toLowerCase()
              .replace(/\s+/g, "-");

            return `
              <article class="patient-appointment-card">
                <div class="patient-appointment-card-main">
                  <div class="patient-appointment-date-box">
                    <span class="patient-appointment-date-label">DATE</span>
                    <strong>${escapeHTML(formatDate(appointmentDate))}</strong>
                    <span class="patient-appointment-time">
                      <i class="fa-regular fa-clock"></i>
                      ${escapeHTML(
                        appointmentTime
                          ? formatTime12Hour(appointmentTime)
                          : "Time not provided",
                      )}
                    </span>
                  </div>
                  <div class="patient-appointment-details">
                    <div class="patient-appointment-title-row">
                      <h4>${escapeHTML(service)}</h4>
                      <span class="patient-appointment-status status-${escapeHTML(
                        normalizedStatus,
                      )}">
                        <span class="patient-appointment-status-dot"></span>
                        ${escapeHTML(status)}
                      </span>
                    </div>
                    <div class="patient-appointment-meta">
                      <div class="patient-appointment-meta-item">
                        <i class="fa-solid fa-user-doctor"></i>
                        <div>
                          <span>DENTIST</span>
                          <strong>${escapeHTML(dentist)}</strong>
                        </div>
                      </div>
                      ${
                        appointmentId
                          ? `
                            <div class="patient-appointment-meta-item">
                              <i class="fa-regular fa-calendar-check"></i>
                              <div>
                                <span>APPOINTMENT ID</span>
                                <strong>${escapeHTML(String(appointmentId))}</strong>
                              </div>
                            </div>
                          `
                          : ""
                      }
                    </div>
                  </div>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    </div>
  `;
}

window.renderPatientAppointments = renderPatientAppointments;
window.patientAppointmentHistoryModule = { render: renderPatientAppointments };
