<?php
function sendClinicSMS($toNumber, $message)
{
    $config = require __DIR__ . "/skysms_config.php";
    $apiKey = trim((string) ($config["api_key"] ?? ""));
    $toNumber = trim((string) $toNumber);
    $message = trim((string) $message);
    if ($apiKey === "") {
        return [
            "success" => false,
            "message" => "SkySMS API key is not configured."
        ];
    }
    if ($toNumber === "") {
        return [
            "success" => false,
            "message" => "Patient phone number is required."
        ];
    }
    if ($message === "") {
        return [
            "success" => false,
            "message" => "SMS message is empty."
        ];
    }
    if (strlen($message) > 160) {
        return [
            "success" => false,
            "message" => "SMS message must not exceed 160 characters."
        ];
    }
    if (!preg_match('/^\+639\d{9}$/', $toNumber)) {
        return [
            "success" => false,
            "message" => "Patient phone number must use +639XXXXXXXXX format."
        ];
    }
    $payload = [
        "phone_number" => $toNumber,
        "message" => $message
    ];
    $ch = curl_init("https://skysms.skyio.site/api/v1/sms/send");
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "X-API-Key: " . $apiKey,
        "Content-Type: application/json",
        "Accept: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload, JSON_UNESCAPED_UNICODE));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $response = curl_exec($ch);
    $curlError = curl_error($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($response === false) {
        return [
            "success" => false,
            "message" => $curlError !== "" ? $curlError : "SkySMS request failed."
        ];
    }
    $data = json_decode($response, true);
    if ($httpCode < 200 || $httpCode >= 300) {
        $errorMessage = "SkySMS API request failed.";
        if (is_array($data)) {
            if (isset($data["message"]) && is_string($data["message"])) {
                $errorMessage = $data["message"];
            } elseif (isset($data["error"]) && is_string($data["error"])) {
                $errorMessage = $data["error"];
            }
        }
        return [
            "success" => false,
            "message" => $errorMessage,
            "response" => $data
        ];
    }
    return [
        "success" => true,
        "message" => "SMS queued successfully.",
        "response" => $data
    ];
}