<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

try {
    $user = api_require_user();
    $pdo = api_db();
    $userId = (int) $user['id'];

    $stmt = $pdo->prepare(
        'SELECT dg.id, dg.group_date, dg.title, dg.vote_active, dg.payment_active,
                (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = dg.id) AS members_count,
                (SELECT gm.actual FROM group_members gm
                 WHERE gm.group_id = dg.id AND gm.user_id = ? LIMIT 1) AS my_actual
         FROM day_groups dg
         ORDER BY dg.group_date DESC'
    );
    $stmt->execute([$userId]);

    $groups = [];
    while ($row = $stmt->fetch()) {
        $groups[] = [
            'id' => (int) $row['id'],
            'group_date' => $row['group_date'],
            'title' => $row['title'],
            'vote_active' => (bool) $row['vote_active'],
            'payment_active' => (bool) $row['payment_active'],
            'members_count' => (int) $row['members_count'],
            'my_actual' => $row['my_actual'] !== null ? (bool) $row['my_actual'] : null,
        ];
    }

    api_json_response(['ok' => true, 'groups' => $groups]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
