<?php
/**
 * Конфиг для Laragon (PHP + MySQL без Docker).
 * Создайте БД hockey_time в HeidiSQL / phpMyAdmin, затем setup-laragon.
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
    'token_secret' => 'local-dev-secret',
    'debug' => true,
];
