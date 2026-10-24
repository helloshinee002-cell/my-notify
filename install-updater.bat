@echo off
rem Run once per PC (no admin needed): lets the popup's "update now" / "open folder" buttons
rem talk to updater\host.bat. Re-run it if you move this folder.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0updater\install.ps1"
pause
