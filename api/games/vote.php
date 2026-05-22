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
    $choice = (int) ($body['choice'] ?? 0);

    if ($gameId < 1 || $choice < 1 || $choice > 3) {
        api_json_response(['ok' => false, 'error' => 'game_id и choice (1–3) обязательны'], 400);
    }

    $access = api_require_game_access($gameId);
    $user = $access['user'];
    $game = $access['game'];

    if (!(bool) ($user['is_active'] ?? false)) {
        api_json_response(['ok' => false, 'error' => 'Сначала активируйте аккаунт'], 403);
    }

    if (!db_vote_is_open($game)) {
        api_json_response(['ok' => false, 'error' => 'Голосование закрыто'], 400);
    }

    $labels = [];
    foreach ([1, 2, 3] as $n) {
        $val = $game['vote_label_' . $n] ?? null;
        if ($val !== null && $val !== '') {
            $labels[$n] = true;
        }
    }
    if (!isset($labels[$choice])) {
        api_json_response(['ok' => false, 'error' => 'Недопустимый вариант ответа'], 400);
    }

    $pdo = api_db();
    $ex = $pdo->prepare(
        'SELECT excluded FROM group_members WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $ex->execute([(int) $user['id'], $gameId]);
    $exRow = $ex->fetch();
    if ($exRow && (bool) $exRow['excluded']) {
        api_json_response(['ok' => false, 'error' => 'Вы исключены из этой игры'], 403);
    }

    $existing = $pdo->prepare(
        'SELECT choice FROM votes WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $existing->execute([(int) $user['id'], $gameId]);
    if ($existing->fetch()) {
        api_json_response(['ok' => false, 'error' => 'Ответ уже зафиксирован, изменить нельзя'], 400);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO votes (user_id, group_id, choice, voted_at) VALUES (?, ?, ?, NOW())'
    );
    $stmt->execute([(int) $user['id'], $gameId, $choice]);

    api_json_response([
        'ok' => true,
        'vote' => ['choice' => $choice, 'voted_at' => date('Y-m-d H:i:s')],
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
