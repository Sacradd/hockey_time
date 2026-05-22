<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/** Закрыть голосование, если истекло vote_ends_at. */
function db_close_expired_vote(PDO $pdo, int $gameId): void
{
    $pdo->prepare(
        'UPDATE day_groups SET vote_active = 0
         WHERE id = ? AND vote_active = 1
           AND vote_ends_at IS NOT NULL AND vote_ends_at <= NOW()'
    )->execute([$gameId]);
}

/** @return array<string, mixed>|null */
function db_fetch_game(PDO $pdo, int $gameId): ?array
{
    db_close_expired_vote($pdo, $gameId);

    $pdo->prepare(
        'UPDATE day_groups SET vote_ends_at = NULL
         WHERE id = ? AND vote_active = 1 AND vote_ends_at IS NOT NULL'
    )->execute([$gameId]);

    $stmt = $pdo->prepare(
        'SELECT dg.id, dg.roster_id, dg.group_date, dg.title,
                dg.vote_active, dg.payment_active, dg.vote_ends_at,
                dg.vote_label_1, dg.vote_label_2, dg.vote_label_3, dg.vote_go_option,
                r.title AS roster_title, r.venue AS roster_venue
         FROM day_groups dg
         INNER JOIN rosters r ON r.id = dg.roster_id
         WHERE dg.id = ? LIMIT 1'
    );
    $stmt->execute([$gameId]);
    $row = $stmt->fetch();
    return $row ?: null;
}

function db_vote_is_open(array $game): bool
{
    if (!(bool) ($game['vote_active'] ?? false)) {
        return false;
    }
    $ends = $game['vote_ends_at'] ?? null;
    if ($ends === null || $ends === '') {
        return true;
    }
    return strtotime((string) $ends) > time();
}

/** Вариант ответа «не еду» для игры (первый choice ≠ vote_go_option с подписью). */
function db_game_decline_choice(array $game): int
{
    $go = (int) ($game['vote_go_option'] ?? 1);
    foreach ([1, 2, 3] as $n) {
        if ($n === $go) {
            continue;
        }
        $val = $game['vote_label_' . $n] ?? null;
        if ($val !== null && $val !== '') {
            return $n;
        }
    }

    return $go === 1 ? 2 : 1;
}

/** @return array{user: array, roster_id: int, game: array} */
function api_require_game_access(int $gameId): array
{
    $user = api_require_user();
    $game = db_fetch_game(api_db(), $gameId);
    if (!$game) {
        api_json_response(['ok' => false, 'error' => 'Игра не найдена'], 404);
    }
    $rosterId = (int) $game['roster_id'];
    if (!api_is_super($user) && !db_roster_has_member(api_db(), $rosterId, (int) $user['id'])) {
        api_json_response(['ok' => false, 'error' => 'Нет доступа к этой игре'], 403);
    }

    return ['user' => $user, 'roster_id' => $rosterId, 'game' => $game];
}

/** @return array<string, mixed> */
function api_game_public(array $game, array $viewer, bool $canManage): array
{
    $open = db_vote_is_open($game);
    $labels = [];
    foreach ([1, 2, 3] as $n) {
        $key = 'vote_label_' . $n;
        $val = $game[$key] ?? null;
        if ($val !== null && $val !== '') {
            $labels[] = ['choice' => $n, 'label' => (string) $val];
        }
    }

    return [
        'id' => (int) $game['id'],
        'roster_id' => (int) $game['roster_id'],
        'group_date' => $game['group_date'],
        'title' => $game['title'],
        'roster_title' => $game['roster_title'] ?? null,
        'roster_venue' => $game['roster_venue'] ?? null,
        'vote_active' => (bool) $game['vote_active'],
        'vote_open' => $open,
        'vote_ends_at' => $game['vote_ends_at'],
        'vote_labels' => $labels,
        'vote_go_option' => (int) ($game['vote_go_option'] ?? 1),
        'payment_active' => (bool) ($game['payment_active']),
        'can_manage' => $canManage,
    ];
}

/** @return array<int, true> user_id => paid */
function db_fetch_game_paid_user_ids(PDO $pdo, int $gameId): array
{
    $stmt = $pdo->prepare('SELECT user_id FROM payments WHERE group_id = ?');
    $stmt->execute([$gameId]);
    $map = [];
    while ($row = $stmt->fetch()) {
        $map[(int) $row['user_id']] = true;
    }
    return $map;
}

/** Позиция в roster: player | goalie */
function db_roster_member_position(PDO $pdo, int $rosterId, int $userId): string
{
    $positionCol = db_column_exists($pdo, 'roster_members', 'position')
        ? 'rm.position'
        : 'u.position';
    $stmt = $pdo->prepare(
        "SELECT {$positionCol} AS member_position
         FROM roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         WHERE rm.roster_id = ? AND rm.user_id = ? LIMIT 1"
    );
    $stmt->execute([$rosterId, $userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return 'player';
    }
    $pos = $row['member_position'] ?? 'player';
    return in_array($pos, ['player', 'goalie'], true) ? $pos : 'player';
}

/**
 * @param array{
 *   field_lineup: list<array>,
 *   field_reserve: list<array>,
 *   field_declined: list<array>,
 *   field_pending: list<array>,
 *   goalie_lineup: list<array>,
 *   goalie_reserve: list<array>,
 *   goalie_declined: list<array>,
 *   goalie_pending: list<array>
 * } $lineup
 * @return array<string, mixed>
 */
function db_lineup_attach_payment_flags(
    PDO $pdo,
    int $gameId,
    int $rosterId,
    array $game,
    array $viewer,
    array $lineup
): array {
    if (!(bool) ($game['payment_active'] ?? false) || !api_can_manage_roster($viewer, $rosterId)) {
        return $lineup;
    }

    $paidIds = db_fetch_game_paid_user_ids($pdo, $gameId);
    foreach (['field_lineup', 'field_reserve', 'field_declined', 'field_pending'] as $key) {
        foreach ($lineup[$key] as $i => $item) {
            if (($item['position'] ?? 'player') !== 'player') {
                continue;
            }
            if (isset($paidIds[(int) $item['user_id']])) {
                $lineup[$key][$i]['paid'] = true;
            }
        }
    }

    return $lineup;
}

/** @return array<int, array<string, mixed>> */
function db_fetch_game_votes(PDO $pdo, int $gameId): array
{
    $stmt = $pdo->prepare(
        'SELECT user_id, choice, voted_at FROM votes WHERE group_id = ?'
    );
    $stmt->execute([$gameId]);
    $map = [];
    while ($row = $stmt->fetch()) {
        $map[(int) $row['user_id']] = [
            'choice' => (int) $row['choice'],
            'voted_at' => $row['voted_at'],
        ];
    }
    return $map;
}

/**
 * Состав: 20 полевых + резерв + 2 вратаря по времени голоса «еду».
 *
 * @return array{
 *   field_lineup: list<array>,
 *   field_reserve: list<array>,
 *   field_declined: list<array>,
 *   field_pending: list<array>,
 *   goalie_lineup: list<array>,
 *   goalie_reserve: list<array>,
 *   goalie_declined: list<array>,
 *   goalie_pending: list<array>
 * }
 */
function db_compute_lineup(PDO $pdo, int $gameId, int $rosterId, array $game, array $viewer): array
{
    $goOption = (int) ($game['vote_go_option'] ?? 1);
    $votes = db_fetch_game_votes($pdo, $gameId);

    $positionCol = db_column_exists($pdo, 'roster_members', 'position')
        ? 'rm.position'
        : 'u.position';

    $stmt = $pdo->prepare(
        "SELECT rm.user_id, {$positionCol} AS member_position,
                u.display_login, u.phone, u.role, u.is_active,
                COALESCE(gm.excluded, 0) AS excluded,
                gm.queue_position,
                COALESCE(gm.is_guest, 0) AS is_guest
         FROM roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         LEFT JOIN group_members gm ON gm.user_id = rm.user_id AND gm.group_id = ?
         WHERE rm.roster_id = ?
         ORDER BY COALESCE(u.display_login, u.phone) ASC"
    );
    $stmt->execute([$gameId, $rosterId]);

    $fieldGoCandidates = [];
    $fieldDeclined = [];
    $fieldPending = [];
    $goalieGoCandidates = [];
    $goalieDeclined = [];
    $goaliePending = [];

    while ($row = $stmt->fetch()) {
        if ((bool) $row['excluded']) {
            continue;
        }
        $userId = (int) $row['user_id'];
        $pos = $row['member_position'] ?? 'player';
        if (!in_array($pos, ['player', 'goalie'], true)) {
            $pos = 'player';
        }

        $vote = $votes[$userId] ?? null;
        $item = api_member_list_item($row, $viewer, $rosterId);
        if ($vote !== null) {
            $item['choice'] = $vote['choice'];
            $item['voted_at'] = $vote['voted_at'];
        }
        if ($row['queue_position'] !== null && $row['queue_position'] !== '') {
            $item['queue_position'] = (int) $row['queue_position'];
        }

        $isGo = $vote !== null && $vote['choice'] === $goOption;

        if ($pos === 'goalie') {
            if ($vote === null) {
                $goaliePending[] = $item;
            } elseif ($isGo) {
                $goalieGoCandidates[] = $item;
            } else {
                $goalieDeclined[] = $item;
            }
            continue;
        }

        if ($vote === null) {
            $fieldPending[] = $item;
        } elseif ($isGo) {
            $fieldGoCandidates[] = $item;
        } else {
            $fieldDeclined[] = $item;
        }
    }

    $guestStmt = $pdo->prepare(
        'SELECT gm.user_id, u.display_login, u.phone, u.role, u.is_active, u.position AS member_position,
                COALESCE(gm.excluded, 0) AS excluded,
                gm.queue_position, 1 AS is_guest
         FROM group_members gm
         INNER JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ? AND gm.is_guest = 1
           AND NOT EXISTS (
             SELECT 1 FROM roster_members rm
             WHERE rm.roster_id = ? AND rm.user_id = gm.user_id
           )'
    );
    $guestStmt->execute([$gameId, $rosterId]);
    while ($row = $guestStmt->fetch()) {
        if ((bool) $row['excluded']) {
            continue;
        }
        $userId = (int) $row['user_id'];
        $pos = $row['member_position'] ?? 'player';
        if (!in_array($pos, ['player', 'goalie'], true)) {
            $pos = 'player';
        }

        $vote = $votes[$userId] ?? null;
        $item = api_member_list_item($row, $viewer, $rosterId);
        $item['is_guest'] = true;
        $item['position'] = $pos;
        if ($vote !== null) {
            $item['choice'] = $vote['choice'];
            $item['voted_at'] = $vote['voted_at'];
        }
        if ($row['queue_position'] !== null && $row['queue_position'] !== '') {
            $item['queue_position'] = (int) $row['queue_position'];
        }
        $isGo = $vote !== null && $vote['choice'] === $goOption;

        if ($pos === 'goalie') {
            if ($vote === null) {
                $goaliePending[] = $item;
            } elseif ($isGo) {
                $goalieGoCandidates[] = $item;
            } else {
                $goalieDeclined[] = $item;
            }
            continue;
        }

        if ($vote === null) {
            $fieldPending[] = $item;
        } elseif ($isGo) {
            $fieldGoCandidates[] = $item;
        } else {
            $fieldDeclined[] = $item;
        }
    }

    $fieldOrdered = db_order_field_go_candidates($fieldGoCandidates);
    $fieldLineup = [];
    $fieldReserve = [];
    foreach ($fieldOrdered as $i => $item) {
        $item['queue_order'] = $i + 1;
        if ($i < 20) {
            $fieldLineup[] = $item;
        } else {
            $fieldReserve[] = $item;
        }
    }

    usort($goalieGoCandidates, 'db_sort_by_voted_at');
    $goalieLineup = [];
    $goalieReserve = [];
    foreach ($goalieGoCandidates as $i => $item) {
        $item['queue_order'] = $i + 1;
        if ($i < 2) {
            $goalieLineup[] = $item;
        } else {
            $goalieReserve[] = $item;
        }
    }

    $lineup = [
        'field_lineup' => $fieldLineup,
        'field_reserve' => $fieldReserve,
        'field_declined' => $fieldDeclined,
        'field_pending' => $fieldPending,
        'goalie_lineup' => $goalieLineup,
        'goalie_reserve' => $goalieReserve,
        'goalie_declined' => $goalieDeclined,
        'goalie_pending' => $goaliePending,
    ];

    return db_lineup_attach_payment_flags($pdo, $gameId, $rosterId, $game, $viewer, $lineup);
}

/** @param array<string, mixed> $a
 * @param array<string, mixed> $b */
function db_sort_by_voted_at(array $a, array $b): int
{
    $ta = isset($a['voted_at']) ? strtotime((string) $a['voted_at']) : 0;
    $tb = isset($b['voted_at']) ? strtotime((string) $b['voted_at']) : 0;
    return $ta <=> $tb;
}

function db_ensure_group_member(PDO $pdo, int $userId, int $gameId): void
{
    $pdo->prepare(
        'INSERT IGNORE INTO group_members (user_id, group_id, actual) VALUES (?, ?, 1)'
    )->execute([$userId, $gameId]);
}

/**
 * Очередь полевых «еду»: ручные queue_position + остальные по voted_at.
 *
 * @param list<array<string, mixed>> $candidates
 * @return list<array<string, mixed>>
 */
function db_order_field_go_candidates(array $candidates): array
{
    if ($candidates === []) {
        return [];
    }

    $manual = [];
    $auto = [];
    foreach ($candidates as $c) {
        if (isset($c['queue_position']) && $c['queue_position'] !== null) {
            $manual[] = $c;
        } else {
            $auto[] = $c;
        }
    }

    usort($manual, static fn (array $a, array $b): int => ((int) $a['queue_position']) <=> ((int) $b['queue_position']));
    usort($auto, 'db_sort_by_voted_at');

    $total = count($candidates);
    $slots = array_fill(0, $total, null);

    foreach ($manual as $m) {
        $idx = min(max(0, (int) $m['queue_position'] - 1), $total - 1);
        while ($idx < $total && $slots[$idx] !== null) {
            $idx++;
        }
        if ($idx < $total) {
            $slots[$idx] = $m;
        }
    }

    $ai = 0;
    for ($i = 0; $i < $total; $i++) {
        if ($slots[$i] === null && $ai < count($auto)) {
            $slots[$i] = $auto[$ai++];
        }
    }
    while ($ai < count($auto)) {
        $slots[] = $auto[$ai++];
    }

    return array_values(array_filter($slots, static fn ($x) => $x !== null));
}

/** @param list<array<string, mixed>> $ordered */
function db_persist_field_go_queue(PDO $pdo, int $gameId, array $ordered): void
{
    foreach ($ordered as $i => $item) {
        $uid = (int) $item['user_id'];
        db_ensure_group_member($pdo, $uid, $gameId);
        $pdo->prepare(
            'UPDATE group_members SET queue_position = ? WHERE user_id = ? AND group_id = ?'
        )->execute([$i + 1, $uid, $gameId]);
    }
}

function db_ensure_field_go_vote(PDO $pdo, int $gameId, int $userId, int $goOption): void
{
    $voteStmt = $pdo->prepare(
        'SELECT choice FROM votes WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $voteStmt->execute([$userId, $gameId]);
    $voteRow = $voteStmt->fetch();
    if (!$voteRow) {
        $pdo->prepare(
            'INSERT INTO votes (user_id, group_id, choice, voted_at) VALUES (?, ?, ?, NOW())'
        )->execute([$userId, $gameId, $goOption]);
        return;
    }
    if ((int) $voteRow['choice'] !== $goOption) {
        $pdo->prepare(
            'UPDATE votes SET choice = ? WHERE user_id = ? AND group_id = ?'
        )->execute([$goOption, $userId, $gameId]);
    }
}

/**
 * @param list<array<string, mixed>> $candidates
 * @return list<array<string, mixed>>
 */
function db_collect_field_go_candidates(
    PDO $pdo,
    int $gameId,
    int $rosterId,
    array $game,
    array $viewer
): array {
    $goOption = (int) ($game['vote_go_option'] ?? 1);
    $votes = db_fetch_game_votes($pdo, $gameId);
    $positionCol = db_column_exists($pdo, 'roster_members', 'position')
        ? 'rm.position'
        : 'u.position';

    $stmt = $pdo->prepare(
        "SELECT rm.user_id, {$positionCol} AS member_position,
                u.display_login, u.phone, u.role, u.is_active,
                COALESCE(gm.excluded, 0) AS excluded,
                gm.queue_position,
                COALESCE(gm.is_guest, 0) AS is_guest
         FROM roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         LEFT JOIN group_members gm ON gm.user_id = rm.user_id AND gm.group_id = ?
         WHERE rm.roster_id = ?"
    );
    $stmt->execute([$gameId, $rosterId]);

    $candidates = [];
    while ($row = $stmt->fetch()) {
        if ((bool) $row['excluded']) {
            continue;
        }
        if (($row['member_position'] ?? 'player') === 'goalie') {
            continue;
        }
        $userId = (int) $row['user_id'];
        $vote = $votes[$userId] ?? null;
        if ($vote === null || (int) $vote['choice'] !== $goOption) {
            continue;
        }
        $item = api_member_list_item($row, $viewer, $rosterId);
        $item['choice'] = $vote['choice'];
        $item['voted_at'] = $vote['voted_at'];
        if ($row['queue_position'] !== null && $row['queue_position'] !== '') {
            $item['queue_position'] = (int) $row['queue_position'];
        }
        $candidates[] = $item;
    }

    $guestStmt = $pdo->prepare(
        'SELECT gm.user_id, u.display_login, u.phone, u.role, u.is_active, u.position AS member_position,
                COALESCE(gm.excluded, 0) AS excluded,
                gm.queue_position, 1 AS is_guest
         FROM group_members gm
         INNER JOIN users u ON u.id = gm.user_id
         WHERE gm.group_id = ? AND gm.is_guest = 1
           AND NOT EXISTS (
             SELECT 1 FROM roster_members rm
             WHERE rm.roster_id = ? AND rm.user_id = gm.user_id
           )'
    );
    $guestStmt->execute([$gameId, $rosterId]);
    while ($row = $guestStmt->fetch()) {
        if ((bool) $row['excluded']) {
            continue;
        }
        if (($row['member_position'] ?? 'player') === 'goalie') {
            continue;
        }
        $userId = (int) $row['user_id'];
        $vote = $votes[$userId] ?? null;
        if ($vote === null || (int) $vote['choice'] !== $goOption) {
            continue;
        }
        $item = api_member_list_item($row, $viewer, $rosterId);
        $item['is_guest'] = true;
        $item['position'] = 'player';
        $item['choice'] = $vote['choice'];
        $item['voted_at'] = $vote['voted_at'];
        if ($row['queue_position'] !== null && $row['queue_position'] !== '') {
            $item['queue_position'] = (int) $row['queue_position'];
        }
        $candidates[] = $item;
    }

    return $candidates;
}

/** @param list<array<string, mixed>> $candidates */
function db_reposition_field_go_user(
    PDO $pdo,
    int $gameId,
    array $game,
    array $candidates,
    int $userId,
    int $position,
    array $userItem
): void {
    $ordered = db_order_field_go_candidates($candidates);
    $ordered = array_values(array_filter(
        $ordered,
        static fn (array $x): bool => (int) $x['user_id'] !== $userId
    ));

    $insertAt = min(max(1, $position), count($ordered) + 1) - 1;
    array_splice($ordered, $insertAt, 0, [$userItem]);
    db_persist_field_go_queue($pdo, $gameId, $ordered);
}

function db_set_field_go_queue_position(
    PDO $pdo,
    int $gameId,
    int $rosterId,
    array $game,
    array $viewer,
    int $userId,
    int $position
): void {
    $goOption = (int) ($game['vote_go_option'] ?? 1);
    db_ensure_field_go_vote($pdo, $gameId, $userId, $goOption);

    $candidates = db_collect_field_go_candidates($pdo, $gameId, $rosterId, $game, $viewer);
    $userItem = null;
    foreach ($candidates as $c) {
        if ((int) $c['user_id'] === $userId) {
            $userItem = $c;
            break;
        }
    }

    if ($userItem === null) {
        $positionCol = db_column_exists($pdo, 'roster_members', 'position')
            ? 'rm.position'
            : 'u.position';
        $stmt = $pdo->prepare(
            "SELECT rm.user_id, {$positionCol} AS member_position,
                    u.display_login, u.phone, u.role, u.is_active
             FROM roster_members rm
             INNER JOIN users u ON u.id = rm.user_id
             WHERE rm.roster_id = ? AND rm.user_id = ? LIMIT 1"
        );
        $stmt->execute([$rosterId, $userId]);
        $row = $stmt->fetch();
        if (!$row) {
            throw new InvalidArgumentException('Игрок не в этой группе');
        }
        $vote = db_fetch_game_votes($pdo, $gameId)[$userId] ?? null;
        $userItem = api_member_list_item($row, $viewer, $rosterId);
        if ($vote !== null) {
            $userItem['choice'] = $vote['choice'];
            $userItem['voted_at'] = $vote['voted_at'];
        }
        $candidates[] = $userItem;
    }

    db_reposition_field_go_user($pdo, $gameId, $game, $candidates, $userId, $position, $userItem);
}

function db_clear_field_go_queue_slot(PDO $pdo, int $gameId, int $userId): void
{
    $pdo->prepare(
        'UPDATE group_members SET queue_position = NULL WHERE user_id = ? AND group_id = ?'
    )->execute([$userId, $gameId]);
}

/** Вернуть в «еду»: голос «еду», voted_at = момент занесения, место в очереди по времени. */
function db_mark_player_in_lineup(
    PDO $pdo,
    int $gameId,
    int $rosterId,
    array $game,
    array $viewer,
    int $userId
): void {
    $goOption = (int) ($game['vote_go_option'] ?? 1);
    $voteStmt = $pdo->prepare(
        'SELECT choice FROM votes WHERE user_id = ? AND group_id = ? LIMIT 1'
    );
    $voteStmt->execute([$userId, $gameId]);
    $voteRow = $voteStmt->fetch();
    if (!$voteRow) {
        throw new InvalidArgumentException('Игрок ещё не голосовал');
    }
    if ((int) $voteRow['choice'] === $goOption) {
        throw new InvalidArgumentException('Игрок уже в очереди «еду»');
    }

    db_ensure_group_member($pdo, $userId, $gameId);
    $pdo->prepare(
        'UPDATE votes SET choice = ?, voted_at = NOW() WHERE user_id = ? AND group_id = ?'
    )->execute([$goOption, $userId, $gameId]);

    db_clear_field_go_queue_slot($pdo, $gameId, $userId);

    $positionCol = db_column_exists($pdo, 'roster_members', 'position')
        ? 'rm.position'
        : 'u.position';
    $posStmt = $pdo->prepare(
        "SELECT {$positionCol} AS member_position FROM roster_members rm WHERE roster_id = ? AND user_id = ? LIMIT 1"
    );
    $posStmt->execute([$rosterId, $userId]);
    $posRow = $posStmt->fetch();
    if ($posRow && ($posRow['member_position'] ?? 'player') !== 'goalie') {
        $candidates = db_collect_field_go_candidates($pdo, $gameId, $rosterId, $game, $viewer);
        if ($candidates !== []) {
            db_persist_field_go_queue($pdo, $gameId, db_order_field_go_candidates($candidates));
        }
    }
}

function db_allocate_guest_phone(PDO $pdo): string
{
    for ($i = 0; $i < 25; $i++) {
        $suffix = (string) random_int(100000000, 999999999);
        $phone = '79' . $suffix;
        if (db_find_user_id_by_phone($pdo, $phone) === null) {
            return $phone;
        }
    }
    throw new RuntimeException('Не удалось выделить телефон для гостя');
}

/** Гость только на эту игру; display_login = имя в списке. */
function db_create_game_guest(PDO $pdo, int $gameId, string $name, string $position = 'player'): int
{
    $name = trim($name);
    $err = api_validate_display_login($name);
    if ($err !== null) {
        throw new InvalidArgumentException($err);
    }
    if (api_display_login_taken($name)) {
        throw new InvalidArgumentException('Такой ник уже занят в приложении');
    }
    if (!in_array($position, ['player', 'goalie'], true)) {
        $position = 'player';
    }

    $phone = db_allocate_guest_phone($pdo);
    $hash = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $pdo->prepare(
        'INSERT INTO users (phone, password_hash, display_login, role, position, must_change_password, is_active)
         VALUES (?, ?, ?, ?, ?, 0, 0)'
    )->execute([$phone, $hash, $name, 'player', $position]);

    $userId = (int) $pdo->lastInsertId();
    $pdo->prepare(
        'INSERT INTO group_members (user_id, group_id, actual, is_guest) VALUES (?, ?, 0, 1)'
    )->execute([$userId, $gameId]);

    return $userId;
}

function db_is_game_guest(PDO $pdo, int $gameId, int $userId): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM group_members WHERE user_id = ? AND group_id = ? AND is_guest = 1 LIMIT 1'
    );
    $stmt->execute([$userId, $gameId]);

    return (bool) $stmt->fetchColumn();
}

/** Удалить гостя с игры (не «не еду» — запись гостя снимается). */
function db_remove_game_guest(
    PDO $pdo,
    int $gameId,
    int $rosterId,
    array $game,
    array $viewer,
    int $userId
): void {
    if (!db_is_game_guest($pdo, $gameId, $userId)) {
        throw new InvalidArgumentException('Игрок не является гостем этой игры');
    }

    $pdo->prepare('DELETE FROM votes WHERE user_id = ? AND group_id = ?')->execute([$userId, $gameId]);
    $pdo->prepare('DELETE FROM group_members WHERE user_id = ? AND group_id = ?')->execute([$userId, $gameId]);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

    $remaining = db_collect_field_go_candidates($pdo, $gameId, $rosterId, $game, $viewer);
    if ($remaining !== []) {
        db_persist_field_go_queue($pdo, $gameId, db_order_field_go_candidates($remaining));
    }
}

function db_add_guest_to_queue(
    PDO $pdo,
    int $gameId,
    int $rosterId,
    array $game,
    array $viewer,
    string $guestName,
    int $queuePosition,
    string $memberPosition = 'player'
): void {
    if (!in_array($memberPosition, ['player', 'goalie'], true)) {
        $memberPosition = 'player';
    }

    $userId = db_create_game_guest($pdo, $gameId, $guestName, $memberPosition);
    $goOption = (int) ($game['vote_go_option'] ?? 1);

    if ($memberPosition === 'goalie') {
        db_ensure_field_go_vote($pdo, $gameId, $userId, $goOption);

        return;
    }

    db_set_field_go_queue_position($pdo, $gameId, $rosterId, $game, $viewer, $userId, $queuePosition);
}

function db_sync_roster_to_game(PDO $pdo, int $rosterId, int $gameId): void
{
    $stmt = $pdo->prepare(
        'SELECT user_id FROM roster_members WHERE roster_id = ?'
    );
    $stmt->execute([$rosterId]);
    $ins = $pdo->prepare(
        'INSERT IGNORE INTO group_members (user_id, group_id, actual)
         VALUES (?, ?, 1)'
    );
    while ($row = $stmt->fetch()) {
        $ins->execute([(int) $row['user_id'], $gameId]);
    }
}
