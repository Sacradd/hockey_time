<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/db.php';

$secret = $_GET['secret'] ?? '';
$expected = (string) (api_config()['install_secret'] ?? '');
if ($expected === '' || !hash_equals($expected, $secret)) {
    api_json_response(['ok' => false, 'error' => 'Неверный secret'], 403);
}

$seedPath = dirname(__DIR__) . '/database/seed.json';
if (!is_file($seedPath)) {
    api_json_response(['ok' => false, 'error' => 'Нет database/seed.json'], 400);
}

$seed = json_decode((string) file_get_contents($seedPath), true);
if (!is_array($seed)) {
    api_json_response(['ok' => false, 'error' => 'Некорректный JSON в seed.json'], 400);
}

try {
    $pdo = api_db();
    db_run_sql_file($pdo, dirname(__DIR__) . '/database/schema.sql');

    $adminPhone = api_normalize_phone((string) ($seed['admin']['phone'] ?? ''));
    $adminPass = (string) ($seed['admin']['password'] ?? '');
    $groupDate = (string) ($seed['group']['date'] ?? '');
    $groupTitle = isset($seed['group']['title']) ? (string) $seed['group']['title'] : null;

    $rosterCfg = $seed['roster'] ?? [];
    $rosterTitle = (string) ($rosterCfg['title'] ?? 'Среда · ЛД Кристалл');
    $rosterVenue = isset($rosterCfg['venue']) ? (string) $rosterCfg['venue'] : 'Кристалл';
    $rosterWeekday = isset($rosterCfg['weekday']) ? (int) $rosterCfg['weekday'] : 3;

    $pdo->beginTransaction();

    $rosterId = db_upsert_roster($pdo, $rosterTitle, $rosterVenue, $rosterWeekday);
    $adminId = db_upsert_user($pdo, $adminPhone, $adminPass, 'admin', 'player', false, true);
    db_link_roster_member($pdo, $rosterId, $adminId);

    $gameId = db_upsert_game($pdo, $rosterId, $groupDate, $groupTitle);

    $playersCreated = 0;
    foreach ($seed['players'] ?? [] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $phone = api_normalize_phone((string) ($row['phone'] ?? ''));
        $pass = (string) ($row['password'] ?? '');
        $position = (string) ($row['position'] ?? 'player');
        if (!api_validate_position($position)) {
            $position = 'player';
        }
        $userId = db_upsert_user($pdo, $phone, $pass, 'player', $position, true, false);
        db_link_roster_member($pdo, $rosterId, $userId);
        link_game_member($pdo, $userId, $gameId, false);
        $playersCreated++;
    }

    link_game_member($pdo, $adminId, $gameId, true);

    $pdo->commit();

    api_json_response([
        'ok' => true,
        'message' => 'Установка завершена',
        'roster_id' => $rosterId,
        'game_id' => $gameId,
        'admin_phone' => $adminPhone,
        'players' => $playersCreated,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}

function link_game_member(PDO $pdo, int $userId, int $groupId, bool $actual): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO group_members (user_id, group_id, actual)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE actual = VALUES(actual)'
    );
    $stmt->execute([$userId, $groupId, $actual ? 1 : 0]);
}
