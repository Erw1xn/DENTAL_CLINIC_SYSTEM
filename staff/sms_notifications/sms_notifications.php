<?php
header("Content-Type: application/json; charset=UTF-8");
require_once "../../php/db_connect.php";
require_once "../../php/mailer.php";
require_once "../../php/sms_sender.php";
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $action = $_GET["action"] ?? "";
    if ($action === "fetch") {
        fetchNotifications($conn);
    }
    respond(false, "Invalid action.");
}
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = $_GET["action"] ?? "";
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        respond(false, "Invalid request data.");
    }
    if ($action === "save") {
        saveNotifications($conn, $input);
    }
    if ($action === "send") {
        sendNotification($conn, $input);
    }
    if ($action === "delete") {
        deleteNotification($conn, $input);
    }
    respond(false, "Invalid action.");
}
respond(false, "Unsupported request method.");
function respond($success, $message = "", $data = null) {
    $response = ["success" => $success];
    if ($message !== "") {
        $response["message"] = $message;
    }
    if ($data !== null) {
        $response["data"] = $data;
    }
    echo json_encode($response);
    exit;
}
function fetchNotifications($conn) {
    $sql = "SELECT n.notification_id,n.notification_uid,n.appointment_id,n.patient_id,n.doctor_id,n.channel,n.notification_type,n.patient_email,n.patient_phone,n.subject,n.message,n.appointment_date,n.appointment_start_time,n.appointment_end_time,n.duration_minutes,n.scheduled_at,n.status,n.sent_at,n.failed_at,n.failure_reason,n.created_at,n.updated_at,CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')) AS patient_name,u.name AS doctor_name,a.service_type AS service_type,a.status AS appointment_status FROM tbl_notifications n LEFT JOIN tbl_patients p ON p.patient_id=n.patient_id LEFT JOIN tbl_users u ON u.user_id=n.doctor_id LEFT JOIN tbl_patient_appointments a ON a.appointment_id=n.appointment_id ORDER BY n.created_at DESC,n.notification_id DESC";
    $result = $conn->query($sql);
    if (!$result) {
        respond(false, "Failed to fetch notifications: " . $conn->error);
    }
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $appointmentId = $row["appointment_id"] !== null ? (int)$row["appointment_id"] : null;
        $duration = $row["duration_minutes"] !== null ? (int)$row["duration_minutes"] : null;
        $notification = [
            "id" => $row["notification_uid"],
            "appointmentId" => $appointmentId,
            "patientId" => $row["patient_id"],
            "patientName" => trim($row["patient_name"] ?? ""),
            "phone" => $row["patient_phone"] ?? "",
            "email" => $row["patient_email"] ?? "",
            "channel" => strtolower($row["channel"] ?? "email"),
            "doctorId" => $row["doctor_id"] !== null ? (int)$row["doctor_id"] : null,
            "doctorName" => $row["doctor_name"] ?? "",
            "service" => $row["service_type"] ?? "",
            "duration" => $duration,
            "appointmentEndTime" => $row["appointment_end_time"] ?? "",
            "subject" => $row["subject"] ?? "",
            "message" => $row["message"] ?? "",
            "type" => $row["notification_type"],
            "appointmentType" => $row["notification_type"],
            "appointmentDate" => $row["appointment_date"] ?? "",
            "appointmentTime" => $row["appointment_start_time"] ?? "",
            "status" => $row["status"],
            "deliveryStatus" => $row["status"],
            "createdAt" => $row["created_at"],
            "sentAt" => $row["sent_at"],
            "failedAt" => $row["failed_at"],
            "failureReason" => $row["failure_reason"],
            "source" => "appointment",
            "scheduledFor" => $row["scheduled_at"],
            "isScheduledReminder" => in_array($row["notification_type"], ["Appointment Reminder", "Same-Day Reminder"], true),
            "appointmentSnapshot" => [
                "date" => $row["appointment_date"] ?? "",
                "time" => $row["appointment_start_time"] ?? "",
                "status" => normalizeAppointmentStatus($row["appointment_status"] ?? "")
            ]
        ];
        $notifications[] = $notification;
    }
    respond(true, "", $notifications);
}
function saveNotifications($conn, $input) {
    $notifications = $input["notifications"] ?? [];
    if (!is_array($notifications)) {
        respond(false, "Notifications must be an array.");
    }
    $sql = "INSERT INTO tbl_notifications (notification_uid,appointment_id,patient_id,doctor_id,channel,notification_type,patient_email,patient_phone,subject,message,appointment_date,appointment_start_time,appointment_end_time,duration_minutes,scheduled_at,status,sent_at,failed_at,failure_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE appointment_id=VALUES(appointment_id),patient_id=VALUES(patient_id),doctor_id=VALUES(doctor_id),channel=VALUES(channel),notification_type=VALUES(notification_type),patient_email=VALUES(patient_email),patient_phone=VALUES(patient_phone),subject=VALUES(subject),message=VALUES(message),appointment_date=VALUES(appointment_date),appointment_start_time=VALUES(appointment_start_time),appointment_end_time=VALUES(appointment_end_time),duration_minutes=VALUES(duration_minutes),scheduled_at=VALUES(scheduled_at)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        respond(false, "Failed to prepare save query: " . $conn->error);
    }
    $saved = 0;
    foreach ($notifications as $notification) {
        if (!is_array($notification)) {
            continue;
        }
        $notificationUid = trim((string)($notification["id"] ?? $notification["notification_uid"] ?? ""));
        $appointmentId = resolveAppointmentId($conn, $notification["appointmentId"] ?? $notification["appointment_id"] ?? null);
        $patientId = trim((string)($notification["patientId"] ?? $notification["patient_id"] ?? ""));
        $doctorId = normalizeDoctorId($notification["doctorId"] ?? $notification["doctor_id"] ?? null);
        $channel = strtolower(trim((string)($notification["channel"] ?? "email")));
        $notificationType = trim((string)($notification["type"] ?? $notification["notificationType"] ?? $notification["notification_type"] ?? ""));
        $patientEmail = trim((string)($notification["email"] ?? $notification["patient_email"] ?? ""));
        $patientPhone = trim((string)($notification["phone"] ?? $notification["patient_phone"] ?? ""));
        $subject = trim((string)($notification["subject"] ?? ""));
        $message = trim((string)($notification["message"] ?? ""));
        $appointmentDate = normalizeDate($notification["appointmentDate"] ?? $notification["appointment_date"] ?? null);
        $appointmentStartTime = normalizeTime($notification["appointmentTime"] ?? $notification["appointment_time"] ?? $notification["startTime"] ?? $notification["appointment_start_time"] ?? null);
        $appointmentEndTime = normalizeTime($notification["appointmentEndTime"] ?? $notification["appointment_end_time"] ?? $notification["endTime"] ?? null);
        $duration = normalizeInteger($notification["duration"] ?? $notification["durationMinutes"] ?? $notification["duration_minutes"] ?? null);
        $scheduledAt = normalizeDateTime($notification["scheduledFor"] ?? $notification["scheduled_at"] ?? null);
        $status = normalizeStatus($notification["status"] ?? "Pending");
        $sentAt = normalizeDateTime($notification["sentAt"] ?? $notification["sent_at"] ?? null);
        $failedAt = normalizeDateTime($notification["failedAt"] ?? $notification["failed_at"] ?? null);
        $failureReason = trim((string)($notification["failureReason"] ?? $notification["failure_reason"] ?? ""));
        if ($notificationUid === "" || $patientId === "" || $notificationType === "" || $message === "") {
            continue;
        }
        if ($channel !== "email" && $channel !== "sms") {
            $channel = "email";
        }
        $stmt->bind_param("sisisssssssssisssss",$notificationUid,$appointmentId,$patientId,$doctorId,$channel,$notificationType,$patientEmail,$patientPhone,$subject,$message,$appointmentDate,$appointmentStartTime,$appointmentEndTime,$duration,$scheduledAt,$status,$sentAt,$failedAt,$failureReason);
        if ($stmt->execute()) {
            $saved++;
        }
    }
    $stmt->close();
    respond(true, "Notifications saved successfully.", ["saved" => $saved]);
}
function sendNotification($conn, $input) {
    $channel = strtolower(trim((string)($input["channel"] ?? "email")));
    if ($channel === "sms") {
        sendNotificationSMS($conn, $input);
        return;
    }
    sendNotificationEmail($conn, $input);
}
function claimNotificationForSending($conn, $notificationUid) {
    $sql = "UPDATE tbl_notifications SET status='Processing',updated_at=NOW() WHERE notification_uid=? AND status='Pending'";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ["claimed" => false, "status" => null, "error" => $conn->error];
    }
    $stmt->bind_param("s", $notificationUid);
    $stmt->execute();
    $claimed = $stmt->affected_rows === 1;
    $stmt->close();
    if ($claimed) {
        return ["claimed" => true, "status" => "Processing", "error" => null];
    }
    $sql = "SELECT status FROM tbl_notifications WHERE notification_uid=? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return ["claimed" => false, "status" => null, "error" => $conn->error];
    }
    $stmt->bind_param("s", $notificationUid);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return ["claimed" => false, "status" => $row["status"] ?? null, "error" => null];
}
function sendNotificationEmail($conn, $input) {
    $notificationId = trim((string)($input["id"] ?? ""));
    $email = trim((string)($input["email"] ?? ""));
    $name = trim((string)($input["name"] ?? ""));
    $subject = trim((string)($input["subject"] ?? ""));
    $message = trim((string)($input["message"] ?? ""));
    if ($notificationId === "") {
        respond(false, "Notification ID is required.");
    }
    if ($email === "" || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        markNotificationFailed($conn, $notificationId, "Invalid patient email address.");
        respond(false, "Invalid patient email address.");
    }
    if ($subject === "") {
        $subject = "DentaNueva Dental Clinic Notification";
    }
    if ($message === "") {
        markNotificationFailed($conn, $notificationId, "Notification message is empty.");
        respond(false, "Notification message is empty.");
    }
    $claim = claimNotificationForSending($conn, $notificationId);
    if (!$claim["claimed"]) {
        if ($claim["status"] === "Sent" || $claim["status"] === "Processing") {
            respond(true, "Notification is already processed or currently processing.", ["alreadyProcessed" => true, "status" => $claim["status"]]);
        }
        if ($claim["status"] === "Failed") {
            respond(false, "Notification has already failed. Retry it explicitly.");
        }
        respond(false, $claim["error"] ?? "Notification could not be locked for sending.");
    }
    if ($name === "") {
        $sql = "SELECT CONCAT(COALESCE(p.first_name,''),' ',COALESCE(p.last_name,'')) AS patient_name FROM tbl_notifications n LEFT JOIN tbl_patients p ON p.patient_id=n.patient_id WHERE n.notification_uid=? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $notificationId);
            $stmt->execute();
            $result = $stmt->get_result();
            $row = $result ? $result->fetch_assoc() : null;
            $name = trim($row["patient_name"] ?? "");
            $stmt->close();
        }
    }
    $result = sendClinicEmail($email, $name, $subject, $message);
    if ($result["success"]) {
        markNotificationSent($conn, $notificationId);
        respond(true, "Email sent successfully.");
    }
    $failureReason = $result["message"] ?? "Email delivery failed.";
    markNotificationFailed($conn, $notificationId, $failureReason);
    respond(false, $failureReason);
}
function sendNotificationSMS($conn, $input) {
    $notificationId = trim((string)($input["id"] ?? ""));
    $phone = trim((string)($input["phone"] ?? ""));
    $message = trim((string)($input["message"] ?? ""));
    if ($notificationId === "") {
        respond(false, "Notification ID is required.");
    }
    if ($phone === "") {
        markNotificationFailed($conn, $notificationId, "Patient phone number is required.");
        respond(false, "Patient phone number is required.");
    }
    if ($message === "") {
        markNotificationFailed($conn, $notificationId, "SMS message is empty.");
        respond(false, "SMS message is empty.");
    }
    $claim = claimNotificationForSending($conn, $notificationId);
    if (!$claim["claimed"]) {
        if ($claim["status"] === "Sent" || $claim["status"] === "Processing") {
            respond(true, "Notification is already processed or currently processing.", ["alreadyProcessed" => true, "status" => $claim["status"]]);
        }
        if ($claim["status"] === "Failed") {
            respond(false, "Notification has already failed. Retry it explicitly.");
        }
        respond(false, $claim["error"] ?? "Notification could not be locked for sending.");
    }
    $result = sendClinicSMS($phone, $message);
    if ($result["success"]) {
        markNotificationSent($conn, $notificationId);
        respond(true, "SMS request submitted successfully.", $result["response"] ?? null);
    }
    $failureReason = $result["message"] ?? "SMS delivery failed.";
    markNotificationFailed($conn, $notificationId, $failureReason);
    respond(false, $failureReason);
}
function markNotificationSent($conn, $notificationUid) {
    $sql = "UPDATE tbl_notifications SET status='Sent',sent_at=NOW(),failed_at=NULL,failure_reason=NULL WHERE notification_uid=?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return;
    }
    $stmt->bind_param("s", $notificationUid);
    $stmt->execute();
    $stmt->close();
}
function markNotificationFailed($conn, $notificationUid, $reason) {
    $sql = "UPDATE tbl_notifications SET status='Failed',failed_at=NOW(),failure_reason=? WHERE notification_uid=?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return;
    }
    $stmt->bind_param("ss", $reason, $notificationUid);
    $stmt->execute();
    $stmt->close();
}
function deleteNotification($conn, $input) {
    $notificationId = trim((string)($input["id"] ?? ""));
    if ($notificationId === "") {
        respond(false, "Notification ID is required.");
    }
    $sql = "DELETE FROM tbl_notifications WHERE notification_uid=?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        respond(false, "Failed to prepare delete query: " . $conn->error);
    }
    $stmt->bind_param("s", $notificationId);
    if (!$stmt->execute()) {
        $stmt->close();
        respond(false, "Failed to delete notification.");
    }
    $deleted = $stmt->affected_rows;
    $stmt->close();
    if ($deleted < 1) {
        respond(false, "Notification record was not found.");
    }
    respond(true, "Notification deleted successfully.");
}
function resolveAppointmentId($conn, $value) {
    if ($value === null || $value === "") {
        return null;
    }
    if (is_numeric($value)) {
        return (int)$value;
    }
    $value = trim((string)$value);
    $sql = "SELECT appointment_id FROM tbl_patient_appointments WHERE appointment_uid=? LIMIT 1";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return null;
    }
    $stmt->bind_param("s", $value);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();
    return $row ? (int)$row["appointment_id"] : null;
}
function normalizeInteger($value) {
    if ($value === null || $value === "" || !is_numeric($value)) {
        return null;
    }
    return (int)$value;
}
function normalizeDoctorId($value) {
    if ($value === null || $value === "") {
        return null;
    }
    if (is_numeric($value)) {
        return (int)$value;
    }
    $value = trim((string)$value);
    if (preg_match('/(\d+)$/', $value, $matches)) {
        return (int)$matches[1];
    }
    return null;
}
function normalizeDate($value) {
    if ($value === null || $value === "") {
        return null;
    }
    $timestamp = strtotime((string)$value);
    return $timestamp === false ? null : date("Y-m-d", $timestamp);
}
function normalizeTime($value) {
    if ($value === null || $value === "") {
        return null;
    }
    $value = trim((string)$value);
    if (preg_match('/^(\d{1,2}):(\d{2})(?::\d{2})?\s\*(AM|PM)$/i', $value, $matches)) {
        $hour = (int)$matches[1];
        $minute = (int)$matches[2];
        $period = strtoupper($matches[3]);
        if ($hour === 12) {
            $hour = 0;
        }
        if ($period === "PM") {
            $hour += 12;
        }
        return sprintf("%02d:%02d:%02d", $hour, $minute, 0);
    }
    if (preg_match('/^\d{1,2}:\d{2}(?::\d{2})?$/', $value)) {
        $parts = explode(":", $value);
        return sprintf("%02d:%02d:%02d", (int)$parts[0], (int)$parts[1], isset($parts[2]) ? (int)$parts[2] : 0);
    }
    return null;
}
function normalizeDateTime($value) {
    if ($value === null || $value === "") {
        return null;
    }
    $timestamp = strtotime((string)$value);
    return $timestamp === false ? null : date("Y-m-d H:i:s", $timestamp);
}
function normalizeStatus($value) {
    $value = trim((string)$value);
    return in_array($value, ["Sent", "Failed", "Pending", "Processing"], true) ? $value : "Pending";
}
function normalizeAppointmentStatus($value) {
    $value = strtolower(trim((string)$value));
    if (in_array($value, ["confirmed", "confirm", "scheduled", "schedule", "pending", "waiting"], true)) return "scheduled";
    if (in_array($value, ["cancelled", "canceled", "cancel"], true)) return "cancelled";
    if (in_array($value, ["completed", "complete", "done"], true)) return "completed";
    if (in_array($value, ["checked in", "checkedin", "check in"], true)) return "checkedin";
    if (in_array($value, ["in consultation", "inconsultation"], true)) return "in consultation";
    if (in_array($value, ["no show", "noshow"], true)) return "no-show";
    return $value;
}
?>