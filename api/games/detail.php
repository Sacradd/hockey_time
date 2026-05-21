<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/games.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

$gameId = (int) ($_GET['game_id'] ?? $_GET['group_id'] ?? 0);
if ($gameId < 1) {
    api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
}

try {
    $access = api_require_game_access($gameId);
    $user = $access['user'];
    $rosterId = $access['roster_id'];
    $game = $access['game'];
    $pdo = api_db();

    $canManage = api_can_manage_roster($user, $rosterId);
    $public = api_game_public($game, $user, $canManage);

    $voteStmt = $pdo->prepare('SELECT choice, voted_at FROM votes WHERE user_id = ? AND group_id = ? LIMIT 1');
    $voteStmt->execute([(int) $user['id'], $gameId]);
    $myVote = $voteStmt->fetch();

    $lineup = db_compute_lineup($pdo, $gameId, $rosterId, $game, $user);

    api_json_response([
        'ok' => true,
        'game' => $public,
        'my_vote' => $myVote
            ? ['choice' => (int) $myVote['choice'], 'voted_at' => $myVote['voted_at']]
            : null,
        'lineup' => $lineup,
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
