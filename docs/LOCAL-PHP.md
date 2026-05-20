# PHP + MySQL на Windows (без Docker и без WSL)

Официальный сайт Laragon иногда **не открывается**. Ниже — рабочие альтернативы.

---

## Вариант 1: Laragon с GitHub (без laragon.org)

1. Откройте в браузере:  
   **https://github.com/leokhoa/laragon/releases**
2. Скачайте последний **`laragon-full.exe`** (или `.7z`) из раздела Assets.
3. Установите, **Start All**.
4. Проект в `C:\laragon\www\go_hockey`.
5. База **`hockey_time`** в HeidiSQL (Laragon → Database).
6. `npm.cmd run local:laragon`
7. Браузер: `http://go_hockey.test/api/install.php?secret=local-dev-secret`
8. В `.env`: `VITE_API_PROXY=http://go_hockey.test`

Подробнее: [LARAGON.md](./LARAGON.md)

---

## Вариант 2: XAMPP (часто проще скачать)

1. Сайт: **https://www.apachefriends.org/download.html**  
   Зеркало: **https://sourceforge.net/projects/xampp/**
2. Установить XAMPP (Apache + MySQL).
3. В **XAMPP Control Panel** → Start **Apache** и **MySQL**.
4. Скопировать проект в:

   `C:\xampp\htdocs\go_hockey`

5. Создать БД `hockey_time` в **http://localhost/phpmyadmin** (логин `root`, пароль пустой).
6. В папке проекта:

   ```powershell
   npm.cmd run local:xampp
   ```

7. Браузер:

   `http://localhost/go_hockey/api/install.php?secret=local-dev-secret`

8. Файл **`.env`** в корне проекта:

   ```
   VITE_API_PROXY=http://localhost/go_hockey
   ```

9. `npm.cmd run dev` → http://localhost:5173/

---

## Вариант 3: Open Server Panel

Популярен в РФ, сайт иногда доступнее:

- **https://ospanel.io/** или **https://open-server.ru/**

После установки положите проект в папку `domains` / `home` по инструкции панели, создайте БД `hockey_time`, откройте свой локальный домен + `/api/install.php?secret=local-dev-secret`.

В `.env` укажите `VITE_API_PROXY` на ваш URL (как в панели Open Server).

---

## Общее для всех вариантов

| Шаг | Что |
|-----|-----|
| seed | `database/seed.json` (уже есть) |
| install | `install.php?secret=local-dev-secret` → `"ok":true` |
| фронт | `npm.cmd run dev` + `.env` с `VITE_API_PROXY` |

Пароль MySQL в `api/config.local.php` — если не пустой, поправьте `pass`.

---

## Docker / WSL

Если позже почините WSL — снова можно Docker: [LOCAL.md](./LOCAL.md).
