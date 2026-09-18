@echo off
REM TRICCI Backend Production Setup
REM This script sets up and starts the TRICCI backend server with production configuration

cd /d C:\Users\Lavya\TRICCI

REM Create .env file with production settings
echo Creating .env file with production configuration...
(
echo DATABASE_URL=postgresql://postgres.qvuenvngwgcknawfsnxl:Ritesh@9282@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
echo BETTER_AUTH_SECRET=abc123def456789abc123def456789abc123def456789abc123def456789abc1
echo BETTER_AUTH_URL=https://tricci.in
echo PORT=3000
echo NODE_ENV=production
echo HOST=0.0.0.0
echo ADMIN_SECRET=your_super_secret_admin_key_change_me_12345
echo ADMIN_SESSION_TIMEOUT=3600000
echo ADMIN_SESSION_TIMEOUT_WARNING=300000
echo ENABLE_AUDIT_LOGGING=true
echo AUDIT_LOG_RETENTION_DAYS=90
echo AUDIT_LOG_EXPORT_FORMAT=csv
echo ADMIN_API_RATE_LIMIT=100
echo BULK_ACTION_RATE_LIMIT=10
echo ADMIN_NOTIFICATION_EMAIL=admin@tricci.in
echo SEND_SUSPENSION_EMAILS=true
echo REQUIRE_ADMIN_MFA=false
echo ADMIN_IP_WHITELIST=
echo ENABLE_DEMO_MODE=false
) > .env

echo ✓ .env file created with production settings

REM Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo Installing npm dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)

REM Build project
echo.
echo Building project...
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo ✓ Build complete

REM Start server
echo.
echo ═══════════════════════════════════════════════════════════
echo ✓ TRICCI Backend Server Starting...
echo ═══════════════════════════════════════════════════════════
echo Server will run at: http://localhost:3000
echo Frontend URL: https://tricci.in
echo.
echo Database: Connected to Supabase
echo ═══════════════════════════════════════════════════════════
echo.

call npm start

pause
