<?php

declare(strict_types=1);

function db_run_sql_file(PDO $pdo, string $path): void
{
    $sql = (string) file_get_contents($path);
    $sql = preg_replace('/--.*$/m', '', $sql) ?? $sql;
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }
}

function db_table_exists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1'
    );
    $stmt->execute([$table]);
    return (bool) $stmt->fetchColumn();
}

function db_column_exists(PDO $pdo, string $table, string $column): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1'
    );
    $stmt->execute([$table, $column]);
    return (bool) $stmt->fetchColumn();
}

function db_upsert_user(
    PDO $pdo,
    string $phone,
    string $plainPassword,
    string $role,
    string $position,
    bool $mustChangePassword,
    bool $isActive
): int {
    $hash = password_hash($plainPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare('SELECT id FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        $upd = $pdo->prepare(
            'UPDATE users SET password_hash = ?, role = ?, position = ?,
             must_change_password = ?, is_active = ? WHERE id = ?'
        );
        $upd->execute([
            $hash,
            $role,
            $position,
            $mustChangePassword ? 1 : 0,
            $isActive ? 1 : 0,
            (int) $existing,
        ]);
        return (int) $existing;
    }

    $ins = $pdo->prepare(
        'INSERT INTO users (phone, password_hash, role, position, must_change_password, is_active)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $phone,
        $hash,
        $role,
        $position,
        $mustChangePassword ? 1 : 0,
        $isActive ? 1 : 0,
    ]);

    return (int) $pdo->lastInsertId();
}

function db_link_roster_member(PDO $pdo, int $rosterId, int $userId, string $position = 'player'): void
{
    if (!in_array($position, ['player', 'goalie'], true)) {
        $position = 'player';
    }

    if (db_column_exists($pdo, 'roster_members', 'position')) {
        $stmt = $pdo->prepare(
            'INSERT INTO roster_members (roster_id, user_id, position)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE position = VALUES(position)'
        );
        $stmt->execute([$rosterId, $userId, $position]);
        return;
    }

    $stmt = $pdo->prepare(
        'INSERT IGNORE INTO roster_members (roster_id, user_id) VALUES (?, ?)'
    );
    $stmt->execute([$rosterId, $userId]);
}

function db_find_user_id_by_phone(PDO $pdo, string $phone): ?int
{
    $stmt = $pdo->prepare('SELECT id FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $id = $stmt->fetchColumn();
    return $id !== false ? (int) $id : null;
}

/** @throws InvalidArgumentException */
function db_create_player_user(PDO $pdo, string $phone, string $plainPassword): int
{
    if (db_find_user_id_by_phone($pdo, $phone) !== null) {
        throw new InvalidArgumentException('Игрок с таким телефоном уже есть — добавьте из списка');
    }

    $hash = password_hash($plainPassword, PASSWORD_DEFAULT);
    $ins = $pdo->prepare(
        'INSERT INTO users (phone, password_hash, role, position, must_change_password, is_active)
         VALUES (?, ?, ?, ?, 1, 0)'
    );
    $ins->execute([$phone, $hash, 'player', 'player']);
    return (int) $pdo->lastInsertId();
}

function db_roster_has_member(PDO $pdo, int $rosterId, int $userId): bool
{
    $stmt = $pdo->prepare(
        'SELECT 1 FROM roster_members WHERE roster_id = ? AND user_id = ? LIMIT 1'
    );
    $stmt->execute([$rosterId, $userId]);
    return (bool) $stmt->fetchColumn();
}

function db_set_roster_admin(PDO $pdo, int $rosterId, int $userId, bool $isAdmin): void
{
    try {
        $pdo->prepare(
            'UPDATE roster_members SET is_admin = ? WHERE roster_id = ? AND user_id = ?'
        )->execute([$isAdmin ? 1 : 0, $rosterId, $userId]);
    } catch (Throwable $e) {
        // колонка is_admin появится после миграции
    }
}

function db_create_roster(PDO $pdo, string $title, ?string $venue, ?int $weekday): int
{
    $ins = $pdo->prepare('INSERT INTO rosters (title, venue, weekday) VALUES (?, ?, ?)');
    $ins->execute([$title, $venue, $weekday]);

    return (int) $pdo->lastInsertId();
}

function db_upsert_roster(PDO $pdo, string $title, ?string $venue, ?int $weekday): int
{
    $stmt = $pdo->prepare('SELECT id FROM rosters WHERE title = ? LIMIT 1');
    $stmt->execute([$title]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        $pdo->prepare('UPDATE rosters SET venue = ?, weekday = ? WHERE id = ?')
            ->execute([$venue, $weekday, (int) $existing]);
        return (int) $existing;
    }

    $ins = $pdo->prepare('INSERT INTO rosters (title, venue, weekday) VALUES (?, ?, ?)');
    $ins->execute([$title, $venue, $weekday]);
    return (int) $pdo->lastInsertId();
}

function db_upsert_game(PDO $pdo, int $rosterId, string $date, ?string $title): int
{
    $stmt = $pdo->prepare('SELECT id FROM day_groups WHERE roster_id = ? AND group_date = ? LIMIT 1');
    $stmt->execute([$rosterId, $date]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        if ($title !== null) {
            $pdo->prepare('UPDATE day_groups SET title = ? WHERE id = ?')->execute([$title, (int) $existing]);
        }
        return (int) $existing;
    }

    $ins = $pdo->prepare('INSERT INTO day_groups (roster_id, group_date, title) VALUES (?, ?, ?)');
    $ins->execute([$rosterId, $date, $title]);
    return (int) $pdo->lastInsertId();
}
