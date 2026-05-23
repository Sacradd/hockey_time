<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$q = trim((string) ($_GET['q'] ?? ''));
$rosterId = (int) ($_GET['roster_id'] ?? 0);

if ($rosterId < 1) {
    api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
}

try {
    api_require_roster_admin($rosterId);
    $pdo = api_db();

    $guestExclude = db_sql_exclude_game_only_guests();
    $notInRoster = 'NOT EXISTS (
        SELECT 1 FROM roster_members rm
        WHERE rm.roster_id = ? AND rm.user_id = u.id
    )';

    if (mb_strlen($q) < 2) {
        $stmt = $pdo->prepare(
            "SELECT u.id, u.phone, u.display_login, u.position, u.is_active
             FROM users u
             WHERE u.role != 'super'
               AND {$guestExclude}
               AND {$notInRoster}
             ORDER BY COALESCE(u.display_login, u.phone) ASC
             LIMIT 40"
        );
        $stmt->execute([$rosterId]);
    } else {
        $digits = preg_replace('/\D+/', '', $q) ?? '';
        $like = '%' . $q . '%';
        $phoneLike = $digits !== '' ? '%' . $digits . '%' : $like;

        $stmt = $pdo->prepare(
            "SELECT u.id, u.phone, u.display_login, u.position, u.is_active
             FROM users u
             WHERE u.role != 'super'
               AND {$guestExclude}
               AND {$notInRoster}
               AND (
                  LOWER(u.display_login) LIKE LOWER(?)
                  OR u.phone LIKE ?
                  OR REPLACE(u.phone, '7', '') LIKE ?
               )
             ORDER BY COALESCE(u.display_login, u.phone) ASC
             LIMIT 20"
        );
        $stmt->execute([$rosterId, $like, $phoneLike, $phoneLike]);
    }

    $players = [];
    while ($row = $stmt->fetch()) {
        $pos = (string) ($row['position'] ?? 'player');
        if (!in_array($pos, ['player', 'goalie'], true)) {
            $pos = 'player';
        }
        $players[] = [
            'user_id' => (int) $row['id'],
            'name' => $row['display_login']
                ?: api_format_phone_display((string) $row['phone']),
            'phone_display' => api_format_phone_display((string) $row['phone']),
            'position' => $pos,
            'is_active' => (bool) $row['is_active'],
            'in_roster' => false,
        ];
    }

    api_json_response(['ok' => true, 'players' => $players]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
