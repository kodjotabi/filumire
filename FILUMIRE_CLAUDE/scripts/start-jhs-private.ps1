param([int]$Port = 3291)
$ErrorActionPreference = 'Stop'
if ($env:VERCEL) { throw 'This launcher is for the local private rehearsal only.' }
if ($Port -lt 1024 -or $Port -gt 65535) { throw 'Choose a local port between 1024 and 65535.' }
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
  $env:NODE_ENV = 'production'
  $env:FILUMIRE_JHS_MODE = 'private-presentation'
  $env:FILUMIRE_PERSISTENCE = 'memory'
  $env:DATABASE_URL = 'postgres://offline:offline@127.0.0.1:1/offline'
  $env:FILUMIRE_ACCOUNT_REGISTRATION = 'open'
  $env:FILUMIRE_AUTH_JWT_SECRET = 'fictional-local-' + [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')
  Write-Host "Private fictional-account rehearsal: http://127.0.0.1:$Port"
  Write-Host 'Memory records and sessions are lost when this server stops. Ctrl+C stops this instance.'
  node node_modules/next/dist/bin/next start apps/learner --hostname 127.0.0.1 --port $Port
  if ($LASTEXITCODE -ne 0) { throw "Private application exited with code $LASTEXITCODE" }
} finally { Pop-Location }
