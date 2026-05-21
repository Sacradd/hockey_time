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
    $pdo = api_db();

    $r = $pdo->prepare('SELECT id, title, venue, weekday FROM rosters WHERE id = ? LIMIT 1');
    $r->execute([$rosterId]);
    $roster = $r->fetch();
    if (!$roster) {
        api_json_response(['ok' => false, 'error' => 'Roster не найден'], 404);
    }

    $positionCol = db_column_exists($pdo, 'roster_members', 'position')
        ? 'COALESCE(rm.position, u.position)'
        : 'u.position';

    $hasAdminCol = db_column_exists($pdo, 'roster_members', 'is_admin');
    $adminCol = $hasAdminCol ? 'rm.is_admin' : '0';
    $orderBy = $hasAdminCol
        ? 'rm.is_admin DESC, '
        : '';

    $stmt = $pdo->prepare(
        "SELECT u.id, u.phone, u.display_login, u.role, {$positionCol} AS position, u.is_active,
                {$adminCol} AS is_admin
         FROM roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         WHERE rm.roster_id = ?
         ORDER BY {$orderBy}u.position ASC, COALESCE(u.display_login, u.phone) ASC"
    );
    $stmt->execute([$rosterId]);

    $members = [];
    while ($row = $stmt->fetch()) {
        $row['user_id'] = (int) $row['id'];
        $item = api_member_list_item($row, $viewer, $rosterId);
        $item['is_admin'] = (bool) ($row['is_admin'] ?? false);
        $members[] = $item;
    }

    api_json_response([
        'ok' => true,
        'roster' => [
            'id' => (int) $roster['id'],
            'title' => $roster['title'],
            'venue' => $roster['venue'],
            'weekday' => $roster['weekday'] !== null ? (int) $roster['weekday'] : null,
        ],
        'members' => $members,
        'can_manage' => api_can_manage_roster($viewer, $rosterId),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
