<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'ok' => true,
    'php' => PHP_VERSION,
    'pdo_mysql' => extension_loaded('pdo_mysql'),
], JSON_UNESCAPED_UNICODE);
