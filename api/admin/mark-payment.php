<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/games.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $gameId = (int) ($body['game_id'] ?? $body['group_id'] ?? 0);
    $userId = (int) ($body['user_id'] ?? 0);

    if ($gameId < 1 || $userId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id и user_id'], 400);
    }

    $pdo = api_db();
    $game = db_fetch_game($pdo, $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }

    if (!(bool) ($game['payment_active'] ?? false)) {
        api_json_response(['ok' => false, 'error' => 'Оплата для этой игры не запрошена'], 400);
    }

    $rosterId = (int) $game['roster_id'];
    $viewer = api_require_roster_admin($rosterId);

    if (db_roster_member_position($pdo, $rosterId, $userId) === 'goalie') {
        api_json_response(['ok' => false, 'error' => 'Для вратарей оплата не требуется'], 400);
    }

    if (!db_user_in_field_lineup($pdo, $gameId, $rosterId, $game, $viewer, $userId)) {
        api_json_response(['ok' => false, 'error' => 'Оплата только для игроков в основе'], 400);
    }

    $memberStmt = $pdo->prepare(
        'SELECT 1 FROM roster_members WHERE roster_id = ? AND user_id = ? LIMIT 1'
    );
    $memberStmt->execute([$rosterId, $userId]);
    if (!$memberStmt->fetch()) {
        $guestStmt = $pdo->prepare(
            'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND is_guest = 1 LIMIT 1'
        );
        $guestStmt->execute([$gameId, $userId]);
        if (!$guestStmt->fetch()) {
            api_json_response(['ok' => false, 'error' => 'Игрок не в этой игре'], 400);
        }
    }

    $existing = $pdo->prepare(
        'SELECT paid_at FROM payments WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $existing->execute([$userId, $gameId]);
    $row = $existing->fetch();
    if ($row) {
        $lineup = db_compute_lineup($pdo, $gameId, $rosterId, $game, $viewer);
        api_json_response([
            'ok' => true,
            'lineup' => $lineup,
            'already' => true,
        ]);
    }

    $pdo->prepare(
        'INSERT INTO payments (user_id, group_id, paid_at) VALUES (?, ?, NOW())'
    )->execute([$userId, $gameId]);

    $game = db_fetch_game($pdo, $gameId);
    $lineup = db_compute_lineup($pdo, $gameId, $rosterId, $game, $viewer);

    api_json_response([
        'ok' => true,
        'lineup' => $lineup,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
