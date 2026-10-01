@echo off
cd /d "%~dp0"
if not exist node_modules (call npm install)
if not exist .next (call npm run build)
start "" http://localhost:3000
call npm run start
