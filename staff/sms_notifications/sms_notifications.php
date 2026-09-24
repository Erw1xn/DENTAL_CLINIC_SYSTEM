<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__.'/../../php/db_connect.php';
require_once __DIR__.'/../../php/mailer.php';

function smsResponse(bool $success, string $message = '', $data = null, int $status = 200): void {
    http_response_code($status);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'notifications' => $data
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($_SESSION['logged_in'])) {
    smsResponse(false, 'Authentication required.', null, 401);
}

$role = strtolower(trim((string)($_SESSION['role'] ?? '')));

if (!in_array($role, ['staff', 'doctor'], true)) {
    smsResponse(false, 'Access denied.', null, 403);
}

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

function mapRow(array $r): array {
    return [
        'id' => $r['external_id'] ?: ('SMS-' . $r['notification_id']),
        'notificationId' => (int)$r['notification_id'],
        'appointmentId' => $r['appointment_id'],
        'patientId' => $r['patient_id'],
        'patientName' => trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? '')),
        'phone' => $r['phone'] ?? '',
        'email' => $r['email'] ?: $r['recipient'],
        'message' => $r['message'],
        'type' => $r['notification_type'],
        'appointmentType' => $r['notification_type'],
        'appointmentDate' => $r['appointment_date'],
        'appointmentTime' => $r['appointment_time'],
        'status' => $r['status'],
        'deliveryStatus' => $r['status'],
        'createdAt' => $r['created_at'],
        'sentAt' => $r['sent_at'],
        'failedAt' => $r['failed_at'],
        'failureReason' => $r['failure_reason'],
        'source' => $r['source'],
        'scheduledFor' => $r['scheduled_for'],
        'isScheduledReminder' => in_array(
            $r['notification_type'],
            ['Appointment Reminder', 'Same-Day Reminder'],
            true
        )
    ];
}

if ($action === 'fetch') {

    $sql = "SELECT n.*, p.first_name, p.last_name, p.phone, p.email
            FROM tbl_notifications n
            LEFT JOIN tbl_patients p
            ON p.patient_id = n.patient_id
            ORDER BY n.created_at DESC";

    $result = $conn->query($sql);

    $rows = [];

    while ($row = $result->fetch_assoc()) {
        $rows[] = mapRow($row);
    }

    smsResponse(true, 'Notifications loaded.', $rows);
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    $input = $_POST;
}

if ($action === 'save') {

    $notifications = is_array($input['notifications'] ?? null)
        ? $input['notifications']
        : [];

    foreach ($notifications as $n) {

        if (!is_array($n)) {
            continue;
        }

        $externalId = trim((string)($n['id'] ?? ''));

        if ($externalId === '') {
            continue;
        }

        $patientId = trim((string)($n['patientId'] ?? ''));

        $appointmentIdRaw = (string)($n['appointmentId'] ?? '');
        $appointmentId = ctype_digit($appointmentIdRaw)
            ? (int)$appointmentIdRaw
            : null;

        $type = (string)($n['type'] ?? '');

        $recipient = (string)($n['email'] ?? $n['phone'] ?? '');

        $subject = (string)($n['subject'] ?? ($type . ' - DentaNueva Dental Clinic'));

        $message = (string)($n['message'] ?? '');

        $appointmentDate = (string)($n['appointmentDate'] ?? '');

        $appointmentTime = (string)($n['appointmentTime'] ?? '');

        $source = (string)($n['source'] ?? 'appointment');

        $scheduledFor = (string)($n['scheduledFor'] ?? '');

        $status = (string)($n['status'] ?? 'Pending');

        $stmt = $conn->prepare("
            INSERT INTO tbl_notifications (
                external_id,
                patient_id,
                appointment_id,
                notification_type,
                channel,
                recipient,
                subject,
                message,
                appointment_date,
                appointment_time,
                source,
                scheduled_for,
                status
            )
            VALUES (
                ?, ?, ?, ?, 'Email', ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, NULLIF(?, ''), ?
            )
            ON DUPLICATE KEY UPDATE
                patient_id = VALUES(patient_id),
                appointment_id = VALUES(appointment_id),
                notification_type = VALUES(notification_type),
                recipient = VALUES(recipient),
                subject = VALUES(subject),
                message = VALUES(message),
                appointment_date = VALUES(appointment_date),
                appointment_time = VALUES(appointment_time),
                source = VALUES(source),
                scheduled_for = VALUES(scheduled_for),
                status = VALUES(status)
        ");

        $stmt->bind_param(
            'ssisssssssss',
            $externalId,
            $patientId,
            $appointmentId,
            $type,
            $recipient,
            $subject,
            $message,
            $appointmentDate,
            $appointmentTime,
            $source,
            $scheduledFor,
            $status
        );

        $stmt->execute();
        $stmt->close();
    }

    smsResponse(true, 'Notifications saved.');
}

if ($action === 'send') {

    $externalId = trim((string)($input['id'] ?? ''));

    if ($externalId === '') {
        smsResponse(false, 'Notification id is required.', null, 422);
    }

    $stmt = $conn->prepare("
        SELECT n.*, p.email
        FROM tbl_notifications n
        LEFT JOIN tbl_patients p
        ON p.patient_id = n.patient_id
        WHERE n.external_id = ?
        LIMIT 1
    ");

    $stmt->bind_param('s', $externalId);
    $stmt->execute();

    $row = $stmt->get_result()->fetch_assoc();

    $stmt->close();

    if (!$row) {
        smsResponse(false, 'Notification not found.', null, 404);
    }

    $recipient = $row['email'] ?: $row['recipient'];

    if (!$recipient) {

        $stmt = $conn->prepare("
            UPDATE tbl_notifications
            SET
                status = 'Failed',
                failed_at = NOW(),
                failure_reason = 'No email is available.'
            WHERE external_id = ?
        ");

        $stmt->bind_param('s', $externalId);
        $stmt->execute();
        $stmt->close();

        smsResponse(false, 'No email is available.', null, 422);
    }

    try {

        sendAppointmentEmail(
            $recipient,
            $row['subject'] ?: $row['notification_type'],
            $row['message']
        );

        $stmt = $conn->prepare("
            UPDATE tbl_notifications
            SET
                status = 'Sent',
                sent_at = NOW(),
                failed_at = NULL,
                failure_reason = NULL
            WHERE external_id = ?
        ");

        $stmt->bind_param('s', $externalId);
        $stmt->execute();
        $stmt->close();

        smsResponse(true, 'Email sent.');

    } catch (Throwable $e) {

        $reason = $e->getMessage();

        $stmt = $conn->prepare("
            UPDATE tbl_notifications
            SET
                status = 'Failed',
                failed_at = NOW(),
                failure_reason = ?
            WHERE external_id = ?
        ");

        $stmt->bind_param('ss', $reason, $externalId);
        $stmt->execute();
        $stmt->close();

        smsResponse(false, $reason, null, 500);
    }
}

if ($action === 'delete') {

    $externalId = trim((string)($input['id'] ?? ''));

    if ($externalId === '') {
        smsResponse(false, 'Notification id is required.', null, 422);
    }

    $stmt = $conn->prepare("
        DELETE FROM tbl_notifications
        WHERE external_id = ?
    ");

    $stmt->bind_param('s', $externalId);
    $stmt->execute();
    $stmt->close();

    smsResponse(true, 'Notification deleted.');
}

smsResponse(false, 'Unsupported action.', null, 400);