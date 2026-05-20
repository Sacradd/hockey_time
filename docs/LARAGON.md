# Laragon — локально без Docker и без WSL

Если **Docker / WSL** не ставится — используйте **Laragon**: PHP + MySQL + Apache одним установщиком.

## 1. Установка

1. Скачать (если **laragon.org** не открывается — с GitHub):  
   **https://github.com/leokhoa/laragon/releases** → файл `laragon-full.exe` в Assets.  
   Официальный сайт: https://laragon.org/download/
2. Установить (по умолчанию `C:\laragon`).
3. Запустить **Laragon** → кнопка **Start All** (Apache + MySQL зелёные).

## 2. Проект

Скопируйте папку `go_hockey` в:

```
C:\laragon\www\go_hockey
```

Или сделайте симлинк / работайте прямо из вашей папки, если Laragon умеет указать другой путь (Menu → Preferences → Document Root).

После старта Apache сайт откроется как:

**http://go_hockey.test/**

(если не открывается — в Laragon: Menu → Apache → Sites → проверьте список).

## 3. База данных

1. Laragon → **Database** → **Open** (HeidiSQL) или **http://localhost/phpmyadmin**
2. Создать пустую базу: имя **`hockey_time`**, кодировка **utf8mb4**.

## 4. Конфиг API

В PowerShell из папки проекта:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-laragon.ps1
```

По умолчанию: MySQL `root` без пароля (стандарт Laragon). Если у вас другой пароль — отредактируйте `api/config.local.php`.

## 5. Установка таблиц и seed

В браузере:

```
http://go_hockey.test/api/install.php?secret=local-dev-secret
```

Ответ: `"ok":true`.

## 6. Фронтенд (Vite)

В `vite.config.ts` в блоке `server.proxy` для Laragon укажите:

```ts
target: 'http://go_hockey.test',
```

Запуск:

```powershell
npm.cmd run dev
```

Сайт: http://localhost:5173/ — запросы `/api` уйдут на Laragon.

## Проверка PHP

http://go_hockey.test/api/install.php — не должно быть «404» или «скачивание файла».

---

## reg.ru

Когда всё работает в Laragon — на хостинг переносите ту же схему: [DATABASE.md](./DATABASE.md).
