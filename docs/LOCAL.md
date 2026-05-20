# Локальная разработка (Windows)

На компьютере **не нужно** отдельно ставить PHP и MySQL — всё в **Docker Desktop**.

## Что получится

| Сервис | Адрес |
|--------|--------|
| Фронт (Vite) | http://localhost:5173/ |
| API (PHP) | http://localhost:8080/api/ |
| MySQL | `localhost:3307` (логин `hockey` / пароль `hockey`, БД `hockey_time`) |

Запросы с фронта на `/api/...` проксируются на PHP (см. `vite.config.ts`).

---

## Ошибка WSL: «Разрушительный сбой» / Catastrophic failure

Docker Desktop на Windows 10 часто требует **WSL2**. Если `wsl --update` падает — **не мучайте Docker**, переходите на **Laragon**: [LARAGON.md](./LARAGON.md) (PHP + MySQL без WSL).

Если всё же хотите починить WSL (PowerShell **от администратора**):

1. Включить компоненты Windows (Панель управления → Программы → Включение компонентов):
   - **Подсистема Windows для Linux**
   - **Платформа виртуальных машин**
2. Перезагрузка ПК.
3. Обновления Windows установить до последних.
4. Снова: `wsl --update`
5. Не помогло — пакет WSL вручную:  
   https://github.com/microsoft/WSL/releases (файл `.msixbundle` / инструкции в [документации Microsoft](https://learn.microsoft.com/ru-ru/windows/wsl/install)).
6. Иногда помогает: удалить старый пакет WSL в PowerShell (имя пакета смотрите в «Параметры → Приложения»), затем установить заново с GitHub releases.

После успешного WSL — снова установить Docker Desktop.

---

## 1. Установить Docker Desktop

1. Скачать: https://www.docker.com/products/docker-desktop/
2. Установить, **перезагрузить** ПК при необходимости.
3. Запустить Docker Desktop — в трее иконка кита, статус **Running**.

Проверка в PowerShell:

```powershell
docker --version
docker compose version
```

---

## 2. Один раз: настройка проекта

В папке проекта:

```powershell
cd "c:\Users\Radion\Desktop\Работа\Sites\go_hockey"
powershell -ExecutionPolicy Bypass -File scripts\setup-local.ps1
```

Создаст `api/config.local.php` (если нет) и проверит `database/seed.json`.

Ваш `seed.json` уже с админом и игроком — менять не обязательно.

---

## 3. Запустить базу и PHP

```powershell
docker compose up -d
```

Или двойной клик **`start-docker.cmd`**.

Первый раз скачает образы (несколько минут).

---

## 4. Создать таблицы и пользователей

```powershell
npm.cmd run local:install
```

Либо в браузере:

http://localhost:8080/api/install.php?secret=local-dev-secret

Должен быть ответ `"ok":true`.

Повторный запуск безопасен (данные обновятся, не дублируются).

---

## 5. Запустить интерфейс

```powershell
npm.cmd run dev
```

Открыть http://localhost:5173/ — экран входа.

### Доступ с телефона (та же Wi‑Fi)

1. Laragon → **Start All**
2. Двойной клик **`start_online.cmd`** (или `npm.cmd run dev:lan`)
3. В консоли будет адрес вида **http://192.168.x.x:5173/** — откройте его на телефоне
4. Не используйте `localhost` на телефоне — только IP компьютера
5. Если не открывается — в Windows разрешите **Node.js / Vite** в брандмауэре (порт **5173**)

Запросы `/api` с телефона идут на ваш ПК через Vite-прокси в Laragon — отдельно открывать Laragon на телефоне не нужно.

---

## Полезные команды

| Действие | Команда |
|----------|---------|
| Остановить Docker | `docker compose down` |
| Сбросить БД полностью | `docker compose down -v` затем снова `up` и `local:install` |
| Логи PHP | `docker compose logs web` |
| Логи MySQL | `docker compose logs mysql` |

---

## Просмотр базы (по желанию)

Подключение любым клиентом (DBeaver, HeidiSQL, phpMyAdmin в Docker):

- Host: `127.0.0.1`
- Port: `3307`
- Database: `hockey_time`
- User: `hockey`
- Password: `hockey`

---

## Если Docker / WSL не подходит

**Рекомендуем:** [LOCAL-PHP.md](./LOCAL-PHP.md) — Laragon (GitHub), XAMPP или Open Server, если сайт Laragon недоступен.

---

## reg.ru

Когда схема и вход устроят локально — перенос по [DATABASE.md](./DATABASE.md).
