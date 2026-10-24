@echo off
rem Edge launches this (see install-updater.bat); the real work is host.ps1.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0host.ps1"
