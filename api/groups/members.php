<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$groupId = (int) ($_GET['group_id'] ?? 0);
if ($groupId < 1) {
    api_json_response(['ok' => false, 'error' => 'Укажите group_id'], 400);
}

try {
    $pdo = api_db();

    $viewer = api_require_user();

    $g = $pdo->prepare('SELECT id, roster_id, group_date, title FROM day_groups WHERE id = ? LIMIT 1');
    $g->execute([$groupId]);
    $group = $g->fetch();
    if (!$group) {
        api_json_response(['ok' => false, 'error' => 'Группа не найдена'], 404);
    }

    $rosterId = (int) $group['roster_id'];

    $stmt = $pdo->prepare(
        'SELECT gm.actual, gm.is_guest, gm.excluded,
                u.id AS user_id, u.phone, u.display_login, u.role, u.position
         FROM group_members gm
         INNER JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ?
         ORDER BY u.position ASC, gm.actual DESC, COALESCE(u.display_login, u.phone) ASC'
    );
    $stmt->execute([$groupId]);

    $members = [];
    while ($row = $stmt->fetch()) {
        $members[] = api_member_list_item($row, $viewer, $rosterId);
    }

    api_json_response([
        'ok' => true,
        'group' => [
            'id' => (int) $group['id'],
            'group_date' => $group['group_date'],
            'title' => $group['title'],
        ],
        'members' => $members,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
