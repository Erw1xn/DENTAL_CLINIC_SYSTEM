<?php
declare(strict_types=1);

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../php/db_connect.php';

function jsonResponse(bool $success, string $message = '', $data = null, int $status = 200): void
{
    http_response_code($status);
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['logged_in']) || empty($_SESSION['user_id'])) {
    jsonResponse(false, 'Authentication required.', null, 401);
}

$role = strtolower(trim((string) ($_SESSION['role'] ?? '')));
$userId = (int) $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];
$requestedPatientId = trim((string) ($_GET['patient_id'] ?? $_POST['patient_id'] ?? ''));

function ensurePatient(mysqli $conn, string $patientId, int $userId, string $role): void
{
    if ($role === 'user') {
        $patientId = 'PN-' . str_pad((string) $userId, 4, '0', STR_PAD_LEFT);
    } elseif ($patientId === '') {
        jsonResponse(false, 'Patient ID is required.', null, 422);
    }
    if ($role !== 'user') {
        return;
    }
    $stmt = $conn->prepare("INSERT INTO tbl_patients (patient_id, user_id, first_name, last_name, email, patient_type, created_by) SELECT ?, user_id, COALESCE(firstname, ''), COALESCE(lastname, ''), email, 'registered', user_id FROM tbl_users WHERE user_id = ? ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)");
    $stmt->bind_param('si', $patientId, $userId);
    $stmt->execute();
    $stmt->close();
}

function patientRecordExists(mysqli $conn, string $patientId): bool
{
    $stmt = $conn->prepare('SELECT patient_id FROM tbl_patients WHERE patient_id = ? LIMIT 1');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $exists = $stmt->get_result()->num_rows > 0;
    $stmt->close();
    return $exists;
}

function generateWalkInPatientId(mysqli $conn): string
{
    $result = $conn->query("SELECT COALESCE(MAX(CAST(SUBSTRING(patient_id, 4) AS UNSIGNED)), 0) AS highest_id FROM tbl_patients WHERE patient_id REGEXP '^PN-[0-9]{4}$'");
    $row = $result ? $result->fetch_assoc() : ['highest_id' => 0];
    $nextId = ((int) ($row['highest_id'] ?? 0)) + 1;
    return 'PN-' . str_pad((string) $nextId, 4, '0', STR_PAD_LEFT);
}

function assertAccess(mysqli $conn, string $patientId, int $userId, string $role): void
{
    if ($role === 'doctor' || $role === 'staff') {
        return;
    }
    $stmt = $conn->prepare('SELECT patient_id FROM tbl_patients WHERE patient_id = ? AND user_id = ? LIMIT 1');
    $stmt->bind_param('si', $patientId, $userId);
    $stmt->execute();
    $allowed = $stmt->get_result()->num_rows === 1;
    $stmt->close();
    if (!$allowed) {
        jsonResponse(false, 'You may access only your own patient record.', null, 403);
    }
}

function decodeJsonValue(?string $value): array
{
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : [];
}

function patientPayload(mysqli $conn, string $patientId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM tbl_patients WHERE patient_id = ? LIMIT 1');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $patient = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if (!$patient) {
        return null;
    }

    $patient['id'] = $patient['patient_id'];
    $patient['userId'] = $patient['user_id'];
    $patient['firstName'] = $patient['first_name'];
    $patient['lastName'] = $patient['last_name'];
    $patient['fullName'] = trim($patient['first_name'] . ' ' . $patient['last_name']);
    $patient['dateOfBirth'] = $patient['date_of_birth'];
    $patient['patientGender'] = $patient['gender'];
    $patient['emergencyName'] = $patient['emergency_name'];
    $patient['emergencyContact'] = $patient['emergency_contact'];
    $patient['appointments'] = [];
    $patient['treatments'] = [];
    $patient['clinicalImages'] = [];
    $patient['dentalChart'] = ['teeth' => []];

    $stmt = $conn->prepare('SELECT * FROM tbl_medical_forms WHERE patient_id = ? LIMIT 1');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $medical = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($medical) {
        $patient['medicalForm'] = [
            'dentalConcern' => decodeJsonValue($medical['dental_concern']),
            'dentalConcernOther' => $medical['dental_concern_other'],
            'negativeExperience' => $medical['negative_experience'],
            'negativeExperienceNote' => $medical['negative_experience_note'],
            'medLastVisit' => $medical['last_dental_visit'],
            'medLastTreatment' => $medical['last_dental_treatment'],
            'currentMedications' => $medical['current_medications'],
            'currentMedicationsList' => $medical['current_medications_list'],
            'medicalHistory' => decodeJsonValue($medical['medical_history']),
            'medicalOther' => $medical['medical_other'],
            'allergies' => decodeJsonValue($medical['allergies']),
            'allergyOther' => $medical['allergy_other'],
            'consent' => (bool) $medical['consent'],
            'completed' => (bool) $medical['completed'],
            'createdAt' => $medical['created_at'],
            'updatedAt' => $medical['updated_at'],
        ];
    } else {
        $patient['medicalForm'] = null;
    }

    $stmt = $conn->prepare('SELECT * FROM tbl_patient_appointments WHERE patient_id = ? ORDER BY appointment_date DESC, appointment_time DESC');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $appointments = $stmt->get_result();
    while ($row = $appointments->fetch_assoc()) {
        $patient['appointments'][] = [
            'appointmentId' => $row['appointment_id'],
            'appointment_date' => $row['appointment_date'],
            'appointment_time' => $row['appointment_time'],
            'status' => $row['status'],
            'reason' => $row['reason'],
            'notes' => $row['notes'],
        ];
    }
    $stmt->close();

    $stmt = $conn->prepare('SELECT * FROM tbl_patient_treatments WHERE patient_id = ? ORDER BY treatment_date DESC, treatment_id DESC');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $treatments = $stmt->get_result();
    while ($row = $treatments->fetch_assoc()) {
        $patient['treatments'][] = [
            'treatmentId' => $row['treatment_id'],
            'appointmentId' => $row['appointment_id'],
            'toothNumber' => $row['tooth_number'],
            'procedure' => $row['procedure_name'],
            'date' => $row['treatment_date'],
            'note' => $row['notes'],
            'consumedMaterials' => decodeJsonValue($row['consumed_materials']),
        ];
    }
    $stmt->close();

    $stmt = $conn->prepare('SELECT * FROM tbl_clinical_images WHERE patient_id = ? ORDER BY image_date DESC, image_id DESC');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $images = $stmt->get_result();
    while ($row = $images->fetch_assoc()) {
        $patient['clinicalImages'][] = [
            'imageId' => $row['image_id'],
            'title' => $row['title'],
            'description' => $row['description'],
            'beforeImageData' => $row['before_image'],
            'afterImageData' => $row['after_image'],
            'date' => $row['image_date'],
        ];
    }
    $stmt->close();

    $stmt = $conn->prepare('SELECT * FROM tbl_dental_chart WHERE patient_id = ? ORDER BY recorded_at DESC, dental_chart_id DESC');
    $stmt->bind_param('s', $patientId);
    $stmt->execute();
    $chart = $stmt->get_result();
    while ($row = $chart->fetch_assoc()) {
        $toothNumber = (string) $row['tooth_number'];
        $patient['dentalChart']['teeth'][$toothNumber]['procedure'] = $row['procedure_name'];
        $patient['dentalChart']['teeth'][$toothNumber]['note'] = $row['notes'];
        $patient['dentalChart']['teeth'][$toothNumber]['updatedAt'] = $row['recorded_at'];
    }
    $stmt->close();
    return $patient;
}

if ($method === 'GET') {
    if ($role === 'user') {
        $requestedPatientId = 'PN-' . str_pad((string) $userId, 4, '0', STR_PAD_LEFT);
    }
    if ($requestedPatientId === '') {
        $result = $conn->query('SELECT patient_id FROM tbl_patients WHERE status = "active" ORDER BY last_name, first_name');
        $records = [];
        while ($row = $result->fetch_assoc()) {
            $record = patientPayload($conn, $row['patient_id']);
            if ($record) {
                $records[] = $record;
            }
        }
        jsonResponse(true, 'Patients loaded.', $records);
    }
    ensurePatient($conn, $requestedPatientId, $userId, $role);
    assertAccess($conn, $requestedPatientId, $userId, $role);
    jsonResponse(true, 'Patient record loaded.', patientPayload($conn, $requestedPatientId));
}

if ($method !== 'POST') {
    jsonResponse(false, 'Unsupported request method.', null, 405);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    $input = $_POST;
}
$patientId = trim((string) ($input['patientId'] ?? $requestedPatientId));
if ($role === 'user') {
    $patientId = 'PN-' . str_pad((string) $userId, 4, '0', STR_PAD_LEFT);
} elseif ($patientId === '') {
    $patientId = generateWalkInPatientId($conn);
} elseif (!patientRecordExists($conn, $patientId)) {
    $patientId = generateWalkInPatientId($conn);
}
ensurePatient($conn, $patientId, $userId, $role);
assertAccess($conn, $patientId, $userId, $role);
$patient = $input['patient'] ?? $input;
$medical = $input['medicalForm'] ?? null;
$conn->begin_transaction();
try {
    if (is_array($patient)) {
        $firstName = trim((string) ($patient['firstName'] ?? $patient['firstname'] ?? ''));
        $lastName = trim((string) ($patient['lastName'] ?? $patient['lastname'] ?? ''));
        $dateOfBirth = (string) ($patient['dateOfBirth'] ?? '');
        $gender = (string) ($patient['gender'] ?? $patient['patientGender'] ?? '');
        $phone = (string) ($patient['phone'] ?? '');
        $email = (string) ($patient['email'] ?? '');
        $address = (string) ($patient['address'] ?? '');
        $emergencyName = (string) ($patient['emergencyName'] ?? '');
        $emergencyContact = (string) ($patient['emergencyContact'] ?? '');
        $patientType = $role === 'user' ? 'registered' : 'walk_in';
        $stmt = $conn->prepare('INSERT IGNORE INTO tbl_patients (patient_id, first_name, last_name, date_of_birth, gender, phone, email, address, emergency_name, emergency_contact, patient_type, created_by) VALUES (?, ?, ?, NULLIF(?, ""), ?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->bind_param('sssssssssssi', $patientId, $firstName, $lastName, $dateOfBirth, $gender, $phone, $email, $address, $emergencyName, $emergencyContact, $patientType, $userId);
        $stmt->execute();
        $stmt->close();
    }
    if (is_array($patient)) {
        $stmt = $conn->prepare('UPDATE tbl_patients SET first_name = COALESCE(NULLIF(?, ""), first_name), last_name = COALESCE(NULLIF(?, ""), last_name), date_of_birth = COALESCE(NULLIF(?, ""), date_of_birth), gender = COALESCE(NULLIF(?, ""), gender), phone = COALESCE(NULLIF(?, ""), phone), email = COALESCE(NULLIF(?, ""), email), address = COALESCE(NULLIF(?, ""), address), emergency_name = COALESCE(NULLIF(?, ""), emergency_name), emergency_contact = COALESCE(NULLIF(?, ""), emergency_contact), updated_at = NOW() WHERE patient_id = ?');
        $stmt->bind_param('ssssssssss', $firstName, $lastName, $dateOfBirth, $gender, $phone, $email, $address, $emergencyName, $emergencyContact, $patientId);
        $stmt->execute();
        $stmt->close();
    }
    if (is_array($medical)) {
        $stmt = $conn->prepare('INSERT INTO tbl_medical_forms (patient_id, dental_concern, dental_concern_other, negative_experience, negative_experience_note, last_dental_visit, last_dental_treatment, current_medications, current_medications_list, medical_history, medical_other, allergies, allergy_other, consent, completed, submitted_by) VALUES (?, ?, ?, ?, ?, NULLIF(?, ""), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE dental_concern = VALUES(dental_concern), dental_concern_other = VALUES(dental_concern_other), negative_experience = VALUES(negative_experience), negative_experience_note = VALUES(negative_experience_note), last_dental_visit = VALUES(last_dental_visit), last_dental_treatment = VALUES(last_dental_treatment), current_medications = VALUES(current_medications), current_medications_list = VALUES(current_medications_list), medical_history = VALUES(medical_history), medical_other = VALUES(medical_other), allergies = VALUES(allergies), allergy_other = VALUES(allergy_other), consent = VALUES(consent), completed = VALUES(completed), submitted_by = VALUES(submitted_by), updated_at = NOW()');
        $dentalConcern = json_encode($medical['dentalConcern'] ?? []);
        $dentalConcernOther = (string) ($medical['dentalConcernOther'] ?? '');
        $negativeExperience = (string) ($medical['negativeExperience'] ?? 'No');
        $negativeExperienceNote = (string) ($medical['negativeExperienceNote'] ?? '');
        $lastVisit = (string) ($medical['medLastVisit'] ?? '');
        $lastTreatment = (string) ($medical['medLastTreatment'] ?? '');
        $currentMedications = (string) ($medical['currentMedications'] ?? 'No');
        $medicationList = (string) ($medical['currentMedicationsList'] ?? '');
        $medicalHistory = json_encode($medical['medicalHistory'] ?? []);
        $medicalOther = (string) ($medical['medicalOther'] ?? '');
        $allergies = json_encode($medical['allergies'] ?? []);
        $allergyOther = (string) ($medical['allergyOther'] ?? '');
        $consent = !empty($medical['consent']) ? 1 : 0;
        $completed = !empty($medical['completed']) ? 1 : 0;
        $stmt->bind_param('sssssssssssssiii', $patientId, $dentalConcern, $dentalConcernOther, $negativeExperience, $negativeExperienceNote, $lastVisit, $lastTreatment, $currentMedications, $medicationList, $medicalHistory, $medicalOther, $allergies, $allergyOther, $consent, $completed, $userId);
        $stmt->execute();
        $stmt->close();
    }

    if ($role === 'doctor' && is_array($patient)) {
        if (array_key_exists('appointments', $patient)) {
            $conn->query("DELETE FROM tbl_patient_appointments WHERE patient_id = '" . $conn->real_escape_string($patientId) . "'");
            $stmt = $conn->prepare('INSERT INTO tbl_patient_appointments (patient_id, appointment_date, appointment_time, status, reason, notes) VALUES (?, NULLIF(?, ""), NULLIF(?, ""), ?, ?, ?)');
            foreach (is_array($patient['appointments']) ? $patient['appointments'] : [] as $appointment) {
                $appointmentDate = (string) ($appointment['appointment_date'] ?? $appointment['date'] ?? '');
                $appointmentTime = (string) ($appointment['appointment_time'] ?? $appointment['start'] ?? '');
                $appointmentStatus = (string) ($appointment['status'] ?? 'pending');
                $appointmentReason = (string) ($appointment['reason'] ?? $appointment['purpose'] ?? '');
                $appointmentNotes = (string) ($appointment['notes'] ?? $appointment['note'] ?? '');
                $stmt->bind_param('ssssss', $patientId, $appointmentDate, $appointmentTime, $appointmentStatus, $appointmentReason, $appointmentNotes);
                $stmt->execute();
            }
            $stmt->close();
        }

        if (array_key_exists('treatments', $patient)) {
            $conn->query("DELETE FROM tbl_patient_treatments WHERE patient_id = '" . $conn->real_escape_string($patientId) . "'");
            $stmt = $conn->prepare('INSERT INTO tbl_patient_treatments (patient_id, tooth_number, procedure_name, treatment_date, notes, consumed_materials) VALUES (?, ?, ?, NULLIF(?, ""), ?, ?)');
            foreach (is_array($patient['treatments']) ? $patient['treatments'] : [] as $treatment) {
                $toothNumber = (string) ($treatment['toothNumber'] ?? $treatment['tooth'] ?? '');
                $procedureName = (string) ($treatment['procedure'] ?? $treatment['treatment'] ?? 'Dental Treatment');
                $treatmentDate = (string) ($treatment['date'] ?? $treatment['createdAt'] ?? '');
                $treatmentNotes = (string) ($treatment['note'] ?? $treatment['notes'] ?? '');
                $consumedMaterials = json_encode($treatment['consumedMaterials'] ?? []);
                $stmt->bind_param('ssssss', $patientId, $toothNumber, $procedureName, $treatmentDate, $treatmentNotes, $consumedMaterials);
                $stmt->execute();
            }
            $stmt->close();
        }

        if (array_key_exists('clinicalImages', $patient)) {
            $conn->query("DELETE FROM tbl_clinical_images WHERE patient_id = '" . $conn->real_escape_string($patientId) . "'");
            $stmt = $conn->prepare('INSERT INTO tbl_clinical_images (patient_id, title, description, before_image, after_image, image_date) VALUES (?, ?, ?, ?, ?, NULLIF(?, ""))');
            foreach (is_array($patient['clinicalImages']) ? $patient['clinicalImages'] : [] as $image) {
                $imageTitle = (string) ($image['title'] ?? 'Clinical Image');
                $imageDescription = (string) ($image['description'] ?? '');
                $beforeImage = (string) ($image['beforeImageData'] ?? $image['beforeImage'] ?? '');
                $afterImage = (string) ($image['afterImageData'] ?? $image['afterImage'] ?? '');
                $imageDate = (string) ($image['date'] ?? $image['createdAt'] ?? '');
                $stmt->bind_param('ssssss', $patientId, $imageTitle, $imageDescription, $beforeImage, $afterImage, $imageDate);
                $stmt->execute();
            }
            $stmt->close();
        }

        if (isset($patient['dentalChart']['teeth']) && is_array($patient['dentalChart']['teeth'])) {
            $conn->query("DELETE FROM tbl_dental_chart WHERE patient_id = '" . $conn->real_escape_string($patientId) . "'");
            $stmt = $conn->prepare('INSERT INTO tbl_dental_chart (patient_id, tooth_number, procedure_name, notes, recorded_at) VALUES (?, ?, ?, ?, COALESCE(NULLIF(?, ""), NOW()))');
            foreach ($patient['dentalChart']['teeth'] as $toothNumber => $tooth) {
                if (!is_array($tooth)) {
                    continue;
                }
                $procedureName = (string) ($tooth['procedure'] ?? '');
                $toothNotes = (string) ($tooth['note'] ?? $tooth['notes'] ?? '');
                if ($procedureName === '' && $toothNotes === '') {
                    continue;
                }
                $recordedAt = (string) ($tooth['updatedAt'] ?? '');
                $toothNumber = (string) $toothNumber;
                $stmt->bind_param('sssss', $patientId, $toothNumber, $procedureName, $toothNotes, $recordedAt);
                $stmt->execute();
            }
            $stmt->close();
        }
    }
    $conn->commit();
} catch (Throwable $exception) {
    $conn->rollback();
    jsonResponse(false, 'Unable to save patient record.', null, 500);
}
jsonResponse(true, 'Patient record saved.', patientPayload($conn, $patientId));
