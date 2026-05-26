<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

try {
    $pdo = api_db();
    $hasUsers = db_table_exists($pdo, 'users');
    $usersCount = 0;
    if ($hasUsers) {
        $usersCount = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    }

    api_json_response([
        'ok' => true,
        'db' => true,
        'users_table' => $hasUsers,
        'users_count' => $usersCount,
        'hint' => $usersCount === 0
            ? 'Запустите install.php?secret=... или проверьте seed.json'
            : null,
    ]);
} catch (Throwable $e) {
    if (api_is_debug()) {
        api_json_response([
            'ok' => false,
            'db' => false,
            'error' => $e->getMessage(),
        ], 500);
    }
    api_json_response([
        'ok' => false,
        'db' => false,
        'error' => 'Не удалось подключиться к MySQL — проверьте api/config.local.php',
    ], 500);
}
