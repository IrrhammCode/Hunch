@echo off
cd /d C:\Users\Irham\Documents\code\metropolis
"C:\Program Files\nodejs\node.exe" node_modules\ts-node\dist\bin.js src\api\index.ts > api-out.log 2> api-err.log
