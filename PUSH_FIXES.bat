@echo off
REM TRICCI Production Fix - Push Script
REM This script commits and pushes the fixed files to GitHub

cd /d C:\Users\Lavya\TRICCI

echo.
echo ════════════════════════════════════════════════════════════════
echo  TRICCI Production Fix - Pushing Changes to GitHub
echo ════════════════════════════════════════════════════════════════
echo.

REM Check git status
echo [1/4] Checking git status...
git status

echo.
echo [2/4] Adding fixed files to staging...
git add src/pages/auth/signup.tsx src/server/api/auth/send-otp.ts

echo.
echo [3/4] Committing changes...
git commit -m "Fix: Enhanced error logging for signup and OTP flows to reveal actual failures"

echo.
echo [4/4] Pushing to GitHub...
git push origin main

echo.
echo ════════════════════════════════════════════════════════════════
if %ERRORLEVEL% EQU 0 (
  echo ✅ SUCCESS! Files pushed to GitHub
  echo.
  echo ▶ Railway webhook will trigger automatically
  echo ▶ Redeployment starts in ~1 minute
  echo ▶ All three flows should work within 3-5 minutes
  echo.
  echo Next steps:
  echo 1. Wait 3-5 minutes for Railway to redeploy
  echo 2. Test signup at: https://tricci.in/signup
  echo 3. Test password reset at: https://tricci.in/forgot-password-otp
  echo 4. Test login at: https://tricci.in/login
) else (
  echo ❌ FAILED! There was an error pushing to GitHub
  echo Please check the error messages above
)
echo ════════════════════════════════════════════════════════════════
echo.

pause
