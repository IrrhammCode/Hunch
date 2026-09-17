@echo off
rem Windows helper: avoid C:\Windows\System32\npm (0-byte stub that opens "Open with").
setlocal
set "REAL_NPM=C:\Program Files\nodejs\npm.cmd"
if exist "%REAL_NPM%" (
  "%REAL_NPM%" %*
  exit /b %ERRORLEVEL%
)
where npm.cmd >nul 2>&1
if %ERRORLEVEL%==0 (
  npm.cmd %*
  exit /b %ERRORLEVEL%
)
echo [win-npm] Could not find npm.cmd under "C:\Program Files\nodejs".
echo Install Node.js LTS, or delete the junk file: C:\Windows\System32\npm  (Admin)
exit /b 1
