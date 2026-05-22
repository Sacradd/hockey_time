<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/db.php';
require dirname(__DIR__) . '/lib/games.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $gameId = (int) ($body['game_id'] ?? $body['group_id'] ?? 0);
    $label1 = trim((string) ($body['vote_label_1'] ?? $body['label_1'] ?? 'Еду'));
    $label2 = trim((string) ($body['vote_label_2'] ?? $body['label_2'] ?? 'Не еду'));
    $label3 = isset($body['vote_label_3']) || isset($body['label_3'])
        ? trim((string) ($body['vote_label_3'] ?? $body['label_3'] ?? ''))
        : '';
    $goOption = (int) ($body['vote_go_option'] ?? 1);

    if ($gameId < 1) {
        api_json_response(['ok' => false, 'error' => 'Укажите game_id'], 400);
    }
    if ($label1 === '' || $label2 === '') {
        api_json_response(['ok' => false, 'error' => 'Нужны подписи для вариантов 1 и 2'], 400);
    }
    if (mb_strlen($label1) > 64 || mb_strlen($label2) > 64 || mb_strlen($label3) > 64) {
        api_json_response(['ok' => false, 'error' => 'Подпись до 64 символов'], 400);
    }
    if ($goOption < 1 || $goOption > 3) {
        api_json_response(['ok' => false, 'error' => 'vote_go_option: 1, 2 или 3'], 400);
    }
    if ($goOption === 3 && $label3 === '') {
        api_json_response(['ok' => false, 'error' => 'Для третьего варианта нужна подпись'], 400);
    }

    $pdo = api_db();
    $game = db_fetch_game($pdo, $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }

    $rosterId = (int) $game['roster_id'];
    $viewer = api_require_roster_admin($rosterId);

    $pdo->beginTransaction();

    $pdo->prepare(
        'UPDATE day_groups SET vote_active = 0 WHERE roster_id = ? AND id != ?'
    )->execute([$rosterId, $gameId]);

    $upd = $pdo->prepare(
        'UPDATE day_groups SET vote_active = 1, vote_ends_at = ?,
         vote_label_1 = ?, vote_label_2 = ?, vote_label_3 = ?, vote_go_option = ?
         WHERE id = ?'
    );
    $upd->execute([
        null,
        $label1,
        $label2,
        $label3 !== '' ? $label3 : null,
        $goOption,
        $gameId,
    ]);

    db_sync_roster_to_game($pdo, $rosterId, $gameId);

    $pdo->commit();

    $game = db_fetch_game($pdo, $gameId);

    api_json_response([
        'ok' => true,
        'game' => api_game_public($game, $viewer, true),
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_handle_exception($e);
}
