<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$rosterId = (int) ($_GET['roster_id'] ?? 0);
if ($rosterId < 1) {
    api_json_response(['ok' => false, 'error' => 'Укажите roster_id'], 400);
}

try {
    $viewer = api_require_user();
    $userId = (int) $viewer['id'];
    $pdo = api_db();

    $mem = $pdo->prepare(
        'SELECT 1 FROM roster_members WHERE roster_id = ? AND user_id = ? LIMIT 1'
    );
    $mem->execute([$rosterId, $userId]);
    if (!$mem->fetch()) {
        api_json_response(['ok' => false, 'error' => 'Вы не в этой группе'], 403);
    }

    $r = $pdo->prepare('SELECT id, title, venue, weekday FROM rosters WHERE id = ? LIMIT 1');
    $r->execute([$rosterId]);
    $roster = $r->fetch();
    if (!$roster) {
        api_json_response(['ok' => false, 'error' => 'Группа не найдена'], 404);
    }

    $positionCol = db_column_exists($pdo, 'roster_members', 'position')
        ? 'COALESCE(rm.position, u.position)'
        : 'u.position';

    $stmt = $pdo->prepare(
        "SELECT u.id AS user_id, u.phone, u.display_login, u.role, {$positionCol} AS position,
                u.is_active, rm.is_admin
         FROM roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         WHERE rm.roster_id = ?
         ORDER BY rm.is_admin DESC, u.position ASC, COALESCE(u.display_login, u.phone) ASC"
    );
    $stmt->execute([$rosterId]);

    $admins = [];
    $players = [];
    $goalies = [];

    while ($row = $stmt->fetch()) {
        $item = api_member_list_item($row, $viewer, $rosterId);
        if ((bool) $row['is_admin']) {
            $admins[] = $item;
            continue;
        }
        if (($row['position'] ?? 'player') === 'goalie') {
            $goalies[] = $item;
        } else {
            $players[] = $item;
        }
    }

    api_json_response([
        'ok' => true,
        'roster' => [
            'id' => (int) $roster['id'],
            'title' => $roster['title'],
            'venue' => $roster['venue'],
            'weekday' => $roster['weekday'] !== null ? (int) $roster['weekday'] : null,
        ],
        'admins' => $admins,
        'players' => $players,
        'goalies' => $goalies,
        'can_manage' => api_can_manage_roster($viewer, $rosterId),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
