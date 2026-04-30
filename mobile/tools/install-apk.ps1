param(
  [string]$ApkPath = "$env:USERPROFILE\Downloads\PromptVault-preview.apk",
  [switch]$Reinstall
)

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
$localAdb = Join-Path $env:USERPROFILE 'Android\platform-tools\adb.exe'

if ($adbCmd) {
  $adbExe = $adbCmd.Source
} elseif (Test-Path $localAdb) {
  $adbExe = $localAdb
} else {
  Write-Error "adb is not installed. Install Android platform-tools first."
  exit 1
}

if (-not (Test-Path $ApkPath)) {
  Write-Error "APK not found at: $ApkPath"
  exit 1
}

$connected = & $adbExe devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }
if (-not $connected) {
  Write-Error "No authorized Android device detected. Connect via USB and accept USB debugging prompt on phone."
  exit 1
}

Write-Host "Installing APK: $ApkPath"
if ($Reinstall) {
  & $adbExe install -r "$ApkPath"
} else {
  & $adbExe install "$ApkPath"
}

if ($LASTEXITCODE -ne 0) {
  Write-Error "adb install failed with exit code $LASTEXITCODE"
  exit $LASTEXITCODE
}

Write-Host "Install completed successfully."
