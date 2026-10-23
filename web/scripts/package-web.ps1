param([switch]$Platform)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$webRoot = Join-Path $projectRoot $(if ($Platform) { 'dist-platform' } else { 'dist' })
if (!(Test-Path -LiteralPath (Join-Path $webRoot 'index.html'))) { throw 'Build the web project before packaging.' }
$releaseRoot = Join-Path $projectRoot 'release'
New-Item -ItemType Directory -Force -Path $releaseRoot | Out-Null
$packageVersion = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$archivePath = Join-Path $releaseRoot ('jifeng-duijue-web-' + $packageVersion + $(if ($Platform) { '-platform.zip' } else { '.zip' }))
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath }
[System.IO.Compression.ZipFile]::CreateFromDirectory($webRoot, $archivePath, [System.IO.Compression.CompressionLevel]::Optimal, $false)
$archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
try {
  if (!($archive.Entries | Where-Object FullName -eq 'index.html')) { throw 'Missing index.html at ZIP root.' }
} finally { $archive.Dispose() }
$bytes = (Get-Item -LiteralPath $archivePath).Length
$hasher = [System.Security.Cryptography.SHA256]::Create()
$stream = [System.IO.File]::OpenRead($archivePath)
try { $digest = [BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-', '') }
finally { $stream.Dispose(); $hasher.Dispose() }
$manifest = [ordered]@{ file = $archivePath; bytes = $bytes; MiB = [math]::Round($bytes / 1MB, 2); sha256 = $digest; indexAtRoot = $true; within50MB = $bytes -le 50000000 }
$manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $releaseRoot $(if ($Platform) { 'platform-package.json' } else { 'web-package.json' })) -Encoding utf8
$manifest | ConvertTo-Json
if ($Platform -and $bytes -gt 50000000) { throw 'Platform ZIP exceeds 50,000,000 bytes. Further optimization is required.' }
