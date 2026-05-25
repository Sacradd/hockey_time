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

    $rosterId = (int) $game['roster_id'];
    api_require_roster_admin($rosterId);

    $viewer = api_require_user();

    if (db_is_game_guest($pdo, $gameId, $userId)) {
        db_remove_game_guest($pdo, $gameId, $rosterId, $game, $viewer, $userId);
        $lineup = db_compute_lineup($pdo, $gameId, $rosterId, $game, $viewer);
        api_json_response([
            'ok' => true,
            'lineup' => $lineup,
            'guest_removed' => true,
        ]);
    }

    if (!db_roster_has_member($pdo, $rosterId, $userId)) {
        api_json_response(['ok' => false, 'error' => 'Игрок не в этой группе'], 404);
    }

    $goOption = (int) ($game['vote_go_option'] ?? 1);
    $voteStmt = $pdo->prepare(
        'SELECT choice FROM votes WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $voteStmt->execute([$userId, $gameId]);
    $voteRow = $voteStmt->fetch();
    if (!$voteRow) {
        api_json_response(['ok' => false, 'error' => 'Игрок ещё не голосовал'], 400);
    }
    if ((int) $voteRow['choice'] !== $goOption) {
        api_json_response(['ok' => false, 'error' => 'Игрок уже отмечен как «не буду»'], 400);
    }

    $declineChoice = db_game_decline_choice($game);
    $pdo->prepare(
        'UPDATE votes SET choice = ? WHERE user_id = ? AND group_id = ?'
    )->execute([$declineChoice, $userId, $gameId]);

    db_clear_field_go_queue_slot($pdo, $gameId, $userId);

    $remaining = db_collect_field_go_candidates($pdo, $gameId, $rosterId, $game, $viewer);
    if ($remaining !== []) {
        db_persist_field_go_queue($pdo, $gameId, db_order_field_go_candidates($remaining));
    }

    $lineup = db_compute_lineup($pdo, $gameId, $rosterId, $game, $viewer);

    api_json_response([
        'ok' => true,
        'lineup' => $lineup,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
