<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$q = trim((string) ($_GET['q'] ?? ''));

if (mb_strlen($q) < 2) {
    api_json_response(['ok' => false, 'error' => 'Введите минимум 2 символа'], 400);
}

try {
    $viewer = api_require_user();
    $pdo = api_db();
    $like = '%' . $q . '%';
    $digits = preg_replace('/\D+/', '', $q) ?? '';
    $phoneLike = $digits !== '' ? '%' . $digits . '%' : $like;

    if (api_is_super($viewer)) {
        $stmt = $pdo->prepare(
            'SELECT u.id, u.phone, u.display_login, u.is_active, u.role
             FROM users u
             WHERE u.role != ?
               AND ' . db_sql_exclude_game_only_guests() . '
               AND (
                 LOWER(u.display_login) LIKE LOWER(?)
                 OR u.phone LIKE ?
                 OR u.phone LIKE ?
               )
             ORDER BY COALESCE(u.display_login, u.phone) ASC
             LIMIT 20'
        );
        $stmt->execute(['super', $like, $phoneLike, $phoneLike]);
    } else {
        $adminRosters = $pdo->prepare(
            'SELECT roster_id FROM roster_members WHERE user_id = ? AND is_admin = 1'
        );
        $adminRosters->execute([(int) $viewer['id']]);
        $rosterIds = [];
        while ($rid = $adminRosters->fetchColumn()) {
            $rosterIds[] = (int) $rid;
        }
        if ($rosterIds === []) {
            api_json_response(['ok' => false, 'error' => 'Нет прав на сброс пароля'], 403);
        }
        $placeholders = implode(',', array_fill(0, count($rosterIds), '?'));
        $sql = "SELECT DISTINCT u.id, u.phone, u.display_login, u.is_active, u.role
                FROM users u
                INNER JOIN roster_members rm ON rm.user_id = u.id
                WHERE rm.roster_id IN ({$placeholders})
                  AND u.role = 'player'
                  AND u.id != ?
                  AND (
                    LOWER(u.display_login) LIKE LOWER(?)
                    OR u.phone LIKE ?
                    OR u.phone LIKE ?
                  )
                ORDER BY COALESCE(u.display_login, u.phone) ASC
                LIMIT 20";
        $params = array_merge($rosterIds, [(int) $viewer['id'], $like, $phoneLike, $phoneLike]);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    $users = [];
    while ($row = $stmt->fetch()) {
        $userId = (int) $row['id'];
        if (!api_can_reset_user_password($viewer, $userId)) {
            continue;
        }
        $users[] = [
            'user_id' => $userId,
            'name' => $row['display_login']
                ?: api_format_phone_display((string) $row['phone']),
            'display_login' => $row['display_login'] ?: null,
            'phone_display' => api_format_phone_display((string) $row['phone']),
            'is_active' => (bool) $row['is_active'],
        ];
    }

    api_json_response(['ok' => true, 'users' => $users]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
