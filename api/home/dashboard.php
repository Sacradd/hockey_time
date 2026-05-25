<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';
require dirname(__DIR__) . '/lib/games.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    api_json_response(['ok' => false, 'error' => 'Метод GET'], 405);
}

try {
    $viewer = api_require_user();
    $userId = (int) $viewer['id'];
    $pdo = api_db();

    $pdo->prepare(
        'UPDATE day_groups dg
         INNER JOIN roster_members rm ON rm.roster_id = dg.roster_id AND rm.user_id = ?
         SET dg.vote_active = 0
         WHERE dg.vote_active = 1
           AND dg.vote_ends_at IS NOT NULL AND dg.vote_ends_at <= NOW()'
    )->execute([$userId]);

    if (api_is_super($viewer)) {
        $adminStmt = $pdo->prepare(
            'SELECT r.id, r.title, r.venue, r.weekday,
                    (SELECT COUNT(*) FROM roster_members rm2 WHERE rm2.roster_id = r.id) AS members_count,
                    (SELECT COUNT(*) FROM day_groups dg WHERE dg.roster_id = r.id) AS games_count,
                    COALESCE(rm.is_admin, 1) AS is_admin
             FROM rosters r
             LEFT JOIN roster_members rm ON rm.roster_id = r.id AND rm.user_id = ?
             ORDER BY r.title ASC'
        );
        $adminStmt->execute([$userId]);
    } else {
        $adminStmt = $pdo->prepare(
            'SELECT r.id, r.title, r.venue, r.weekday,
                    (SELECT COUNT(*) FROM roster_members rm2 WHERE rm2.roster_id = r.id) AS members_count,
                    (SELECT COUNT(*) FROM day_groups dg WHERE dg.roster_id = r.id) AS games_count,
                    rm.is_admin
             FROM rosters r
             INNER JOIN roster_members rm ON rm.roster_id = r.id AND rm.user_id = ?
             WHERE rm.is_admin = 1
             ORDER BY r.title ASC'
        );
        $adminStmt->execute([$userId]);
    }

    $adminRosters = [];
    while ($row = $adminStmt->fetch()) {
        if (!api_is_super($viewer) && !(bool) $row['is_admin']) {
            continue;
        }
        $adminRosters[] = [
            'id' => (int) $row['id'],
            'title' => $row['title'],
            'venue' => $row['venue'],
            'weekday' => $row['weekday'] !== null ? (int) $row['weekday'] : null,
            'members_count' => (int) $row['members_count'],
            'games_count' => (int) $row['games_count'],
            'is_admin' => (bool) $row['is_admin'],
        ];
    }

    db_ensure_teams_published_column($pdo);
    db_ensure_archived_at_column($pdo);

    $gamesStmt = $pdo->prepare(
        'SELECT dg.id, dg.group_date, dg.title, dg.vote_active, dg.payment_active,
                dg.teams_published, dg.vote_ends_at,
                r.id AS roster_id, r.title AS roster_title, r.venue AS roster_venue
         FROM day_groups dg
         INNER JOIN rosters r ON r.id = dg.roster_id
         INNER JOIN roster_members rm ON rm.roster_id = dg.roster_id AND rm.user_id = ?
         WHERE dg.archived_at IS NULL
           AND (
             dg.group_date >= CURDATE()
             OR dg.vote_active = 1
             OR dg.payment_active = 1
             OR dg.teams_published = 1
           )
         ORDER BY dg.group_date ASC, dg.id ASC'
    );
    $gamesStmt->execute([$userId]);

    $activeGames = [];
    while ($row = $gamesStmt->fetch()) {
        $rosterId = (int) $row['roster_id'];
        $activeGames[] = [
            'id' => (int) $row['id'],
            'group_date' => $row['group_date'],
            'title' => $row['title'],
            'vote_active' => (bool) $row['vote_active'],
            'vote_open' => db_vote_is_open($row),
            'vote_ends_at' => $row['vote_ends_at'],
            'payment_active' => (bool) $row['payment_active'],
            'teams_published' => (bool) ($row['teams_published'] ?? false),
            'roster_id' => $rosterId,
            'roster_title' => $row['roster_title'],
            'roster_venue' => $row['roster_venue'],
            'can_manage' => api_can_manage_roster($viewer, $rosterId),
        ];
    }

    api_json_response([
        'ok' => true,
        'admin_rosters' => $adminRosters,
        'active_games' => $activeGames,
        'can_create_roster' => api_can_create_roster($viewer),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
