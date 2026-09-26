@echo off
title SAVEALL Dev Server
echo ===================================================
echo Starting SAVEALL Full-Stack Environment
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173 (proxied to :8000)
echo ===================================================

start "SAVEALL Backend" cmd /k "cd /d %~dp0 && .venv\Scripts\activate && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"
start "SAVEALL Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo Services launched in separate terminals!
