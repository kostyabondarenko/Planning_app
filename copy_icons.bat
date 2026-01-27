@echo off
echo 📱 Копирование иконок для PWA...
echo.

REM Копируем иконки из assets в frontend/public
xcopy /Y "assets\icon-512.png" "frontend\public\"
xcopy /Y "assets\icon-192.png" "frontend\public\"
xcopy /Y "assets\apple-touch-icon.png" "frontend\public\"

echo.
echo ✅ Иконки скопированы!
echo.
echo Файлы скопированы:
echo   - icon-512.png
echo   - icon-192.png
echo   - apple-touch-icon.png
echo.
echo Теперь можно запустить: npm run dev (в папке frontend)
echo.
pause
