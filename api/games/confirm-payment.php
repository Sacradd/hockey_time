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

    if ($gameId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
    }

    $access = api_require_game_access($gameId);
    $user = $access['user'];
    $game = $access['game'];

    if (!(bool) ($user['is_active'] ?? false)) {
        api_json_response(['ok' => false, 'error' => 'Сначала активируйте аккаунт'], 403);
    }

    if (!(bool) ($game['payment_active'] ?? false)) {
        api_json_response(['ok' => false, 'error' => 'Оплата для этой игры не запрошена'], 400);
    }

    $pdo = api_db();
    $rosterId = (int) $game['roster_id'];
    $userId = (int) $user['id'];

    if (db_roster_member_position($pdo, $rosterId, $userId) === 'goalie') {
        api_json_response(['ok' => false, 'error' => 'Для вратарей оплата не требуется'], 400);
    }

    $existing = $pdo->prepare(
        'SELECT paid_at FROM payments WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $existing->execute([$userId, $gameId]);
    $row = $existing->fetch();
    if ($row) {
        api_json_response([
            'ok' => true,
            'payment' => ['paid_at' => $row['paid_at']],
            'already' => true,
        ]);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO payments (user_id, group_id, paid_at) VALUES (?, ?, NOW())'
    );
    $stmt->execute([$userId, $gameId]);

    $paidAt = date('Y-m-d H:i:s');

    api_json_response([
        'ok' => true,
        'payment' => ['paid_at' => $paidAt],
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
