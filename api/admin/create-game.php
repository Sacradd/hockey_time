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
    api_require_roster_admin($rosterId);
    $date = (string) ($body['date'] ?? $body['group_date'] ?? '');
    $title = isset($body['title']) ? (string) $body['title'] : null;

    if ($rosterId < 1 || $date === '') {
        api_json_response(['ok' => false, 'error' => 'roster_id и date (YYYY-MM-DD) обязательны'], 400);
    }

    $pdo = api_db();
    $gameId = db_upsert_game($pdo, $rosterId, $date, $title);

    $stmt = $pdo->prepare('SELECT id, roster_id, group_date, title FROM day_groups WHERE id = ?');
    $stmt->execute([$gameId]);
    $game = $stmt->fetch();

    api_json_response([
        'ok' => true,
        'game' => [
            'id' => (int) $game['id'],
            'roster_id' => (int) $game['roster_id'],
            'group_date' => $game['group_date'],
            'title' => $game['title'],
        ],
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
