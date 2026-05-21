<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

try {
    $viewer = api_require_user();
    $userId = (int) $viewer['id'];
    $pdo = api_db();

    $stmt = $pdo->prepare(
        'SELECT r.id, r.title, r.venue, r.weekday, rm.is_admin,
                (SELECT COUNT(*) FROM roster_members rm2 WHERE rm2.roster_id = r.id) AS members_count
         FROM roster_members rm
         INNER JOIN rosters r ON r.id = rm.roster_id
         WHERE rm.user_id = ?
         ORDER BY r.title ASC'
    );
    $stmt->execute([$userId]);

    $rosters = [];
    while ($row = $stmt->fetch()) {
        $rosters[] = [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'venue' => $row['venue'],
            'weekday' => $row['weekday'] !== null ? (int) $row['weekday'] : null,
            'members_count' => (int) $row['members_count'],
            'is_admin' => (bool) $row['is_admin'],
        ];
    }

    api_json_response([
        'ok' => true,
        'phone_display' => api_format_phone_display((string) $viewer['phone']),
        'rosters' => $rosters,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
