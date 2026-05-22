<?php

declare(strict_types=1);

/**
 * Локальная учётка super: ник admin, пароль admin, тел. 79000000001.
 * GET /api/migrate-dev-super.php?secret=local-dev-secret
 */

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/auth.php';
require __DIR__ . '/lib/db.php';

$secret = $_GET['secret'] ?? '';
$expected = (string) (api_config()['install_secret'] ?? '');
if ($expected === '' || !hash_equals($expected, $secret)) {
    api_json_response(['ok' => false, 'error' => 'Неверный secret'], 403);
}

$devPhone = api_normalize_phone('79000000001');
$devLogin = 'admin';
$devPass = 'admin';

try {
    $pdo = api_db();
    $nickError = api_validate_display_login($devLogin);
    if ($nickError !== null) {
        api_json_response(['ok' => false, 'error' => $nickError], 400);
    }

    $hash = password_hash($devPass, PASSWORD_DEFAULT);

    $candidates = $pdo->query(
        "SELECT id FROM users
         WHERE role = 'super'
            OR phone IN ('79000000001', '79680227771', '89000000001')
            OR LOWER(display_login) = 'admin'
         ORDER BY id ASC"
    )->fetchAll(PDO::FETCH_COLUMN);

    $ids = array_values(array_unique(array_map('intval', $candidates ?: [])));

    if ($ids === []) {
        $pdo->prepare(
            'INSERT INTO users (phone, password_hash, role, position, must_change_password, is_active, display_login)
             VALUES (?, ?, \'super\', \'player\', 0, 1, ?)'
        )->execute([$devPhone, $hash, $devLogin]);

        api_json_response([
            'ok' => true,
            'message' => 'Super создан',
            'login' => $devLogin,
            'password' => $devPass,
            'phone_display' => api_format_phone_display($devPhone),
        ]);
    }

    $keeperId = $ids[0];
    $demoted = [];

    foreach ($ids as $id) {
        if ($id === $keeperId) {
            continue;
        }
        $pdo->prepare("UPDATE users SET role = 'player' WHERE id = ?")->execute([$id]);
        $demoted[] = $id;
    }

    $conflict = $pdo->prepare('SELECT id FROM users WHERE phone = ? AND id != ? LIMIT 1');
    $conflict->execute([$devPhone, $keeperId]);
    if ($conflict->fetchColumn()) {
        api_json_response(['ok' => false, 'error' => 'Телефон 79000000001 занят другим пользователем'], 409);
    }

    $loginTaken = $pdo->prepare(
        'SELECT id FROM users WHERE LOWER(display_login) = LOWER(?) AND id != ? LIMIT 1'
    );
    $loginTaken->execute([$devLogin, $keeperId]);
    if ($loginTaken->fetchColumn()) {
        $pdo->prepare('UPDATE users SET display_login = NULL WHERE LOWER(display_login) = LOWER(?) AND id != ?')
            ->execute([$devLogin, $keeperId]);
    }

    $pdo->prepare(
        'UPDATE users SET phone = ?, display_login = ?, password_hash = ?,
         must_change_password = 0, is_active = 1, role = \'super\'
         WHERE id = ?'
    )->execute([$devPhone, $devLogin, $hash, $keeperId]);

    $row = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
    $row->execute([$keeperId]);
    $stored = $row->fetchColumn();
    $verify = is_string($stored) && password_verify($devPass, $stored);

    api_json_response([
        'ok' => true,
        'message' => 'Super сброшен для разработки',
        'user_id' => $keeperId,
        'login' => $devLogin,
        'password' => $devPass,
        'phone' => $devPhone,
        'phone_display' => api_format_phone_display($devPhone),
        'password_ok' => $verify,
        'demoted_extra_super_ids' => $demoted,
        'hint' => 'Вход: ник admin или телефон ' . api_format_phone_display($devPhone) . ', пароль admin',
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
