<?php
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\PHPMailer;
require_once __DIR__ . "/../vendor/autoload.php";
function sendClinicEmail($toEmail, $toName, $subject, $message) {
    $config = require __DIR__ . "/mail_config.php";
    $mail = new PHPMailer(true);
    try {
        $mail->isSMTP();
        $mail->Host = "smtp.gmail.com";
        $mail->SMTPAuth = true;
        $mail->Username = $config["username"];
        $mail->Password = $config["password"];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;
        $mail->CharSet = "UTF-8";
        $mail->setFrom($config["username"], "DentaNueva Dental Clinic");
        $mail->addAddress($toEmail, $toName);
        $mail->Subject = $subject;
        $mail->Body = $message;
        $mail->isHTML(false);
        $mail->send();
        return [
            "success" => true,
            "message" => "Email sent successfully."
        ];
    } catch (Exception $e) {
        return [
            "success" => false,
            "message" => $mail->ErrorInfo
        ];
    }
}