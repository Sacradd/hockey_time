<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/games.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$rosterId = (int) ($_GET['roster_id'] ?? 0);
if ($rosterId < 1) {
    api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
}

try {
    api_require_user();
    $pdo = api_db();

    db_ensure_teams_published_column($pdo);
    db_ensure_archived_at_column($pdo);

    $stmt = $pdo->prepare(
        'SELECT dg.id, dg.group_date, dg.title, dg.vote_active, dg.payment_active,
                dg.teams_published
         FROM day_groups dg
         WHERE dg.roster_id = ? AND dg.archived_at IS NULL
         ORDER BY dg.group_date DESC'
    );
    $stmt->execute([$rosterId]);

    $games = [];
    while ($row = $stmt->fetch()) {
        $games[] = [
            'id' => (int) $row['id'],
            'group_date' => $row['group_date'],
            'title' => $row['title'],
            'vote_active' => (bool) $row['vote_active'],
            'payment_active' => (bool) $row['payment_active'],
            'teams_published' => (bool) ($row['teams_published'] ?? false),
        ];
    }

    api_json_response(['ok' => true, 'games' => $games]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
