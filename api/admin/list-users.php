<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

try {
    api_require_super();
    $pdo = api_db();

    $stmt = $pdo->query(
        "SELECT u.id, u.phone, u.display_login, u.is_active, u.role,
                r.id AS roster_id, r.title AS roster_title, rm.is_admin
         FROM users u
         LEFT JOIN roster_members rm ON rm.user_id = u.id
         LEFT JOIN rosters r ON r.id = rm.roster_id
         WHERE u.role != 'super'
           AND " . db_sql_exclude_game_only_guests() . "
         ORDER BY COALESCE(u.display_login, u.phone) ASC, r.title ASC"
    );

    $map = [];
    while ($row = $stmt->fetch()) {
        $userId = (int) $row['id'];
        if (!isset($map[$userId])) {
            $map[$userId] = [
                'user_id' => $userId,
                'name' => $row['display_login']
                    ?: api_format_phone_display((string) $row['phone']),
                'display_login' => $row['display_login'] ?: null,
                'phone_display' => api_format_phone_display((string) $row['phone']),
                'is_active' => (bool) $row['is_active'],
                'role' => $row['role'],
                'rosters' => [],
            ];
        }
        if ($row['roster_id'] !== null) {
            $map[$userId]['rosters'][] = [
                'roster_id' => (int) $row['roster_id'],
                'title' => $row['roster_title'],
                'is_admin' => (bool) $row['is_admin'],
            ];
        }
    }

    api_json_response([
        'ok' => true,
        'users' => array_values($map),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
