<?php

declare(strict_types=1);

function api_token_secret(): string
{
    $cfg = api_config();
    return (string) ($cfg['token_secret'] ?? $cfg['install_secret'] ?? 'dev-token-secret');
}

/** @return array{id:int,phone:string,display_login:?string,favorite_team:?string,role:string,position:string,must_change_password:bool,is_active:bool} */
function api_user_public(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'phone' => $row['phone'],
        'display_login' => isset($row['display_login']) && $row['display_login'] !== null
            ? (string) $row['display_login']
            : null,
        'favorite_team' => isset($row['favorite_team']) && $row['favorite_team'] !== null
            ? (string) $row['favorite_team']
            : null,
        'role' => $row['role'],
        'position' => $row['position'] ?? 'player',
        'must_change_password' => (bool) $row['must_change_password'],
        'is_active' => (bool) $row['is_active'],
    ];
}

/** @return array<string, mixed> */
function api_require_admin(): array
{
    $user = api_require_user();
    if (!in_array($user['role'] ?? '', ['admin', 'super'], true)) {
        api_json_response(['ok' => false, 'error' => 'Только для администратора'], 403);
    }
    return $user;
}

function api_validate_position(string $position): bool
{
    return in_array($position, ['player', 'goalie'], true);
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

function api_is_super(array $user): bool
{
    return ($user['role'] ?? '') === 'super';
}

/** Телефон другого участника: только super, админ группы (позже is_admin), или сам пользователь. */
function api_can_view_member_phone(array $viewer, int $targetUserId, int $rosterId = 0): bool
{
    if ((int) $viewer['id'] === $targetUserId) {
        return true;
    }
    if (api_is_super($viewer)) {
        return true;
    }
    if (($viewer['role'] ?? '') === 'admin') {
        return true;
    }
    if ($rosterId > 0) {
        return api_is_roster_admin((int) $viewer['id'], $rosterId);
    }
    return false;
}

function api_is_roster_admin(int $userId, int $rosterId): bool
{
    try {
        $stmt = api_db()->prepare(
            'SELECT is_admin FROM roster_members WHERE roster_id = ? AND user_id = ? LIMIT 1'
        );
        $stmt->execute([$rosterId, $userId]);
        $row = $stmt->fetch();
        return $row && (bool) $row['is_admin'];
    } catch (Throwable $e) {
        return false;
    }
}

/** @return array<string, mixed> */
function api_member_list_item(array $row, array $viewer, int $rosterId): array
{
    $userId = (int) $row['user_id'];
    $item = [
        'user_id' => $userId,
        'name' => $row['display_login'] ?: api_format_phone_display((string) $row['phone']),
        'role' => $row['role'],
        'position' => $row['position'] ?? 'player',
    ];
    if (isset($row['actual'])) {
        $item['actual'] = (bool) $row['actual'];
    }
    if (isset($row['is_guest'])) {
        $item['is_guest'] = (bool) $row['is_guest'];
    }
    if (isset($row['excluded'])) {
        $item['excluded'] = (bool) $row['excluded'];
    }
    if (isset($row['is_active'])) {
        $item['is_active'] = (bool) $row['is_active'];
    }
    if (api_can_view_member_phone($viewer, $userId, $rosterId)) {
        $item['phone'] = api_format_phone_display((string) $row['phone']);
    }
    return $item;
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
