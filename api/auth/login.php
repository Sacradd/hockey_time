<?php

declare(strict_types=1);

require dirname(__DIR__) . '/bootstrap.php';
require dirname(__DIR__) . '/lib/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    api_json_response(['ok' => false, 'error' => 'Метод POST'], 405);
}

try {
    $body = api_read_json_body();
    $phoneRaw = (string) ($body['phone'] ?? $body['login'] ?? '');
    $password = (string) ($body['password'] ?? '');

    if ($phoneRaw === '' || $password === '') {
        api_json_response(['ok' => false, 'error' => 'Введите телефон и пароль'], 400);
    }

    try {
        $phone = api_normalize_phone($phoneRaw);
    } catch (InvalidArgumentException $e) {
        api_json_response(['ok' => false, 'error' => $e->getMessage()], 400);
    }

    $stmt = api_db()->prepare('SELECT * FROM users WHERE phone = ? LIMIT 1');
    $stmt->execute([$phone]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, (string) $user['password_hash'])) {
        api_json_response(['ok' => false, 'error' => 'Неверный логин или пароль'], 401);
    }

    api_json_response([
        'ok' => true,
        'token' => api_issue_token((int) $user['id']),
        'user' => api_user_public($user),
    ]);
} catch (Throwable $e) {
    api_handle_exception($e);
}
