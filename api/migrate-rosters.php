<?php

declare(strict_types=1);

/**
 * Миграция на roster + position (для уже установленной БД).
 * GET /api/migrate-rosters.php?secret=local-dev-secret
 */

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/db.php';

$secret = $_GET['secret'] ?? '';
$expected = (string) (api_config()['install_secret'] ?? '');
if ($expected === '' || !hash_equals($expected, $secret)) {
    api_json_response(['ok' => false, 'error' => 'Неверный secret'], 403);
}

try {
    $pdo = api_db();
    $steps = [];

    if (!db_table_exists($pdo, 'rosters')) {
        $pdo->exec(
            "CREATE TABLE rosters (
              id INT UNSIGNED NOT NULL AUTO_INCREMENT,
              title VARCHAR(128) NOT NULL,
              venue VARCHAR(128) NULL,
              weekday TINYINT UNSIGNED NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $steps[] = 'rosters created';
    }

    if (!db_table_exists($pdo, 'roster_members')) {
        $pdo->exec(
            "CREATE TABLE roster_members (
              id INT UNSIGNED NOT NULL AUTO_INCREMENT,
              roster_id INT UNSIGNED NOT NULL,
              user_id INT UNSIGNED NOT NULL,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              UNIQUE KEY uk_roster_members (roster_id, user_id),
              CONSTRAINT fk_rm_roster FOREIGN KEY (roster_id) REFERENCES rosters (id) ON DELETE CASCADE,
              CONSTRAINT fk_rm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $steps[] = 'roster_members created';
    }

    if (!db_column_exists($pdo, 'users', 'position')) {
        $pdo->exec("ALTER TABLE users ADD COLUMN position ENUM('player','goalie') NOT NULL DEFAULT 'player' AFTER role");
        $steps[] = 'users.position added';
    }

    if (!db_column_exists($pdo, 'users', 'favorite_team')) {
        $pdo->exec('ALTER TABLE users ADD COLUMN favorite_team VARCHAR(32) NULL AFTER display_login');
        $steps[] = 'users.favorite_team added';
    }

    try {
        $pdo->exec(
            "ALTER TABLE users MODIFY role ENUM('super','admin','player') NOT NULL DEFAULT 'player'"
        );
        $steps[] = 'users.role + super';
    } catch (Throwable $e) {
        // already has super
    }

    $steps[] = 'super: см. migrate-dev-super.php для admin/admin (локально)';

    if (!db_column_exists($pdo, 'roster_members', 'is_admin')) {
        $pdo->exec('ALTER TABLE roster_members ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER user_id');
        $steps[] = 'roster_members.is_admin added';
    }

    $pdo->exec(
        "UPDATE roster_members rm
         INNER JOIN users u ON u.id = rm.user_id
         SET rm.is_admin = 1
         WHERE u.role IN ('super', 'admin')"
    );
    $steps[] = 'roster_members.is_admin set for super/admin users';

    if (!db_column_exists($pdo, 'roster_members', 'position')) {
        $pdo->exec(
            "ALTER TABLE roster_members ADD COLUMN position ENUM('player','goalie') NOT NULL DEFAULT 'player' AFTER is_admin"
        );
        $pdo->exec(
            'UPDATE roster_members rm
             INNER JOIN users u ON u.id = rm.user_id
             SET rm.position = u.position'
        );
        $steps[] = 'roster_members.position added';
    }

    try {
        $pdo->exec('ALTER TABLE users ADD UNIQUE KEY uk_users_display_login (display_login)');
        $steps[] = 'users.display_login unique';
    } catch (Throwable $e) {
        // duplicates or exists
    }

    if (!db_column_exists($pdo, 'day_groups', 'roster_id')) {
        $pdo->exec('ALTER TABLE day_groups ADD COLUMN roster_id INT UNSIGNED NULL AFTER id');
        $steps[] = 'day_groups.roster_id added';
    }

    foreach (['vote_label_1', 'vote_label_2', 'vote_label_3'] as $col) {
        if (!db_column_exists($pdo, 'day_groups', $col)) {
            $pdo->exec("ALTER TABLE day_groups ADD COLUMN {$col} VARCHAR(64) NULL");
            $steps[] = "day_groups.{$col} added";
        }
    }

    if (!db_column_exists($pdo, 'day_groups', 'vote_go_option')) {
        $pdo->exec('ALTER TABLE day_groups ADD COLUMN vote_go_option TINYINT UNSIGNED NOT NULL DEFAULT 1');
        $steps[] = 'day_groups.vote_go_option added';
    }

    if (!db_column_exists($pdo, 'votes', 'choice')) {
        $pdo->exec('ALTER TABLE votes ADD COLUMN choice TINYINT UNSIGNED NOT NULL DEFAULT 1');
        $steps[] = 'votes.choice added';
    }

    $rosterId = db_upsert_roster($pdo, 'Среда · ЛД Кристалл', 'Кристалл', 3);
    $steps[] = 'roster id=' . $rosterId;

    $pdo->prepare('UPDATE day_groups SET roster_id = ? WHERE roster_id IS NULL')->execute([$rosterId]);

    $insRm = $pdo->prepare(
        'INSERT IGNORE INTO roster_members (roster_id, user_id)
         SELECT ?, gm.user_id FROM group_members gm
         INNER JOIN day_groups dg ON dg.id = gm.group_id'
    );
    $insRm->execute([$rosterId]);
    $steps[] = 'roster_members filled from group_members';

    try {
        $pdo->exec('ALTER TABLE day_groups DROP INDEX uk_day_groups_date');
        $steps[] = 'dropped uk_day_groups_date';
    } catch (Throwable $e) {
        // already dropped
    }

    try {
        $pdo->exec('ALTER TABLE day_groups ADD UNIQUE KEY uk_roster_date (roster_id, group_date)');
        $steps[] = 'uk_roster_date added';
    } catch (Throwable $e) {
        // exists
    }

    $pdo->exec(
        'ALTER TABLE day_groups MODIFY roster_id INT UNSIGNED NOT NULL'
    );

    if (!db_table_exists($pdo, 'game_match_teams')) {
        $pdo->exec(
            "CREATE TABLE game_match_teams (
              id INT UNSIGNED NOT NULL AUTO_INCREMENT,
              group_id INT UNSIGNED NOT NULL,
              user_id INT UNSIGNED NOT NULL,
              team ENUM('white','black') NOT NULL,
              updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              UNIQUE KEY uk_match_teams_user_group (user_id, group_id),
              KEY idx_match_teams_group (group_id),
              CONSTRAINT fk_match_teams_group FOREIGN KEY (group_id) REFERENCES day_groups (id) ON DELETE CASCADE,
              CONSTRAINT fk_match_teams_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        );
        $steps[] = 'game_match_teams created';
    }

    api_json_response(['ok' => true, 'message' => 'Миграция roster завершена', 'steps' => $steps]);
} catch (Throwable $e) {
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}
