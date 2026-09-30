<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
require_once __DIR__ . '/../xendit_config.php';
if (!defined('XENDIT_SECRET_KEY')) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'stage' => 'config',
        'message' => 'XENDIT_SECRET_KEY constant was not loaded.'
    ]);
    exit;
}
$secretKey = trim((string) XENDIT_SECRET_KEY);
if ($secretKey === '') {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'stage' => 'config',
        'message' => 'Xendit Secret API Key is empty.',
        'key_length' => 0
    ]);
    exit;
}
$referenceId = 'DENTANUEVA-TEST-' . date('YmdHis');
$payload = [
    'reference_id' => $referenceId,
    'type' => 'PAY',
    'country' => 'PH',
    'currency' => 'PHP',
    'request_amount' => 100,
    'capture_method' => 'AUTOMATIC',
    'channel_code' => 'GCASH',
    'channel_properties' => [
        'failure_return_url' => 'http://localhost/DENTAL_CLINIC/',
        'success_return_url' => 'http://localhost/DENTAL_CLINIC/'
    ],
    'description' => 'DentaNueva Xendit Test Payment',
    'metadata' => [
        'source' => 'DentaNueva',
        'environment' => 'test'
    ]
];
$ch = curl_init(XENDIT_API_BASE_URL . '/v3/payment_requests');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_USERPWD => $secretKey . ':',
CURLOPT_HTTPHEADER => [
    'Content-Type: application/json',
    'Accept: application/json',
    'api-version: 2024-11-11'
],
    CURLOPT_TIMEOUT => 30
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);
if ($response === false || $curlError !== '') {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'stage' => 'connection',
        'message' => 'Failed to connect to Xendit.',
        'error' => $curlError
    ]);
    exit;
}
$data = json_decode($response, true);
if (!is_array($data)) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'stage' => 'response',
        'message' => 'Xendit returned an invalid response.',
        'http_code' => $httpCode,
        'raw_response' => $response
    ]);
    exit;
}
if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'stage' => 'xendit',
        'message' => 'Xendit rejected the payment request.',
        'http_code' => $httpCode,
        'xendit_response' => $data
    ]);
    exit;
}
echo json_encode([
    'success' => true,
    'stage' => 'xendit',
    'message' => 'Xendit payment request created successfully.',
    'payment_request_id' => $data['payment_request_id'] ?? null,
    'status' => $data['status'] ?? null,
    'reference_id' => $data['reference_id'] ?? null,
    'channel_code' => $data['channel_code'] ?? null,
    'request_amount' => $data['request_amount'] ?? null,
    'actions' => $data['actions'] ?? []
]);