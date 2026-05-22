<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
require __DIR__ . '/lib/auth.php';

$secret = $_GET['secret'] ?? '';
$expected = (string) (api_config()['install_secret'] ?? '');
if ($expected === '' || !hash_equals($expected, $secret)) {
    api_json_response(['ok' => false, 'error' => 'Неверный secret'], 403);
}

$pdo = api_db();
$rows = $pdo->query(
    "SELECT id, phone, display_login, role, is_active, must_change_password,
            LEFT(password_hash, 20) AS hash_prefix
     FROM users WHERE role = 'super' OR LOWER(display_login) = 'admin' OR phone LIKE '%9000000001%'"
)->fetchAll(PDO::FETCH_ASSOC);

$admin = api_find_user_by_login($pdo, 'admin');
$verify = $admin ? password_verify('admin', (string) $admin['password_hash']) : false;

api_json_response([
    'ok' => true,
    'rows' => $rows,
    'find_admin' => $admin ? [
        'id' => (int) $admin['id'],
        'phone' => $admin['phone'],
        'display_login' => $admin['display_login'] ?? null,
        'role' => $admin['role'],
        'is_active' => (bool) $admin['is_active'],
    ] : null,
    'password_verify_admin' => $verify,
]);
