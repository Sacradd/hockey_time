# Контекст проекта «Время хоккея» (hockey_time)

> Этот файл — единый источник правды для AI-агента и разработчиков.  
> Подробная спецификация: [docs/SPEC.md](docs/SPEC.md)

## Суть продукта

PWA (сайт как приложение на телефоне) для **своих ребят в одном городе**: сбор на хоккей, голосование в состав, оплата, админка.

- Доступ **только через администратора** (логин = телефон, временный пароль).
- При первом входе игрок **меняет пароль** и задаёт **свой логин** (ник).
- Админ работает **с телефона** (адаптивный веб).
- Ожидаемо **≤ 150** пользователей.

## Репозиторий и окружение

| | |
|---|---|
| GitHub | https://github.com/Sacradd/hockey_time |
| Локальная папка | `go_hockey` |
| Запуск dev | `npm.cmd run dev` → http://localhost:5173/ |
| С телефона (LAN) | Laragon **Start All**, затем `start_online.cmd` или `npm.cmd run dev:lan` → `http://IP-ПК:5173/` |
| Локальный API + MySQL | Docker: см. [docs/LOCAL.md](docs/LOCAL.md) (`docker compose up -d`, `npm.cmd run local:install`) |
| Сборка | `npm.cmd run build` → папка `dist/` |
| Деплой | reg.ru: залить `dist/`; API позже PHP + MySQL на том же хостинге |

**Windows:** в PowerShell использовать `npm.cmd`, не `npm` (политика выполнения скриптов). Альтернатива: `start-dev.cmd`.

**Не открывать** `index.html` двойным кликом — только через Vite dev server или собранный `dist` на хостинге.

## Стек (текущий)

- **Frontend:** React 19, TypeScript, Vite 6, react-router-dom 7
- **PWA:** vite-plugin-pwa (в dev отключён: `devOptions.enabled: false`)
- **Стили:** CSS, неоморфизм, алиас `@/` → `src/`
- **Backend:** пока **нет** (запланирован PHP + MySQL на reg.ru)
- **Push:** Web Push (HTTPS, service worker, подписки в БД, отправка с PHP)

## Дизайн

- Референс UI: `black_orange.jpg`
- Фон `#1E1E1E`, акцент `#FF6B00`, неоморфные тени в `src/styles/neumorphic.css`, токены в `tokens.css`
- `public/emblem.jpeg` → экран входа (`icons/emblem-screen.png`)
- **Иконка телефона:** `public/icons/ios/icon.jpeg` → `npm run icons`
- **Экран входа:** `public/emblem.jpeg`, масштаб в `Emblem.css` (`transform: scale`)
- На экране входа **нет** заголовка «Время хоккея» (убран по запросу) — только эмблема, логин, пароль, «Войти»
- Мобильная ширина: `max-width: 430px` в `AppLayout`
- **Иконки КХЛ:** источник — `public/teams/_debug/{slug}.jpg` (имя = slug). В приложение: `npm.cmd run teams:import`. **Не** запускать `teams:slice` для продакшена (только черновик в `_slice_preview`, часто путает порядок).

## Структура кода

```
src/
  App.tsx              # роуты: / и /login → LoginPage, /home → заглушка
  pages/LoginPage.tsx  # экран входа (UI без API)
  pages/HomePage.tsx   # заглушка после входа
  components/
    Emblem.tsx         # логотип
    ui/Button.tsx, Input.tsx
    layout/AppLayout.tsx
  styles/              # global, tokens, neumorphic
public/
  emblem.jpeg          # основной логотип
docs/SPEC.md           # бизнес-логика и этапы
```

## Бизнес-логика (кратко)

1. **Roster** — постоянный пул (Среда·Кристалл; позже Пятница·Ногинск). **Игра** — дата + голосование.
2. **Роли:** `super` (владелец; локально: ник `admin` / пароль `admin`, тел. `79000000001`) | админ группы `roster_members.is_admin` | `player`. **Состав:** `position` в roster (player / goalie).
3. Админ **группы** создаёт аккаунты в свой roster; в другую группу — «добавить из списка». Ник уникален; **телефон** видят только сам игрок, админ группы и super ([docs/ROLES-AND-PRIVACY.md](docs/ROLES-AND-PRIVACY.md)).
4. **Голосование:** админ задаёт **подписи ответов** → push пулу → состав: 20 полевых + резерв + 2 вратаря.
5. Подробная модель: [docs/ROSTERS-AND-VOTING.md](docs/ROSTERS-AND-VOTING.md).
5. Админ может **удалить** из состава → пересчёт очереди.
6. **Оплата:** админ «Требование об оплате» **параллельно с голосованием**; полевые подтверждают в приложении; админ видит **₽** (зелёный = оплатил) и может отметить вручную. **Вратари** — без оплаты. Push позже.
7. **Гости** и **ручная очередь** (вставка без очереди) — только админ.

## Этапы разработки (строго по порядку)

| # | Этап | Статус |
|---|------|--------|
| 0 | PWA, дизайн, экран входа | ✅ сделано |
| 1 | Авторизация, смена пароля, ник | ✅ |
| 2 | Группы по дням, участники, `actual` | ✅ (локально) |
| 3 | Roster, админ, position player/goalie | ✅ |
| 3b | Миграция roster «Среда · Кристалл» | ✅ (`migrate-rosters.php`) |
| 4 | Голосование, состав 20+резерв+2 GK, очередь, гости на игру | ⏳ UI/API; push позже |
| 4b | Пул + группы: super → пул, админ → группы | ✅ см. docs/POOL-AND-GROUPS.md |
| 5 | Удаление из состава (свайп «выбыл») | ✅ в рамках игры |
| 6 | Оплата | ✅ требование админом; подтверждение полевым; ₽ в составе; push позже |
| 7 | Гости, ручная очередь | ✅ на экране игры |

**Не делать всё сразу** — один этап за раз, согласованный с пользователем.

## Правила для AI при работе в репозитории

- Язык UI: **русский**.
- Минимальный diff, без лишнего рефакторинга.
- Следовать существующим паттернам (`neo-*` классы, `@/` импорты).
- Секреты только в `.env` (в git не коммитить).
- **Git commit / push** — только по явной просьбе пользователя.
- После изменений UI напоминать: dev server + Ctrl+Shift+R; не `dist` для разработки.

## Схема БД (план, MySQL)

```
users           — phone, password_hash, display_login, role, position (player|goalie), ...
rosters         — title, venue, weekday (Среда·Кристалл, …)
roster_members  — roster_id, user_id
day_groups      — roster_id, date, vote_label_1/2/3, vote_go_option, vote_active, ...
votes           — user_id, group_id, choice (1|2|3), voted_at
payments        — user_id, group_id, paid_at
push_subscriptions — endpoint, keys, user_id
```
(см. docs/ROSTERS-AND-VOTING.md; group_members/actual — этап миграции)

## Что уточнять у пользователя перед бэкендом

- Точный тариф reg.ru (PHP, MySQL, SSL).
- Домен для HTTPS (нужен для PWA push).
- Длительность голосования по умолчанию.
