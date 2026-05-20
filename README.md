# Время хоккея

PWA для сбора своих на хоккей (один город, доступ через администратора).

Дизайн: неоморфизм в стиле `black_orange.jpg` (тёмный фон + оранжевый акцент).

## GitHub

1. На [github.com](https://github.com) → **New repository** → имя, например `go-hockey` (без README, если репозиторий уже инициализирован локально).
2. В папке проекта:

```bash
git remote add origin https://github.com/Sacradd/go-hockey.git
git branch -M main
git push -u origin main
```

Профиль: [github.com/Sacradd](https://github.com/Sacradd)

Дальше: правки → `git add .` → `git commit -m "описание"` → `git push`.

## Запуск

```bash
npm install
npm run dev
```

Откройте в браузере на телефоне или с эмуляцией мобильного экрана.

## Документация

Полная спецификация и этапы разработки: [docs/SPEC.md](docs/SPEC.md)

## Текущий этап

- [x] Каркас React + Vite + PWA
- [x] Дизайн-система (неоморфизм)
- [x] Экран входа (UI, без бэкенда)
- [ ] Авторизация и смена пароля при первом входе
