# New Secure Authentication System - Implementation Guide

## Overview
Replacing old OTP-based auth with secure password-based signup. New credentials are already set up in new Supabase + Brevo accounts.

## New Files Created

### 1. Database Schema
- **File**: `src/server/db/migrations/001_new_auth_schema.sql`
- **Action**: Run this SQL in your Supabase console to create the new users table
- **Tables Created**:
  - `users` - Simple secure user storage (name, email, mobile, password_hash)
  - `auth_audit_log` - Login/signup audit trail

### 2. API Endpoint
- **File**: `src/api/auth/signup-secure/POST.ts`
- **What it does**:
  - Validates input (name, mobile, email, password)
  - Hashes password with bcryptjs (10 rounds)
  - Creates user in new Supabase
  - Sends welcome email via new Brevo
  - Logs audit trail

### 3. Frontend Form
- **File**: `src/pages/auth/signup-secure.tsx`
- **Fields**: Name, Mobile, Email, Password, Confirm Password, Role
- **Validation**: Client-side + server-side
- **Features**: Show/hide password toggle, loading states, error messages

## What To Do Next

### Step 1: Update Environment Variables
Replace your current `.env` with `.env.new`:
```bash
cp .env.new .env
```

### Step 2: Run Database Migration
1. Go to Supabase Console: https://supabase.com
2. Log in to your account
3. Select the NEW project: wvkncbcemspyrfozydro
4. Go to SQL Editor
5. Copy + paste contents of `src/server/db/migrations/001_new_auth_schema.sql`
6. Click Execute

### Step 3: Update Routes
Add this to your route configuration (e.g., `src/routes.tsx` or your router setup):

```tsx
{
  path: '/signup-secure',
  component: SignupSecure,
}
```

And update the Header signup buttons to point to `/signup-secure`:
```tsx
<Link to="/signup-secure">Sign Up</Link>
```

### Step 4: Install Dependencies
If not already installed:
```bash
npm install bcryptjs axios
npm install --save-dev @types/bcryptjs
```

### Step 5: Remove Old Auth Code
Delete these directories (old OTP system):
- `src/api/auth/signup/` (old OTP-based signup)
- `src/api/auth/verify-otp/`
- `src/api/auth/resend-otp/`
- `src/api/auth/forgot-password/`
- `src/api/auth/reset-password/`
- `src/pages/auth/signup.tsx` (old OTP signup page)
- `src/pages/auth/signup-fresh.tsx` (if it uses OTP)

Keep these:
- `src/pages/auth/login-fresh.tsx` (update to use new password auth)
- `src/lib/auth/auth-client.tsx` (update to use password auth)

### Step 6: Build & Deploy
```bash
npm run build
# Test in development
npm run dev
# Deploy when ready
```

## New Login Flow

### For Login Page (`login-fresh.tsx`)
Update to use email + password instead of OTP:

```tsx
const loginUser = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login-secure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('auth_token', data.token);
    window.location.href = data.redirectUrl;
  }
};
```

## API Endpoints Reference

### Signup
**POST** `/api/auth/signup-secure`
```json
{
  "name": "John Doe",
  "mobile": "9876543210",
  "email": "john@example.com",
  "password": "SecurePass123",
  "role": "candidate"
}
```

Response (Success):
```json
{
  "success": true,
  "userId": "uuid-here",
  "user": {
    "id": "uuid-here",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "candidate"
  },
  "message": "Account created successfully!"
}
```

### Create Login Endpoint
**POST** `/api/auth/login-secure`
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

## Security Notes
✅ Passwords hashed with bcryptjs (10 rounds)
✅ Input validation on both client & server
✅ Email verification supported (table ready)
✅ Mobile verification supported (table ready)
✅ Audit logging enabled
✅ RLS policies for user data privacy

## Testing Checklist
- [ ] Run database migration in Supabase
- [ ] Update .env with new credentials
- [ ] Test signup form with valid data
- [ ] Test signup form with invalid data (validation)
- [ ] Verify welcome email arrives
- [ ] Create login-secure endpoint
- [ ] Test login flow
- [ ] Verify user roles work (candidate/employer/consultant)
- [ ] Test on mobile view
- [ ] Verify audit logs are created

## Troubleshooting

### Email not sending
- Check Brevo API key in .env
- Check email is lowercase
- Check Brevo sender email is verified

### Database errors
- Verify SQL migration ran successfully
- Check Supabase credentials in .env
- Verify SERVICE_ROLE_KEY (not anon key) is used for API

### Password hashing errors
- Ensure bcryptjs is installed: `npm install bcryptjs`
- Check Node version (should be 14+)

## Support
For issues, check:
1. Browser console for client errors
2. Server logs for API errors
3. Supabase logs for database errors
4. Brevo dashboard for email logs
