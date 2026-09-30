<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../xendit_config.php';
echo json_encode([
    'config_loaded' => defined('XENDIT_SECRET_KEY'),
    'key_is_empty' => !defined('XENDIT_SECRET_KEY') || trim(XENDIT_SECRET_KEY) === '',
    'key_length' => defined('XENDIT_SECRET_KEY') ? strlen(XENDIT_SECRET_KEY) : 0
]);