<?php

declare(strict_types=1);

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
                COALESCE(gm.excluded, 0) AS excluded
         FROM roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         LEFT JOIN group_members gm ON gm.user_id = rm.user_id AND gm.group_id = ?
         WHERE rm.roster_id = ?
         ORDER BY COALESCE(u.display_login, u.phone) ASC"
    );
    $stmt->execute([$gameId, $rosterId]);

    $fieldLineup = [];
    $fieldReserve = [];
    $fieldDeclined = [];
    $fieldPending = [];
    $goalieLineup = [];
    $goalieReserve = [];
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

        $isGo = $vote !== null && $vote['choice'] === $goOption;

        if ($pos === 'goalie') {
            if ($vote === null) {
                $goaliePending[] = $item;
            } elseif ($isGo) {
                if (count($goalieLineup) < 2) {
                    $goalieLineup[] = $item;
                } else {
                    $goalieReserve[] = $item;
                }
            } else {
                $goalieDeclined[] = $item;
            }
            continue;
        }

        if ($vote === null) {
            $fieldPending[] = $item;
        } elseif ($isGo) {
            if (count($fieldLineup) < 20) {
                $fieldLineup[] = $item;
            } else {
                $fieldReserve[] = $item;
            }
        } else {
            $fieldDeclined[] = $item;
        }
    }

    usort($fieldLineup, 'db_sort_by_voted_at');
    usort($fieldReserve, 'db_sort_by_voted_at');
    usort($goalieLineup, 'db_sort_by_voted_at');
    usort($goalieReserve, 'db_sort_by_voted_at');

    return [
        'field_lineup' => $fieldLineup,
        'field_reserve' => $fieldReserve,
        'field_declined' => $fieldDeclined,
        'field_pending' => $fieldPending,
        'goalie_lineup' => $goalieLineup,
        'goalie_reserve' => $goalieReserve,
        'goalie_declined' => $goalieDeclined,
        'goalie_pending' => $goaliePending,
    ];
}

/** @param array<string, mixed> $a
 * @param array<string, mixed> $b */
function db_sort_by_voted_at(array $a, array $b): int
{
    $ta = isset($a['voted_at']) ? strtotime((string) $a['voted_at']) : 0;
    $tb = isset($b['voted_at']) ? strtotime((string) $b['voted_at']) : 0;
    return $ta <=> $tb;
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
