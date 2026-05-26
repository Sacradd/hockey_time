<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/push.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$vapid = push_vapid_config();

if ($vapid === null) {
    api_json_response([
        'ok' => false,
        'push' => false,
        'error' => 'Push не настроен (vapid в config.local.php)',
    ]);
}

api_json_response([
    'ok' => true,
    'push' => true,
    'public_key' => $vapid['public_key'],
]);

