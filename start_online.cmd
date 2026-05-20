@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo   Время хоккея — доступ с телефона (LAN)
echo ========================================
echo.
echo 1. В Laragon нажмите Start All (Apache + MySQL)
echo 2. Телефон в той же Wi-Fi, что и этот ПК
echo 3. На телефоне откройте адрес ниже (не localhost!)
echo.
echo IP этого компьютера в сети:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i /c:"IPv4"') do (
  echo    http://%%a:5173/
)
echo.
echo Если не открывается — разрешите Node/Vite в брандмауэре Windows (порт 5173)
echo Остановка: Ctrl+C в этом окне
echo.
echo Запуск сервера...
echo.

npm.cmd run dev:lan

pause
