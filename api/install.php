<?php

declare(strict_types=1);

/**
 * Одноразовая установка: таблицы + первая группа и пользователи из database/seed.json
 *
 * Вызов: GET /api/install.php?secret=ВАШ_install_secret
 * После успеха удалите этот файл с хостинга.
 */

require __DIR__ . '/bootstrap.php';

$secret = $_GET['secret'] ?? '';
$expected = (string) (api_config()['install_secret'] ?? '');
if ($expected === '' || !hash_equals($expected, $secret)) {
    api_json_response(['ok' => false, 'error' => 'Неверный secret'], 403);
}

$seedPath = dirname(__DIR__) . '/database/seed.json';
if (!is_file($seedPath)) {
    api_json_response([
        'ok' => false,
        'error' => 'Нет database/seed.json — скопируйте database/seed.example.json',
    ], 400);
}

$seed = json_decode((string) file_get_contents($seedPath), true);
if (!is_array($seed)) {
    api_json_response(['ok' => false, 'error' => 'Некорректный JSON в seed.json'], 400);
}

try {
    $pdo = api_db();
    run_schema($pdo, dirname(__DIR__) . '/database/schema.sql');

    $adminPhone = api_normalize_phone((string) ($seed['admin']['phone'] ?? ''));
    $adminPass = (string) ($seed['admin']['password'] ?? '');
    if ($adminPass === '') {
        throw new InvalidArgumentException('admin.password пустой');
    }

    $groupDate = (string) ($seed['group']['date'] ?? '');
    $groupTitle = isset($seed['group']['title']) ? (string) $seed['group']['title'] : null;
    if ($groupDate === '') {
        throw new InvalidArgumentException('group.date обязателен (YYYY-MM-DD)');
    }

    $pdo->beginTransaction();

    $adminId = upsert_user($pdo, $adminPhone, $adminPass, 'admin', false, true);
    $groupId = upsert_day_group($pdo, $groupDate, $groupTitle);
    link_member($pdo, $adminId, $groupId, true);

    $playersCreated = 0;
    foreach ($seed['players'] ?? [] as $row) {
        if (!is_array($row)) {
            continue;
        }
        $phone = api_normalize_phone((string) ($row['phone'] ?? ''));
        $pass = (string) ($row['password'] ?? '');
        if ($pass === '') {
            throw new InvalidArgumentException('Пустой пароль у игрока ' . $phone);
        }
        $userId = upsert_user($pdo, $phone, $pass, 'player', true, false);
        link_member($pdo, $userId, $groupId, false);
        $playersCreated++;
    }

    $pdo->commit();

    api_json_response([
        'ok' => true,
        'message' => 'Установка завершена. Удалите api/install.php с сервера.',
        'admin_phone' => $adminPhone,
        'group_date' => $groupDate,
        'players' => $playersCreated,
    ]);
} catch (Throwable $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    api_json_response(['ok' => false, 'error' => $e->getMessage()], 500);
}

function run_schema(PDO $pdo, string $path): void
{
    $sql = (string) file_get_contents($path);
    $sql = preg_replace('/--.*$/m', '', $sql) ?? $sql;
    foreach (array_filter(array_map('trim', explode(';', $sql))) as $statement) {
        if ($statement !== '') {
            $pdo->exec($statement);
        }
    }
}

function upsert_user(
    PDO $pdo,
    string $phone,
    string $plainPassword,
    string $role,
    bool $mustChangePassword,
    bool $isActive
): int {
    $hash = password_hash($plainPassword, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare(
        'SELECT id FROM users WHERE phone = ? LIMIT 1'
    );
    $stmt->execute([$phone]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        $upd = $pdo->prepare(
            'UPDATE users SET password_hash = ?, role = ?, must_change_password = ?, is_active = ? WHERE id = ?'
        );
        $upd->execute([
            $hash,
            $role,
            $mustChangePassword ? 1 : 0,
            $isActive ? 1 : 0,
            (int) $existing,
        ]);
        return (int) $existing;
    }

    $ins = $pdo->prepare(
        'INSERT INTO users (phone, password_hash, role, must_change_password, is_active)
         VALUES (?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $phone,
        $hash,
        $role,
        $mustChangePassword ? 1 : 0,
        $isActive ? 1 : 0,
    ]);

    return (int) $pdo->lastInsertId();
}

function upsert_day_group(PDO $pdo, string $date, ?string $title): int
{
    $stmt = $pdo->prepare('SELECT id FROM day_groups WHERE group_date = ? LIMIT 1');
    $stmt->execute([$date]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        if ($title !== null) {
            $pdo->prepare('UPDATE day_groups SET title = ? WHERE id = ?')->execute([$title, (int) $existing]);
        }
        return (int) $existing;
    }

    $ins = $pdo->prepare('INSERT INTO day_groups (group_date, title) VALUES (?, ?)');
    $ins->execute([$date, $title]);
    return (int) $pdo->lastInsertId();
}

function link_member(PDO $pdo, int $userId, int $groupId, bool $actual): void
{
    $stmt = $pdo->prepare(
        'INSERT INTO group_members (user_id, group_id, actual)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE actual = VALUES(actual)'
    );
    $stmt->execute([$userId, $groupId, $actual ? 1 : 0]);
}
