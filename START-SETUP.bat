@echo off
REM TRICCI One-Click Setup

cd /d C:\Users\Lavya\TRICCI

REM Run the PowerShell setup script
powershell -ExecutionPolicy Bypass -File ".\run-setup.ps1"

pause
