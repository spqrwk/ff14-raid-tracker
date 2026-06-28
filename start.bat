@echo off
chcp 65001 >nul
title FF14 开荒记录

cd /d "%~dp0dist"

echo.
echo   ╔══════════════════════════════════════╗
echo   ║     FF14 高难副本开荒记录           ║
echo   ║     地址: http://localhost:9999     ║
echo   ║     按 Ctrl+C 或关闭此窗口停止      ║
echo   ╚══════════════════════════════════════╝
echo.

start "" http://localhost:9999
python -m http.server 9999
pause
