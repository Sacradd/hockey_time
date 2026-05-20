<?php
/**
 * Конфиг для Docker (docker compose). Копируется в config.local.php скриптом setup-local.
 */
return [
    'db' => [
        'host' => 'mysql',
        'port' => 3306,
        'name' => 'hockey_time',
        'user' => 'hockey',
        'pass' => 'hockey',
        'charset' => 'utf8mb4',
    ],
    'install_secret' => 'local-dev-secret',
];
