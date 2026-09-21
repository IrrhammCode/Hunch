@echo off
cd /d C:\Users\Irham\Documents\code\metropolis
"C:\Program Files\nodejs\node.exe" node_modules\ts-node\dist\bin.js src\keeper\index.ts > keeper-out.log 2> keeper-err.log
