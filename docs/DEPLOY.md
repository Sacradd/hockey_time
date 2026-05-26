# Деплой на reg.ru (prod + HTTPS + PWA)

Чеклист перед выкладкой «Время хоккея» в интернет (домен **hockey-all.ru** или ваш). После HTTPS — PWA с иконки.

## Структура на хостинге (корень сайта)

В файловом менеджере reg.ru путь обычно: `www/hockey-all.ru/` (как на скриншоте).  
**Удалите** старый одиночный `index.html`, если это заглушка хостинга.

```
hockey-all.ru/                 ← корень (DocumentRoot)
  index.html                   ← из dist/
  assets/                      ← из dist/
  icons/, teams_new/, …         ← из dist/
  sw.js, manifest.webmanifest   ← из dist/
  .htaccess                    ← из deploy/htaccess.root (переименовать)
  api/                         ← папка api/ из репозитория
    config.local.php             ← создать на сервере (не из git!)
    install.php                  ← удалить после установки
  database/
    schema.sql                   ← из репозитория
    seed.json                    ← ваш список (не в git)
    .htaccess                    ← deploy/htaccess.database
```

## 1. Сборка фронта

```powershell
cd путь\к\go_hockey
npm.cmd run build
```

Папка **`dist/`** — **содержимое** (не саму папку) залить в корень `hockey-all.ru/` (менеджер файлов или FTP).  
Обязательно при обновлении: **`sw.js`**, **`workbox-*.js`**, **`assets/`**, **`index.html`**.

## 2. Backend (PHP + MySQL)

### База с именем как домен: `hockey_all`

В reg.ru имя БД обычно с префиксом аккаунта: **`u0983281_hockey_all`** (подставьте свой `uXXXXXX`).

1. Панель → **Базы данных MySQL** → **Создать**.
2. Имя базы: **`hockey_all`** (панель сама сделает `uXXXXXX_hockey_all`).
3. Пользователь с полным доступом к этой БД → запомните **пароль**.
4. Старую БД с чужими таблицами (`arenas`, `coaches`, …) **не используйте** — только новая пустая `…_hockey_all`.

Шаблон конфига в репозитории: **`api/config.local.hockey-all.php`** → на сервере сохранить как **`api/config.local.php`**.

```php
<?php
return [
    'db' => [
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'u0983281_hockey_all',   // как в панели
        'user' => 'u0983281_hockey_all',
        'pass' => 'ПАРОЛЬ_ИЗ_ПАНЕЛИ',
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
- Файл **`.htaccess`** в корне — см. `deploy/htaccess.root` (иначе `/login` и **`/api/*.php` редиректят на главную** — install/migrate не сработают).

**Если `/api/migrate-rosters.php` открывается как главная страница:**

1. **Service Worker (часто):** Chrome → F12 → Application → Service Workers → **Unregister** → обновить страницу. Либо пересобрать `dist` после фикса в `vite.config.ts` (`navigateFallbackDenylist: [/^\/api\//]`) и залить новый `sw.js`.
2. URL с **secret**: `.../api/migrate-rosters.php?secret=ВАШ_install_secret` (без secret будет JSON-ошибка, не редирект).
3. Нет `.htaccess` / нет файла — залейте `deploy/htaccess.root` и `api/.htaccess`, проверьте `api/migrate-rosters.php` на сервере.

### Порядок в панели reg.ru

1. **Базы данных** — создать **`uXXXXXX_hockey_all`** (пустая).
2. **SSL** — Let's Encrypt на `hockey-all.ru`.
3. Залить файлы (см. структуру выше).
4. **`api/config.local.php`** — из `config.local.hockey-all.php`, имя БД = `…_hockey_all`.
5. Залить **`database/seed.json`**.
6. Браузер (инкогнито): **`https://hockey-all.ru/api/install.php?secret=ВАШ_install_secret`** → `{"ok":true}`.  
   **migrate-rosters** на новой БД **не нужен**.
7. **Удалить** `api/install.php`.
8. Вход на `https://hockey-all.ru/`.

## 3. Проверка после выкладки

| Проверка | URL / действие |
|----------|----------------|
| API жив | `GET https://домен/api/health.php` → `db:true`, `users_count` > 0 |
| Логин | при «Ошибка сервера» — см. health.php; временно `'debug' => true` в config |
| `me.php` 401 | до входа — норма; после входа — залить **`api/.htaccess`** (Bearer), очистить sessionStorage |
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
