@echo off
rem Pull the latest version, then open the extensions page to press "reload" on the card.
cd /d "%~dp0"
git pull --ff-only
if errorlevel 1 (
  echo.
  echo Update failed. Check the message above.
  pause
  exit /b 1
)
start "" msedge "edge://extensions"
echo.
echo Done. Press "reload" on the extension card in Edge.
pause
