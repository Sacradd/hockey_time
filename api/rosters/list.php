<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

try {
    api_require_user();
    $pdo = api_db();

    $stmt = $pdo->query(
        'SELECT r.id, r.title, r.venue, r.weekday,
                (SELECT COUNT(*) FROM roster_members rm WHERE rm.roster_id = r.id) AS members_count,
                (SELECT COUNT(*) FROM day_groups dg WHERE dg.roster_id = r.id) AS games_count
         FROM rosters r
         ORDER BY r.title ASC'
    );

    $rosters = [];
    while ($row = $stmt->fetch()) {
        $rosters[] = [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'venue' => $row['venue'],
            'weekday' => $row['weekday'] !== null ? (int) $row['weekday'] : null,
            'members_count' => (int) $row['members_count'],
            'games_count' => (int) $row['games_count'],
        ];
    }

    api_json_response(['ok' => true, 'rosters' => $rosters]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
