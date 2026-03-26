@echo off
setlocal

cd /d "%~dp0"

echo Starting Recordly in dev mode...
call npm run dev
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
	echo.
	echo Recordly failed to start.
	echo Make sure Node.js is installed and dependencies are available in this folder.
	pause
)

exit /b %EXIT_CODE%
