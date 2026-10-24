# Native messaging host for the popup's "update now" / "open folder" buttons.
# Edge starts it (via host.bat), sends one message, reads one reply, then it exits.
# Wire format both ways: 4-byte little-endian length + UTF-8 JSON.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads a BOM-less script as ANSI.
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot   # the extension folder = the git clone

$stdin = [Console]::OpenStandardInput()
$stdout = [Console]::OpenStandardOutput()

function Read-Exactly([int]$n) {
  $buf = New-Object byte[] $n
  $got = 0
  while ($got -lt $n) {
    $r = $stdin.Read($buf, $got, $n - $got)
    if ($r -le 0) { exit 0 }   # Edge closed the pipe
    $got += $r
  }
  return ,$buf
}

function Send($obj) {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($obj | ConvertTo-Json -Compress))
  $stdout.Write([BitConverter]::GetBytes([int]$bytes.Length), 0, 4)
  $stdout.Write($bytes, 0, $bytes.Length)
  $stdout.Flush()
}

$len = [BitConverter]::ToInt32((Read-Exactly 4), 0)
$msg = [Text.Encoding]::UTF8.GetString((Read-Exactly $len)) | ConvertFrom-Json

try {
  switch ($msg.cmd) {
    'update' {
      $out = & git -C $root pull --ff-only 2>&1 | Out-String
      Send @{ ok = ($LASTEXITCODE -eq 0); output = $out.Trim() }
    }
    'open' {
      Start-Process explorer.exe $root
      Send @{ ok = $true }
    }
    default { Send @{ ok = $false; output = "unknown cmd" } }
  }
} catch {
  Send @{ ok = $false; output = $_.Exception.Message }
}
