Add-Type -AssemblyName System.IO.Compression.FileSystem
$auditOutput = Join-Path $PWD '.vercel/integration-six-2026-10-13'
$changes = @()
$roots = @(
    @{Name='learner'; Source=$PWD.Path; Archive='learner-before.zip'; Directories=@('apps','packages','services','tests','scripts')},
    @{Name='website'; Source='C:\Users\tabi\Desktop\filumire\FILUMIRE_WEBSITE'; Archive='website-before.zip'; Directories=@('src','public','tests')}
)
foreach ($root in $roots) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $auditOutput $root.Archive))
    $existing = @{}
    try {
        foreach ($entry in $archive.Entries) {
            $relative = $entry.FullName.Replace('\','/')
            $existing[$relative] = $true
            $current = Join-Path $root.Source $relative
            if (-not (Test-Path -LiteralPath $current -PathType Leaf)) {
                $changes += @{Project=$root.Name; File=$relative; Status='deleted'}
                continue
            }
            $reader = $entry.Open()
            $hasher = [System.Security.Cryptography.SHA256]::Create()
            try { $before = [BitConverter]::ToString($hasher.ComputeHash($reader)).Replace('-','').ToLowerInvariant() }
            finally { $reader.Dispose(); $hasher.Dispose() }
            $after = (Get-FileHash -LiteralPath $current -Algorithm SHA256).Hash.ToLowerInvariant()
            if ($before -ne $after) { $changes += @{Project=$root.Name;File=$relative;Status='modified';Before=$before;After=$after} }
        }
        foreach ($directory in $root.Directories) {
            Get-ChildItem -LiteralPath (Join-Path $root.Source $directory) -File -Recurse | Where-Object { $_.FullName -notmatch '[\\/](node_modules|\.next|\.vercel|\.git)[\\/]' } | ForEach-Object {
                $relative = $_.FullName.Substring($root.Source.Length+1).Replace('\','/')
                if (-not $existing.ContainsKey($relative)) { $changes += @{Project=$root.Name;File=$relative;Status='added'} }
            }
        }
    } finally { $archive.Dispose() }
}
$changes | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $auditOutput 'changes-from-preserved-source.json') -Encoding UTF8
$changes | ForEach-Object { '{0} {1}: {2}' -f $_.Project,$_.Status,$_.File }
if ($changes | Where-Object Status -eq 'deleted') { throw 'Unexpected deletion requires investigation.' }
