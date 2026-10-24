# Registers the native messaging host for Edge, for the current user only (HKCU, no admin).
# Keep this file ASCII-only: Windows PowerShell 5.1 reads a BOM-less script as ANSI.
$ErrorActionPreference = 'Stop'
$name = 'com.mynotify.updater'
$root = (Get-Item (Split-Path $PSScriptRoot)).FullName   # the folder "Load unpacked" points at

# An unpacked extension's ID is derived from its folder path, the same way Edge does it:
# SHA-256 of the path as UTF-16LE (drive letter upper-cased), first 16 bytes, each hex digit
# 0-f mapped to a-p. So every PC gets its own ID without anyone copying it from edge://extensions.
$path = $root.Substring(0, 1).ToUpper() + $root.Substring(1)
$hash = [Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::Unicode.GetBytes($path))
$id = -join ($hash[0..15] | ForEach-Object { '{0:x2}' -f $_ } | ForEach-Object { $_.ToCharArray() } |
  ForEach-Object { [char](97 + [Convert]::ToInt32([string]$_, 16)) })

$manifest = Join-Path $PSScriptRoot "$name.json"   # machine-specific, git-ignored
@{
  name = $name
  description = 'my-notify updater'
  path = (Join-Path $PSScriptRoot 'host.bat')
  type = 'stdio'
  allowed_origins = @("chrome-extension://$id/")
} | ConvertTo-Json | Set-Content -Path $manifest -Encoding ASCII

$key = "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$name"
New-Item -Path $key -Force | Out-Null
Set-ItemProperty -Path $key -Name '(default)' -Value $manifest

Write-Host "Installed for extension ID $id"
Write-Host "Folder: $root"
Write-Host 'Now press reload on the extension card in edge://extensions.'
