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
| **Prod** | **https://hockey-all.ru** (reg.ru, HTTPS, PWA). БД MySQL: `uXXXXXX_hockey_all` |
| Деплой | [docs/DEPLOY.md](docs/DEPLOY.md): `dist/*` в корень, `api/`, `deploy/htaccess.*`, `api/config.local.php` на сервере |

**PWA на iPhone:** полноэкранный режим (без панелей Safari) только после **`npm.cmd run build`** + деплой на **HTTPS**. Dev-сервер (`dev` / `dev:lan`) — это закладка Safari, не приложение. Установка: Safari → «Поделиться» → «На экран "Домой"» → открывать с иконки.

**Windows:** в PowerShell использовать `npm.cmd`, не `npm` (политика выполнения скриптов). Альтернатива: `start-dev.cmd`.

**Не открывать** `index.html` двойным кликом — только через Vite dev server или собранный `dist` на хостинге.

## Стек (текущий)

- **Frontend:** React 19, TypeScript, Vite 6, react-router-dom 7
- **PWA:** vite-plugin-pwa (в dev отключён: `devOptions.enabled: false`)
- **Стили:** CSS, неоморфизм, алиас `@/` → `src/`
- **Backend:** PHP + MySQL (локально Laragon/Docker; prod reg.ru)
- **Push:** Web Push (HTTPS, service worker, подписки в БД, отправка с PHP)

## Дизайн

- Референс UI: `black_orange.jpg`
- Фон `#1E1E1E`, акцент `#FF6B00`, неоморфные тени в `src/styles/neumorphic.css`, токены в `tokens.css`
- `public/emblem.jpeg` → экран входа (`icons/emblem-screen.png`)
- **Иконка телефона:** `public/icons/ios/icon.jpeg` → `npm run icons`
- **Экран входа:** `public/emblem.jpeg`, масштаб в `Emblem.css` (`transform: scale`)
- На экране входа **нет** заголовка «Время хоккея» (убран по запросу) — только эмблема, логин, пароль, «Войти»
- Мобильная ширина: `max-width: 430px` в `AppLayout`
- **Кнопки:** все `.neo-btn` / `Button` — приподнятый неоморф (`--btn-lift`, `--btn-shadow` в `tokens.css`); оранжевые — `variant="accent"` / `neo-btn--accent` (`--accent-cta-*`). Не дублировать тени в компонентах
- **Название группы:** табличка `.roster-name-plate` (рамка, акцент, линии) — только страница управления группой (`RosterPage`); на главной карточки — простой текст
- **Главная админа:** блоки «Группы» / «Игры»; создание группы — только название; карточки: «Кол-во участников N»; в «Играх» — предстоящие игры + активные голосование/оплата; подпись «Группа — …»
- **Иконки КХЛ (выбор команды):** приложение берёт **`public/teams_new/{slug}.jpg`** напрямую. Импорт в PNG (`npm.cmd run teams:import`) — запасной вариант для деплоя без JPG.

## Структура кода

```
src/
  App.tsx              # роуты: /login, /home, /groups/:id, /groups/:id/teams
  pages/LoginPage.tsx  # экран входа
  pages/HomePage.tsx   # главная: группы, игры
  pages/RosterPage.tsx # группа: игры, участники
  pages/GroupPage.tsx  # игра: голосование, состав, оплата, «Сформировать состав»
  pages/GameTeamsPage.tsx  # белые/чёрные: живой блок + список игроков
  components/GameEditModal.tsx, RosterEditModal.tsx, TeamAssignRow.tsx, …
  lib/gameLineup.ts    # parseMatchTeams, buildTeamBoardSlots
  components/layout/AppLayout.tsx  # app-shell--teams-form на /groups/:id/teams
  styles/              # global, tokens, neumorphic
public/
  teams_new/           # иконки КХЛ (JPG, основной источник)
  emblem.jpeg
api/
  admin/save-match-teams.php
  games/detail.php     # match_teams для админа
docs/SPEC.md
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
8. **Состав на игру (белые/чёрные):** при активной оплате админ → «Сформировать состав» → `/groups/:id/teams`. Круги слева/справа, живой блок 11×2 (1 вр. + 10 пол.), сохранение в `game_match_teams`. Push и архив игры — позже.

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
| 8 | Состав белые/чёрные (`game_match_teams`) | ✅ UI + API; публикация «Готово» (`teams_published`); push позже |

**Не делать всё сразу** — один этап за раз, согласованный с пользователем.

## Известные ограничения / следующая сессия

- **Prod:** hockey-all.ru — install пройден, вход с телефона ✅; после обновления фронта заливать `sw.js` + `assets/`.
- **Push:** подписка в PWA + SW + рассылка при старте голосования (бэкенд оплаты частично готов).
- **Инструкция пользователям:** [docs/USER-GUIDE.md](docs/USER-GUIDE.md) — текст готов; скриншоты в `docs/screenshots/` (нужны с телефона).
- **PWA iPhone:** шапка с `--app-header-top` / safe-area; при залипании старого UI — обновить `dist` или переустановить на экран «Домой».

## Недавние доработки UI (этап 8+)

- Голосование не запущено / «Буду»·«Не буду»; pull-to-refresh на странице игры.
- Составы: **Готово** → `teams_published`; у игроков «Вы в команде …» (белые/чёрные цвета).
- Главная: бейдж **«Составы сформированы»**; свайп по игре — **Удалить** / **В архив** (`archived_at`).
- Шапка: **Назад** + выкл справа; профиль → группа — компактный список, ампула справа (полевой зелёный, вратарь оранжевый).

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
day_groups      — roster_id, group_date, title, vote_*, payment_active, teams_published, archived_at, ...
votes           — user_id, group_id, choice (1|2|3), voted_at
payments        — user_id, group_id, paid_at
game_match_teams — group_id, user_id, team (white|black)
push_subscriptions — endpoint, keys, user_id
```
(см. docs/ROSTERS-AND-VOTING.md; group_members/actual — этап миграции)

## Что уточнять у пользователя

- Длительность голосования по умолчанию (если менять с текущей логики).
- Prod: секреты и `database/seed.json` только на сервере, не в git.

## Монетизация

Черновик рассуждений (комиссия с платежей через приложение, масштабирование по группам): **[docs/MONETIZATION.md](docs/MONETIZATION.md)**.  
**Сейчас:** сначала prod и тест на личных группах; к монетизации — после стабильного цикла.
