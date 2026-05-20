@echo off
cd /d "%~dp0"
docker compose up -d
if errorlevel 1 (
  echo.
  echo Не удалось запустить Docker. Установите Docker Desktop и включите его.
  pause
  exit /b 1
)
echo.
echo MySQL + PHP: http://localhost:8080/api/
echo Дальше: npm.cmd run local:install
echo Фронт:  npm.cmd run dev
pause
