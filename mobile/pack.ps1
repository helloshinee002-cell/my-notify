# Packs this extension for Android (Edge Canary: Developer Options > "Extension install by crx").
#   .\mobile\pack.ps1        -> mobile\disable-ads-by-web.crx/.zip : ad blocking ONLY (the phone build)
#   .\mobile\pack.ps1 -Full  -> mobile\gojo-notify.crx/.zip        : the whole extension
# The phone only uses the ad blocking, so the default build drops the gojo parts (alerts, MAL,
# Bilibili links, popup, updater) and keeps the old "Disable Ads by Web" name and signing key,
# so it installs over the copy already on the phone.
#
# ..\..\keys\<name>.pem is the signing key (outside the repo). KEEP IT and never ship it: the same key keeps the
# same extension ID, so the phone treats a new .crx as an update instead of a second copy.
# Keep this file ASCII-only: Windows PowerShell 5.1 reads a BOM-less script as ANSI.
param([switch]$Full)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$src  = Split-Path $here                      # the extension (repo root)
$name = if ($Full) { 'gojo-notify' } else { 'disable-ads-by-web' }
$stage = Join-Path $env:TEMP $name             # the .crx is named after this folder
$packProfile = Join-Path $env:TEMP 'dabw-pack-profile'   # keeps the user's Edge profile untouched
# Keys live OUTSIDE the extension folder (in a "keys" folder next to it): Edge scans every file of
# an unpacked extension and warns "This extension includes the key file ..." if a .pem is inside.
$keys = Join-Path (Split-Path $src) 'keys'
New-Item -ItemType Directory $keys -Force | Out-Null
$pem  = Join-Path $keys "$name.pem"
$edge = (Get-ItemProperty 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe').'(default)'

Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory $stage | Out-Null
$manifest = Get-Content (Join-Path $src 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json

if ($Full) {
  # everything the extension loads; not the repo/dev files
  $skip = @('.git', 'mobile', '_metadata', 'test.js', 'HANDOFF.md', 'CLAUDE.md', 'README.md', '.gitignore', '.gitattributes')
  Get-ChildItem $src -Force | Where-Object { $skip -notcontains $_.Name } | Copy-Item -Destination $stage -Recurse
} else {
  # Ad-blocking-only manifest, derived from the real one so the two never drift.
  $gojoHosts = @('https://api.tenrai.org/*', 'https://api.bilibili.tv/*', 'https://app.biliintl.com/*', 'https://api.github.com/*')
  $scripts = @()
  foreach ($cs in $manifest.content_scripts) {
    if ($cs.js -contains 'parse.js') {
      # the gojo entry: keep only the ad CSS
      $scripts += [pscustomobject]@{ matches = $cs.matches; css = @('hide.css') }
    } else {
      $scripts += $cs
    }
  }
  $ads = [ordered]@{
    manifest_version = 3
    name = 'Disable Ads by Web'
    version = $manifest.version
    description = 'Blocks gambling banners, popunders and pre-roll ads on animegojo, fairyanime, hubserieshds and 037-hdd.'
    icons = $manifest.icons
    permissions = @('declarativeNetRequest')
    host_permissions = @($manifest.host_permissions | Where-Object { $gojoHosts -notcontains $_ })
    declarative_net_request = $manifest.declarative_net_request
    content_scripts = $scripts
  }
  $files = @('icon.png') + @($manifest.declarative_net_request.rule_resources | ForEach-Object { $_.path })
  foreach ($cs in $scripts) { $files += @($cs.js) + @($cs.css) }
  $files | Where-Object { $_ } | Sort-Object -Unique | ForEach-Object { Copy-Item (Join-Path $src $_) $stage }
  [IO.File]::WriteAllText((Join-Path $stage 'manifest.json'), ($ads | ConvertTo-Json -Depth 10), (New-Object Text.UTF8Encoding $false))
}

# Quoted by hand: PowerShell 5.1's Start-Process doesn't quote array items, and the .pem
# path contains a space ("Modify Windows").
$packArgs = @("--pack-extension=`"$stage`"", "--user-data-dir=`"$packProfile`"", '--no-first-run', '--no-default-browser-check')
if (Test-Path $pem) { $packArgs += "--pack-extension-key=`"$pem`"" }
Start-Process -FilePath $edge -ArgumentList $packArgs -Wait

$crx = "$stage.crx"
if (-not (Test-Path $crx)) { throw "Edge did not produce $crx" }
Move-Item $crx (Join-Path $here "$name.crx") -Force
if (Test-Path "$stage.pem") { Move-Item "$stage.pem" $pem -Force }  # first run only

$zip = Join-Path $here "$name.zip"
Remove-Item $zip -ErrorAction SilentlyContinue
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip
Remove-Item $stage -Recurse -Force

"packed $name v$($manifest.version) -> $here\$name.crx / .zip"
