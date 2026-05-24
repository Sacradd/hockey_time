<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/games.php';
require dirname(__DIR__) . '/lib/push.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $gameId = (int) ($body['game_id'] ?? $body['group_id'] ?? 0);
    if ($gameId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
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

    $stats = db_field_lineup_payment_stats($pdo, $gameId, $rosterId, $game, $viewer);
    $notify = push_notify_game_payment($pdo, $gameId, $game, $viewer);
    $message = payment_notify_admin_message($stats, $notify);
    $noticeKind = ($stats['unpaid_count'] ?? 0) === 0 ? 'success' : 'info';

    api_json_response([
        'ok' => true,
        'notify' => $notify,
        'stats' => $stats,
        'message' => $message,
        'notice_kind' => $noticeKind,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
