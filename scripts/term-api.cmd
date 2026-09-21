@echo off
REM Hunch — one terminal cheat sheet (repo root)
cd /d C:\Users\Irham\Documents\code\metropolis

echo === 1) Preflight ===
call scripts\win-npm.cmd run rpc:check
call scripts\win-npm.cmd run doctor

echo === 2) Start API (leave this window open) ===
call scripts\win-npm.cmd run api
