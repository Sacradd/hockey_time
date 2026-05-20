<?php

declare(strict_types=1);

register_shutdown_function(static function (): void {
    $err = error_get_last();
    if ($err === null || !in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }
    if (headers_sent()) {
        return;
    }
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'ok' => false,
        'error' => 'Fatal: ' . $err['message'],
        'file' => $err['file'],
        'line' => $err['line'],
    ], JSON_UNESCAPED_UNICODE);
});

function api_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $local = __DIR__ . '/config.local.php';
    if (!is_file($local)) {
        throw new RuntimeException('Создайте api/config.local.php из api/config.example.php');
    }

    $config = require $local;
    return $config;
}

function api_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = api_config()['db'];
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $cfg['host'],
        (int) $cfg['port'],
        $cfg['name'],
        $cfg['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}

function api_format_phone_display(string $phone): string
{
    if (strlen($phone) === 11 && $phone[0] === '7') {
        return '8' . substr($phone, 1);
    }
    return $phone;
}

function api_normalize_phone(string $phone): string
{
    $digits = preg_replace('/\D+/', '', $phone) ?? '';
    if (strlen($digits) === 11 && $digits[0] === '8') {
        $digits = '7' . substr($digits, 1);
    }
    if (strlen($digits) === 10) {
        $digits = '7' . $digits;
    }
    // Лишняя 8 в начале: 7896... → 796...
    if (strlen($digits) === 12 && strpos($digits, '78') === 0) {
        $digits = '7' . substr($digits, 2);
    }
    if (strlen($digits) !== 11 || $digits[0] !== '7') {
        throw new InvalidArgumentException('Некорректный телефон: ' . $phone);
    }
    return $digits;
}

function api_is_debug(): bool
{
    return !empty(api_config()['debug']);
}

function api_json_response(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function api_handle_exception(Throwable $e): void
{
    if (api_is_debug()) {
        api_json_response([
            'ok' => false,
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
        ], 500);
    }
    api_json_response(['ok' => false, 'error' => 'Ошибка сервера'], 500);
}
