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
    $date = trim((string) ($body['date'] ?? $body['group_date'] ?? ''));
    $title = array_key_exists('title', $body) ? trim((string) $body['title']) : null;
    $gameTime = trim((string) ($body['game_time'] ?? ''));
    $weekday = isset($body['weekday']) ? (int) $body['weekday'] : null;

    if ($gameId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
    }
    if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        api_json_response(['ok' => false, 'error' => 'date: YYYY-MM-DD'], 400);
    }
    if ($gameTime !== '' && !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $gameTime)) {
        api_json_response(['ok' => false, 'error' => 'game_time: ЧЧ:ММ'], 400);
    }
    if ($weekday !== null && ($weekday < 0 || $weekday > 6)) {
        api_json_response(['ok' => false, 'error' => 'weekday: 0–6'], 400);
    }
    if ($title !== null && mb_strlen($title) > 128) {
        api_json_response(['ok' => false, 'error' => 'Название до 128 символов'], 400);
    }

    $pdo = api_db();
    db_ensure_game_schedule_columns($pdo);
    $game = db_fetch_game($pdo, $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }

    $rosterId = (int) $game['roster_id'];
    $viewer = api_require_roster_admin($rosterId);

    $dup = $pdo->prepare(
        'SELECT id FROM day_groups WHERE roster_id = ? AND group_date = ? AND id != ? LIMIT 1'
    );
    $dup->execute([$rosterId, $date, $gameId]);
    if ($dup->fetch()) {
        api_json_response(['ok' => false, 'error' => 'На эту дату уже есть игра в группе'], 400);
    }

    $titleVal = $title === null ? $game['title'] : ($title === '' ? null : $title);
    $timeVal = $gameTime === '' ? null : (strlen($gameTime) === 5 ? $gameTime . ':00' : $gameTime);
    $weekdayVal = $weekday;

    $upd = $pdo->prepare(
        'UPDATE day_groups SET group_date = ?, title = ?, game_time = ?, weekday = ? WHERE id = ?'
    );
    $upd->execute([$date, $titleVal, $timeVal, $weekdayVal, $gameId]);

    $game = db_fetch_game($pdo, $gameId);

    api_json_response([
        'ok' => true,
        'game' => api_game_public($game, $viewer, true),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
