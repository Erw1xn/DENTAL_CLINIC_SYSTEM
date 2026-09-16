<?php
session_start();
header("Content-Type: application/json; charset=UTF-8");
require_once "../../php/db_connect.php";
function response($success, $message, $user = null) {
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "user" => $user
    ]);
    exit;
}
if (!isset($_SESSION["logged_in"]) || $_SESSION["logged_in"] !== true || !isset($_SESSION["user_id"])) {
    http_response_code(401);
    response(false, "Unauthorized.");
}
$userId = (int) $_SESSION["user_id"];
if ($userId <= 0) {
    http_response_code(401);
    response(false, "Invalid user session.");
}
if ($_SERVER["REQUEST_METHOD"] === "POST" && ($_POST["action"] ?? "") === "update_profile") {
    $contact = trim((string)($_POST["contact"] ?? ""));
    $specialization = trim((string)($_POST["specialization"] ?? ""));
    if ($specialization === "") {
        http_response_code(422);
        response(false, "Specialization is required.");
    }
    if (!preg_match("/^09\\d{9}$/", $contact)) {
        http_response_code(422);
        response(false, "Use a valid 11-digit contact number starting with 09.");
    }
    $updateStmt = $conn->prepare("
        UPDATE tbl_users
        SET contact = ?, specialization = ?
        WHERE user_id = ?
        AND role = 'doctor'
        LIMIT 1
    ");
    if (!$updateStmt) {
        http_response_code(500);
        response(false, "Database error while saving your profile.");
    }
    $updateStmt->bind_param("ssi", $contact, $specialization, $userId);
    if (!$updateStmt->execute()) {
        $updateStmt->close();
        http_response_code(500);
        response(false, "Unable to save your profile.");
    }
    $updateStmt->close();
}
$stmt = $conn->prepare("
    SELECT
        user_id,
        firstname,
        lastname,
        name,
        email,
        role,
        doctor_id,
        specialization,
        access_level,
        status,
        profile_image,
        contact
    FROM tbl_users
    WHERE user_id = ?
    AND role = 'doctor'
    LIMIT 1
");
if (!$stmt) {
    http_response_code(500);
    response(false, "Database error while loading your profile.");
}
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();
if (!$result || $result->num_rows === 0) {
    $stmt->close();
    $conn->close();
    http_response_code(403);
    response(false, "Doctor access required.");
}
$doctor = $result->fetch_assoc();
$stmt->close();
$doctorId = trim((string)($doctor["doctor_id"] ?? ""));
if ($doctorId === "") {
    $nextId = 1;
    $idStmt = $conn->prepare("
        SELECT MAX(CAST(SUBSTRING(doctor_id, 5) AS UNSIGNED)) AS max_doctor_number
        FROM tbl_users
        WHERE role = 'doctor'
        AND doctor_id REGEXP '^DOC-[0-9]{4}$'
    ");
    if (!$idStmt) {
        $conn->close();
        http_response_code(500);
        response(false, "Database error while generating your Doctor ID.");
    }
    $idStmt->execute();
    $idResult = $idStmt->get_result();
    if ($idResult && $idResult->num_rows > 0) {
        $idRow = $idResult->fetch_assoc();
        $maxNumber = (int)($idRow["max_doctor_number"] ?? 0);
        $nextId = $maxNumber + 1;
    }
    $idStmt->close();
    $doctorId = "DOC-" . str_pad((string)$nextId, 4, "0", STR_PAD_LEFT);
    $updateIdStmt = $conn->prepare("
        UPDATE tbl_users
        SET doctor_id = ?
        WHERE user_id = ?
        AND role = 'doctor'
        AND (doctor_id IS NULL OR doctor_id = '')
    ");
    if (!$updateIdStmt) {
        $conn->close();
        http_response_code(500);
        response(false, "Database error while saving your Doctor ID.");
    }
    $updateIdStmt->bind_param("si", $doctorId, $userId);
    if (!$updateIdStmt->execute()) {
        $updateIdStmt->close();
        $conn->close();
        http_response_code(500);
        response(false, "Unable to save your Doctor ID.");
    }
    $updateIdStmt->close();
    if ($conn->affected_rows === 0) {
        $verifyStmt = $conn->prepare("
            SELECT doctor_id
            FROM tbl_users
            WHERE user_id = ?
            AND role = 'doctor'
            LIMIT 1
        ");
        if ($verifyStmt) {
            $verifyStmt->bind_param("i", $userId);
            $verifyStmt->execute();
            $verifyResult = $verifyStmt->get_result();
            if ($verifyResult && $verifyResult->num_rows > 0) {
                $verifyRow = $verifyResult->fetch_assoc();
                if (!empty($verifyRow["doctor_id"])) {
                    $doctorId = $verifyRow["doctor_id"];
                }
            }
            $verifyStmt->close();
        }
    }
    $doctor["doctor_id"] = $doctorId;
}
$doctor["doctor_id"] = $doctorId;
$_SESSION["doctor_id"] = $doctorId;
$_SESSION["specialization"] = $doctor["specialization"] ?? "";
$conn->close();
response(true, "Doctor profile loaded successfully.", $doctor);
?>