<?php

declare(strict_types=1);

function api_token_secret(): string
{
    $cfg = api_config();
    return (string) ($cfg['token_secret'] ?? $cfg['install_secret'] ?? 'dev-token-secret');
}

/** @return array{id:int,phone:string,display_login:?string,role:string,must_change_password:bool,is_active:bool} */
function api_user_public(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'phone' => $row['phone'],
        'display_login' => isset($row['display_login']) && $row['display_login'] !== null
            ? (string) $row['display_login']
            : null,
        'role' => $row['role'],
        'must_change_password' => (bool) $row['must_change_password'],
        'is_active' => (bool) $row['is_active'],
    ];
}

function api_issue_token(int $userId): string
{
    $exp = time() + 86400 * 30;
    $payload = $userId . '.' . $exp;
    $sig = hash_hmac('sha256', $payload, api_token_secret());
    return base64_encode($payload . '|' . $sig);
}

function api_verify_token(string $token): ?int
{
    $decoded = base64_decode($token, true);
    if ($decoded === false || strpos($decoded, '|') === false) {
        return null;
    }
    [$payload, $sig] = explode('|', $decoded, 2);
    if (strpos($payload, '.') === false) {
        return null;
    }
    [$userId, $exp] = explode('.', $payload, 2);
    if (!ctype_digit($userId) || !ctype_digit($exp)) {
        return null;
    }
    if ((int) $exp < time()) {
        return null;
    }
    $expected = hash_hmac('sha256', $payload, api_token_secret());
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    return (int) $userId;
}

function api_read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return [];
    }
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function api_get_authorization_header(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        if (is_array($headers)) {
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
    }
    return $header;
}

/** @return array<string, mixed> */
function api_require_user(): array
{
    $header = api_get_authorization_header();
    if (!preg_match('/Bearer\s+(\S+)/i', $header, $m)) {
        api_json_response(['ok' => false, 'error' => 'Требуется авторизация'], 401);
    }
    $userId = api_verify_token($m[1]);
    if ($userId === null) {
        api_json_response(['ok' => false, 'error' => 'Сессия истекла, войдите снова'], 401);
    }

    $stmt = api_db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        api_json_response(['ok' => false, 'error' => 'Пользователь не найден'], 401);
    }

    return $row;
}

function api_validate_display_login(string $login): ?string
{
    $login = trim($login);
    if ($login === '' || mb_strlen($login) < 2 || mb_strlen($login) > 32) {
        return 'Ник: от 2 до 32 символов';
    }
    if (!preg_match('/^[\p{L}\p{N}_\-.]+$/u', $login)) {
        return 'Ник: только буквы, цифры, _ - .';
    }
    return null;
}
