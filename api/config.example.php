<?php
/**
 * Скопируйте в config.local.php и заполните данными из панели reg.ru (MySQL).
 * config.local.php в git не попадает.
 */
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'u123456_hockey',
        'user' => 'u123456_hockey',
        'pass' => 'ВАШ_ПАРОЛЬ_MYSQL',
        'charset' => 'utf8mb4',
    ],
    /** Секрет для одноразового install.php — любая длинная строка */
    'install_secret' => 'замените-на-случайную-строку',
    /** Подпись токенов входа (локально можно local-dev-secret) */
    'token_secret' => 'замените-на-случайную-строку',
];
