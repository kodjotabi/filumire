$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$auditDir = Join-Path $repoRoot 'FILUMIRE_CLAUDE/docs/audits/audit2-stages0-2-2026-10-13'
New-Item -ItemType Directory -Path $auditDir -Force | Out-Null
$archivePath = Join-Path $auditDir 'existing-work.zip'
if (Test-Path -LiteralPath $archivePath) { throw 'Existing snapshot preserved' }
$manifest = [System.Collections.Generic.List[object]]::new()
$pending = [System.Collections.Generic.Stack[string]]::new()
$pending.Push($repoRoot)
$zip = [System.IO.Compression.ZipFile]::Open($archivePath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
 while ($pending.Count -gt 0) {
  $folder = $pending.Pop()
  foreach ($entry in Get-ChildItem -LiteralPath $folder -Force) {
   if ($entry.PSIsContainer) {
    if ($entry.Name -notin @('node_modules','.next','.turbo','.git','__pycache__') -and $entry.FullName -ne $auditDir) { $pending.Push($entry.FullName) }
   } else {
    $relative = $entry.FullName.Substring($repoRoot.Length + 1).Replace('\','/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $entry.FullName, $relative, [System.IO.Compression.CompressionLevel]::Fastest) | Out-Null
    $manifest.Add([pscustomobject]@{file=$relative;sha256=(Get-FileHash -LiteralPath $entry.FullName -Algorithm SHA256).Hash;bytes=$entry.Length})
   }
  }
 }
} finally { $zip.Dispose() }
$zip = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
 foreach ($item in $manifest) {
  $stream = $zip.GetEntry($item.file).Open()
  try { $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-','') } finally { $stream.Dispose() }
  if ($hash -ne $item.sha256) { throw "Snapshot verification failed: $($item.file)" }
 }
} finally { $zip.Dispose(); $sha.Dispose() }
$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $auditDir 'snapshot-manifest.json')
git -C $repoRoot status --porcelain=v1 --untracked-files=all | Set-Content (Join-Path $auditDir 'git-status.txt')
git -C $repoRoot diff --binary | Set-Content (Join-Path $auditDir 'git-diff.txt')
git -C $repoRoot diff --cached --binary | Set-Content (Join-Path $auditDir 'git-staged-diff.txt')
git -C $repoRoot bundle create (Join-Path $auditDir 'history.bundle') --all
if ($LASTEXITCODE -ne 0) { throw 'Git bundle creation failed' }
git -C $repoRoot bundle verify (Join-Path $auditDir 'history.bundle')
if ($LASTEXITCODE -ne 0) { throw 'Git bundle verification failed' }
[pscustomobject]@{filesVerified=$manifest.Count;archive=$archivePath} | ConvertTo-Json
