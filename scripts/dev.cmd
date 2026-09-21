@echo off
REM Hunch dev — open API + Keeper in separate windows
cd /d C:\Users\Irham\Documents\code\metropolis

echo ============================================
echo  Hunch npm run dev
echo  API  : http://127.0.0.1:8787
echo  RPC   : Quicknode (MONAD_RPC_URL)
echo ============================================

echo [1/3] rpc:check...
call scripts\win-npm.cmd run rpc:check
if errorlevel 1 (
  echo RPC check failed — fix MONAD_RPC_URL in .env
  pause
  exit /b 1
)

echo [2/3] Starting API window...
start "Hunch API :8787" cmd /k "cd /d C:\Users\Irham\Documents\code\metropolis && scripts\win-npm.cmd run api"

timeout /t 3 /nobreak >nul

echo [3/3] Starting Keeper window...
start "Hunch Keeper Pyth" cmd /k "cd /d C:\Users\Irham\Documents\code\metropolis && scripts\win-npm.cmd run keeper"

echo.
echo API + Keeper launching in new windows.
echo.
echo Mobile (Expo) — run in a 3rd terminal:
echo   cd mobile
echo   ..\scripts\win-npm.cmd run start:dev
echo.
echo Or: scripts\dev-mobile.cmd
echo.
echo Health: curl http://127.0.0.1:8787/health
echo Perpl:  scripts\win-npm.cmd run perpl:order BTC LONG 10 2
echo.
pause
