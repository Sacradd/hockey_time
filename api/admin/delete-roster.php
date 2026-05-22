<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $rosterId = (int) ($body['roster_id'] ?? 0);

    if ($rosterId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
    }

    api_require_roster_admin($rosterId);

    $pdo = api_db();
    $stmt = $pdo->prepare('SELECT id, title FROM rosters WHERE id = ? LIMIT 1');
    $stmt->execute([$rosterId]);
    $row = $stmt->fetch();
    if (!$row) {
        api_json_response(['ok' => false, 'error' => 'Группа не найдена'], 404);
    }

    $pdo->prepare('DELETE FROM rosters WHERE id = ?')->execute([$rosterId]);

    api_json_response([
        'ok' => true,
        'deleted' => true,
        'roster_id' => $rosterId,
        'title' => $row['title'],
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
