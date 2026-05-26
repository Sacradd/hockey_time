<?php
/**
 * Скопируйте в config.local.php и заполните данными из панели reg.ru (MySQL).
 * Prod (hockey-all.ru): удобный шаблон — config.local.hockey-all.php
 * config.local.php в git не попадает.
 */
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'u123456_hockey_all',
        'user' => 'u123456_hockey_all',
        'pass' => 'ВАШ_ПАРОЛЬ_MYSQL',
        'charset' => 'utf8mb4',
    ],
    /** Секрет для одноразового install.php — любая длинная строка */
    'install_secret' => 'замените-на-случайную-строку',
    /** Подпись токенов входа (локально можно local-dev-secret) */
    'token_secret' => 'замените-на-случайную-строку',
    /**
     * Web Push (VAPID). Ключи: npm.cmd run generate-vapid (без сети — node scripts/generate-vapid.mjs)
     * subject — mailto: или https:// URL сайта
     */
    // 'vapid' => [
    //     'public_key' => '',
    //     'private_key' => '',
    //     'subject' => 'mailto:admin@example.com',
    // ],
];
