# Dependencies to Install

Run these commands to add the required packages:

```bash
# For password hashing
npm install bcryptjs
npm install --save-dev @types/bcryptjs

# For JWT tokens
npm install jsonwebtoken
npm install --save-dev @types/jsonwebtoken

# For HTTP requests (Brevo API)
npm install axios
```

Or all at once:
```bash
npm install bcryptjs jsonwebtoken axios
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

## Verify Installation
```bash
npm list bcryptjs jsonwebtoken axios
```

All three should show version numbers without errors.

## Next Steps
1. Run the installation commands above
2. Update your `.env` file with new credentials
3. Run database migration in Supabase
4. Update routes to point to new signup/login pages
5. Build and test
