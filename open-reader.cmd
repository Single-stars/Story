@echo off
setlocal
cd /d "%~dp0"

echo Starting Story OS Reader...
echo.
call npm.cmd run open:reader

echo.
echo Reader stopped or failed to start.
pause
