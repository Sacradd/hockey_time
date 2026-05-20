<?php
/**
 * Конфиг для XAMPP (Apache + MySQL в htdocs/go_hockey).
 */
return [
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'hockey_time',
        'user' => 'root',
        'pass' => '',
        'charset' => 'utf8mb4',
    ],
    'install_secret' => 'local-dev-secret',
];
