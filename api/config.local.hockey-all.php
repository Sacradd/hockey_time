<?php
/**
 * Prod: hockey-all.ru (reg.ru).
 * 1. В панели создайте БД и пользователя с именем uXXXXXX_hockey_all
 * 2. Скопируйте этот файл на сервер как api/config.local.php
 * 3. Подставьте префикс uXXXXXX и пароль из панели
 */
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'uXXXXXX_hockey_all',
        'user' => 'uXXXXXX_hockey_all',
        'pass' => 'ПАРОЛЬ_ИЗ_ПАНЕЛИ_REG.RU',
        'charset' => 'utf8mb4',
    ],
    'install_secret' => 'придумайте-длинный-secret-для-install',
    'token_secret' => 'придумайте-другой-secret-для-токенов',
];
