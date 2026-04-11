$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$targets = @(
  (Join-Path $root "src"),
  (Join-Path $root "scripts")
)

$files = foreach ($target in $targets) {
  if (Test-Path $target) {
    Get-ChildItem -Path $target -Recurse -Filter *.js -File
  }
}

if (-not $files) {
  Write-Output "[check:backend] No backend .js files found."
  exit 0
}

foreach ($file in $files) {
  & node --check $file.FullName
  if ($LASTEXITCODE -ne 0) {
    Write-Error "[check:backend] Syntax check failed for $($file.FullName)"
    exit $LASTEXITCODE
  }

  $relative = $file.FullName.Replace($root + "\", "").Replace("\", "/")
  Write-Output "[check:backend] OK $relative"
}

Write-Output "[check:backend] Checked $($files.Count) backend file(s)."
