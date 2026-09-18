# TRICCI Automatic Setup - One Click to Start
# Password already included - just run this script!

Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "TRICCI Setup - Starting..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Navigate to TRICCI folder
$tricciPath = "C:\Users\Lavya\TRICCI"
Set-Location $tricciPath
Write-Host "✓ Working in: $tricciPath" -ForegroundColor Green
Write-Host ""

# Create .env file with password
Write-Host "Creating .env file..." -ForegroundColor Yellow

$envContent = @"
# TRICCI Environment Configuration
# Auto-generated setup

DATABASE_URL=postgresql://postgres.qvuenvngwgcknawfsnxl:Ritesh@9282@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

BETTER_AUTH_SECRET=abc123def456789abc123def456789abc123def456789abc123def456789abc1

PORT=3000
NODE_ENV=development
HOST=0.0.0.0

BETTER_AUTH_URL=http://localhost:5173

ADMIN_SECRET=your_super_secret_admin_key_change_me_12345
ADMIN_SESSION_TIMEOUT=3600000
ADMIN_SESSION_TIMEOUT_WARNING=300000

AUDIT_LOG_RETENTION_DAYS=90
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_EXPORT_FORMAT=csv

ADMIN_API_RATE_LIMIT=100
BULK_ACTION_RATE_LIMIT=10

ADMIN_NOTIFICATION_EMAIL=admin@tricci.in
SEND_SUSPENSION_EMAILS=true

ADMIN_IP_WHITELIST=
REQUIRE_ADMIN_MFA=false

ENABLE_DEMO_MODE=false
"@

Set-Content -Path ".env" -Value $envContent -Encoding UTF8
Write-Host "✓ .env created" -ForegroundColor Green
Write-Host ""

# Install dependencies
Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Push schema
Write-Host "Pushing database schema..." -ForegroundColor Yellow
npx drizzle-kit push
Write-Host "✓ Schema configured" -ForegroundColor Green
Write-Host ""

# Start dev server
Write-Host "Starting development server..." -ForegroundColor Yellow
Write-Host "Server running at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""

npm run dev
