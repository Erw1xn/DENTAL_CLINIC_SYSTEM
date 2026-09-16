-- DentaNueva patient and clinical record schema
-- Run this once in dental_clinic_system. Existing tbl_users is preserved.

CREATE TABLE IF NOT EXISTS tbl_patients (
    patient_id VARCHAR(20) NOT NULL,
    user_id INT UNSIGNED NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NULL,
    gender VARCHAR(30) NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(190) NULL,
    address VARCHAR(255) NULL,
    emergency_name VARCHAR(150) NULL,
    emergency_contact VARCHAR(30) NULL,
    patient_type ENUM('registered','walk_in') NOT NULL DEFAULT 'walk_in',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (patient_id),
    UNIQUE KEY uq_tbl_patients_user_id (user_id),
    KEY idx_tbl_patients_name (last_name, first_name),
    CONSTRAINT fk_tbl_patients_user FOREIGN KEY (user_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_tbl_patients_created_by FOREIGN KEY (created_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_medical_forms (
    medical_form_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    dental_concern JSON NULL,
    dental_concern_other VARCHAR(255) NULL,
    negative_experience VARCHAR(10) NULL,
    negative_experience_note TEXT NULL,
    last_dental_visit DATE NULL,
    last_dental_treatment TEXT NULL,
    current_medications VARCHAR(10) NULL,
    current_medications_list TEXT NULL,
    medical_history JSON NULL,
    medical_other VARCHAR(255) NULL,
    allergies JSON NULL,
    allergy_other VARCHAR(255) NULL,
    consent TINYINT(1) NOT NULL DEFAULT 0,
    completed TINYINT(1) NOT NULL DEFAULT 0,
    submitted_by INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (medical_form_id),
    UNIQUE KEY uq_tbl_medical_forms_patient (patient_id),
    CONSTRAINT fk_tbl_medical_forms_patient FOREIGN KEY (patient_id) REFERENCES tbl_patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_tbl_medical_forms_submitter FOREIGN KEY (submitted_by) REFERENCES tbl_users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_patient_appointments (
    appointment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    doctor_id INT UNSIGNED NULL,
    appointment_date DATE NULL,
    appointment_time TIME NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    reason VARCHAR(255) NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (appointment_id),
    KEY idx_appointments_patient (patient_id),
    CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id) REFERENCES tbl_patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_patient_treatments (
    treatment_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    doctor_id INT UNSIGNED NULL,
    appointment_id BIGINT UNSIGNED NULL,
    tooth_number VARCHAR(10) NULL,
    procedure_name VARCHAR(150) NOT NULL,
    treatment_date DATE NULL,
    notes TEXT NULL,
    consumed_materials JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (treatment_id),
    KEY idx_treatments_patient (patient_id),
    CONSTRAINT fk_treatments_patient FOREIGN KEY (patient_id) REFERENCES tbl_patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_treatments_doctor FOREIGN KEY (doctor_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_treatments_appointment FOREIGN KEY (appointment_id) REFERENCES tbl_patient_appointments(appointment_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_dental_chart (
    dental_chart_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    doctor_id INT UNSIGNED NULL,
    tooth_number VARCHAR(10) NOT NULL,
    procedure_name VARCHAR(150) NULL,
    notes TEXT NULL,
    recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (dental_chart_id),
    KEY idx_dental_chart_patient (patient_id),
    CONSTRAINT fk_dental_chart_patient FOREIGN KEY (patient_id) REFERENCES tbl_patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_dental_chart_doctor FOREIGN KEY (doctor_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tbl_clinical_images (
    image_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    patient_id VARCHAR(20) NOT NULL,
    doctor_id INT UNSIGNED NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    before_image LONGTEXT NULL,
    after_image LONGTEXT NULL,
    image_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (image_id),
    KEY idx_clinical_images_patient (patient_id),
    CONSTRAINT fk_clinical_images_patient FOREIGN KEY (patient_id) REFERENCES tbl_patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_clinical_images_doctor FOREIGN KEY (doctor_id) REFERENCES tbl_users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link existing registered accounts to a stable patient record.
INSERT INTO tbl_patients (patient_id, user_id, first_name, last_name, email, patient_type, created_by)
SELECT CONCAT('PN-', LPAD(u.user_id, 4, '0')), u.user_id,
       COALESCE(u.firstname, ''), COALESCE(u.lastname, ''), u.email, 'registered', u.user_id
FROM tbl_users u
LEFT JOIN tbl_patients p ON p.user_id = u.user_id
WHERE LOWER(COALESCE(u.role, '')) = 'user' AND p.patient_id IS NULL;
