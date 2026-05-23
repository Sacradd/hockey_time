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
    $title = trim((string) ($body['title'] ?? ''));

    if ($rosterId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
    }
    if ($title === '') {
        api_json_response(['ok' => false, 'error' => 'Укажите название группы'], 400);
    }
    if (mb_strlen($title) > 128) {
        api_json_response(['ok' => false, 'error' => 'Название до 128 символов'], 400);
    }

    api_require_roster_admin($rosterId);

    $pdo = api_db();
    $stmt = $pdo->prepare('SELECT id, title, venue, weekday FROM rosters WHERE id = ? LIMIT 1');
    $stmt->execute([$rosterId]);
    $row = $stmt->fetch();
    if (!$row) {
        api_json_response(['ok' => false, 'error' => 'Группа не найдена'], 404);
    }

    $pdo->prepare('UPDATE rosters SET title = ? WHERE id = ?')->execute([$title, $rosterId]);

    $countStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM roster_members WHERE roster_id = ?'
    );
    $countStmt->execute([$rosterId]);
    $membersCount = (int) $countStmt->fetchColumn();

    $gamesStmt = $pdo->prepare(
        'SELECT COUNT(*) FROM day_groups WHERE roster_id = ?'
    );
    $gamesStmt->execute([$rosterId]);
    $gamesCount = (int) $gamesStmt->fetchColumn();

    api_json_response([
        'ok' => true,
        'roster' => [
            'id' => $rosterId,
            'title' => $title,
            'venue' => $row['venue'],
            'weekday' => $row['weekday'] !== null ? (int) $row['weekday'] : null,
            'members_count' => $membersCount,
            'games_count' => $gamesCount,
            'is_admin' => true,
        ],
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
