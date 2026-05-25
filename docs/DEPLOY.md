# Деплой на reg.ru (prod + HTTPS + PWA)

Чеклист перед выкладкой «Время хоккея» в интернет. После HTTPS можно тестировать PWA с иконки и готовить **Web Push** (следующий этап в коде).

## 1. Сборка фронта

```powershell
cd путь\к\go_hockey
npm.cmd run build
```

Папка **`dist/`** — залить в корень сайта (или в подкаталог, если API отдельно).

Перед сборкой: исправить TS в `SuperUsersPanel.tsx` (если `tsc` падает).

## 2. Backend (PHP + MySQL)

- Залить папку **`api/`** на хостинг (рядом с `dist` или как настроен vhost).
- MySQL: импорт **`database/schema.sql`** или миграции:
  - `https://ваш-домен/api/migrate-rosters.php` (один раз)
  - `https://ваш-домен/api/install.php` + секрет из конфига (если чистая БД)
- Создать **`api/config.local.php`** (не в git):

```php
<?php
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'ИМЯ_БД',
        'user' => 'ПОЛЬЗОВАТЕЛЬ',
        'pass' => 'ПАРОЛЬ',
        'charset' => 'utf8mb4',
    ],
    'install_secret' => 'длинная-случайная-строка',
    'token_secret' => 'другая-длинная-случайная-строка',
    // Push (после генерации ключей — см. раздел 4):
    // 'vapid' => [
    //     'public_key' => '...',
    //     'private_key' => '...',
    //     'subject' => 'mailto:admin@example.com',
    // ],
];
```

- В панели reg.ru: **SSL Let's Encrypt** на домен (обязательно для PWA и push).
- Прокси: запросы `/api/*` → PHP (как в Laragon: DocumentRoot = `dist`, alias `/api`).

## 3. Проверка после выкладки

| Проверка | URL / действие |
|----------|----------------|
| API жив | `GET https://домен/api/...` (логин с телефона) |
| SPA | `https://домен/` открывается, не 404 на assets |
| PWA | iPhone Safari → «На экран "Домой"» → запуск **с иконки** (не закладка) |
| Игра | голосование → оплата → «Сформировать состав» → **Готово** → у всех только составы |
| Pull-to-refresh | на странице игры: вверху списка потянуть вниз — обновление |

## 4. Web Push (следующий коммит в разработке)

Уже в проекте: таблица `push_subscriptions`, `api/lib/push.php`, рассылка при **оплате** (если VAPID настроен).

Нужно доделать в коде: подписка в PWA, service worker, push при **старте голосования**.

**Подготовка на сервере:**

```bash
npx web-push generate-vapid-keys
```

Публичный и приватный ключ — в `config.local.php` → `vapid`.  
`subject` — `mailto:ваш@email` или `https://ваш-домен`.

**PHP:** включены `curl` и `openssl` (sodium желателен).

## 5. Локальная разработка vs prod

| | Dev (`npm run dev`) | Prod (`dist` + HTTPS) |
|--|---------------------|------------------------|
| PWA fullscreen | ❌ закладка Safari | ✅ с иконки |
| Push | ❌ | ✅ после VAPID + доработки |
| API | proxy → Laragon/Docker | `api/` на хостинге |

## 6. Обновление версии

1. `git pull` на ПК → `npm.cmd run build`
2. Залить новый `dist/` (можно только изменённые файлы)
3. Залить изменённые `api/*.php` при изменении бэкенда
4. При новых колонках БД — снова `migrate-rosters.php` или SQL из `database/schema.sql`
