# Fix broken `npm` on Windows PowerShell
# System32\npm shadows the real Node.js npm.cmd

Remove-Item Alias:npm -ErrorAction SilentlyContinue
$nodejs = "C:\Program Files\nodejs"
if (Test-Path "$nodejs\npm.cmd") {
  $env:Path = "$nodejs;" + ($env:Path -split ';' | Where-Object { $_ -and $_ -notmatch 'System32\\?$' -and $_ -ne $nodejs }) -join ';'
  Write-Host "npm -> $(& npm.cmd -v)"
} else {
  Write-Host "Node.js npm.cmd not found at $nodejs"
}
