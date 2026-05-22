<?php

declare(strict_types=1);

/**
 * Сброс super в БД из CLI (без веб-сервера).
 * php scripts/reset-super-cli.php
 */

$root = dirname(__DIR__);
require $root . '/api/bootstrap.php';
require $root . '/api/lib/auth.php';
require $root . '/api/lib/db.php';

$devPhone = api_normalize_phone('79000000001');
$devLogin = 'admin';
$devPass = 'admin';
$hash = password_hash($devPass, PASSWORD_DEFAULT);

$pdo = api_db();

$super = $pdo->query("SELECT id, phone, display_login FROM users WHERE role = 'super' ORDER BY id LIMIT 1")->fetch();
if (!$super) {
    $pdo->prepare(
        'INSERT INTO users (phone, password_hash, role, position, must_change_password, is_active, display_login)
         VALUES (?, ?, \'super\', \'player\', 0, 1, ?)'
    )->execute([$devPhone, $hash, $devLogin]);
    echo "Created super: login admin, password admin\n";
    exit(0);
}

$id = (int) $super['id'];
$pdo->prepare(
    'UPDATE users SET phone = ?, display_login = ?, password_hash = ?,
     must_change_password = 0, is_active = 1, role = \'super\' WHERE id = ?'
)->execute([$devPhone, $devLogin, $hash, $id]);

$ok = password_verify($devPass, $hash);
echo "Updated user #$id (was phone {$super['phone']})\n";
echo "Login: admin (or phone " . api_format_phone_display($devPhone) . ")\n";
echo "Password: admin\n";
echo "Verify: " . ($ok ? 'ok' : 'FAIL') . "\n";
