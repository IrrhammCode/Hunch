@echo off
cd /d C:\Users\Irham\Documents\code\metropolis\mobile
echo Starting Expo Metro (dev client)...
echo API must be up at EXPO_PUBLIC_API_URL (default LAN 192.168.100.3:8787)
call "%~dp0win-npm.cmd" run start:dev
