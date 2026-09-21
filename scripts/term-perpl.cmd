@echo after API is up: Perpl status + optional real order
@echo off
cd /d C:\Users\Irham\Documents\code\metropolis
call scripts\win-npm.cmd run perpl:account
echo.
echo Place REAL order (BTC LONG 10 AUSD 2x) — requires trade key + matching wallet account:
call scripts\win-npm.cmd run perpl:order BTC LONG 10 2
