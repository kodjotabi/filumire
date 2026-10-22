$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '..')
try {
  if ($env:VERCEL) { throw 'Do not run this isolated preview in a deployed environment.' }
  $env:NODE_ENV = 'test'
  $env:FILUMIRE_PERSISTENCE = 'memory'
  $env:DATABASE_URL = 'postgres://offline:offline@127.0.0.1:1/offline'
  $env:FILUMIRE_BASIC7_PILOT = 'test-only'
  $env:FILUMIRE_JHS_PREVIEW = 'test-only'
  $env:FILUMIRE_PREVIEW_SERVE = 'loopback-only'
  node --import tsx tests/jhs-materials.browser.mjs
  if ($LASTEXITCODE -ne 0) { throw "Preview exited with code $LASTEXITCODE" }
} finally { Pop-Location }
