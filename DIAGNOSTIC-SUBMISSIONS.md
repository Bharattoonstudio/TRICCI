# Diagnostic: Consultant Submissions Not Loading

## Issue
After submitting candidates via CV Bank, the Submissions tab shows blank/empty instead of the submitted candidates.

## Checklist to Debug

### 1. Check Backend API is Working
```bash
# Make sure server is running
cd /home/claude/TRICCI-main
npm run dev

# In browser console, test the API:
fetch('/api/consultant/submissions')
  .then(r => r.json())
  .then(data => console.log('API Response:', data))
```

### 2. Check Browser Console
- Open DevTools (F12)
- Go to Console tab
- Look for logs starting with `[ConsultantSubmissionsList]`
- Check for fetch errors

### 3. Check Network Tab
- Open DevTools Network tab
- Go to Submissions tab
- Look for request to `/api/consultant/submissions`
- Check:
  - Status code (should be 200)
  - Response headers
  - Response body

### 4. Database Check
```sql
-- Check if submissions exist for your user ID
SELECT COUNT(*) FROM submission 
WHERE consultantUserId = 'YOUR_USER_ID';

-- Check submission details
SELECT id, candidateName, candidateEmail, status, duplicateFlag, createdAt 
FROM submission 
WHERE consultantUserId = 'YOUR_USER_ID' 
ORDER BY createdAt DESC 
LIMIT 10;
```

### 5. Session Check
```javascript
// In browser console, check if you're authenticated:
await fetch('/api/auth/session')
  .then(r => r.json())
  .then(data => console.log('Session:', data))
```

### 6. Manual API Test
```javascript
// In browser console, manually trigger load:
fetch('/api/consultant/submissions')
  .then(r => {
    console.log('Status:', r.status);
    return r.json();
  })
  .then(data => {
    console.log('Full response:');
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(err => console.error('Error:', err))
```

## Expected Response Format
```json
{
  "ok": true,
  "submissions": [
    {
      "id": 123,
      "candidateName": "John Doe",
      "candidateEmail": "john@example.com",
      "candidateLocation": "Mumbai",
      "status": "pending",
      "isDuplicate": false,
      "isWinner": true,
      "message": "✅ You are the primary consultant for this submission",
      "createdAt": "2026-09-07T10:30:00Z",
      "jobTitle": "React Developer",
      "jobCompany": "TechCorp"
    }
  ],
  "total": 1
}
```

## Common Issues & Fixes

### Issue: API returns 401 Unauthorized
- **Cause**: User not authenticated
- **Fix**: Log in again, check session

### Issue: API returns 403 Forbidden
- **Cause**: User role is not 'consultant' or 'admin'
- **Fix**: Check user role in database

### Issue: API returns empty array []
- **Cause**: No submissions exist for this user
- **Fix**: Submit candidates first via CV Bank

### Issue: Console shows Fetch Error
- **Cause**: Network issue or CORS error
- **Fix**: Check network tab, verify API path

### Issue: Submissions exist in DB but not showing
- **Cause**: Frontend filtering or database query issue
- **Fix**:
  - Check if `consultantUserId` matches session user ID
  - Check if email comparison is case-sensitive
  - Check for SQL errors in server logs

## Implementation Details

### Frontend Component
- File: `/home/claude/TRICCI-main/src/components/consultant/ConsultantSubmissionsList.tsx`
- Loads submissions on mount via `useEffect([refresh])`
- Calls `loadSubmissions()` function
- Shows loading spinner while fetching
- Displays error if API fails
- Has manual refresh button

### API Endpoint
- Path: `GET /api/consultant/submissions`
- Auth: Requires 'consultant' or 'admin' role
- Query: Filters by authenticated user's ID
- Returns: Array of submissions with duplicate status

### Database
- Table: `submission`
- Key fields: `consultantUserId`, `candidateEmail`, `duplicateFlag`
- Index: Should have index on `(consultantUserId, createdAt)` for performance

## Next Steps

1. **Check server logs** for errors during submission or fetch
2. **Check database** for submissions with correct `consultantUserId`
3. **Check browser console** for fetch errors
4. **Check network tab** for API response
5. **If empty** - submit a test candidate and watch the request
6. **If still empty** - check if user ID is being passed correctly

## Testing Locally

### Step 1: Submit a Candidate
1. Go to CV Bank tab
2. Select a candidate
3. Click "Submit to Job"
4. Select a job
5. Confirm and submit
6. See success modal

### Step 2: Check Submissions Tab
1. Click "View All Submissions" button in modal (or click Submissions tab)
2. Should see the submitted candidate in the list

### Step 3: Manual Debug
```javascript
// In console, check what's loaded:
console.log('Checking submissions load...');
fetch('/api/consultant/submissions')
  .then(r => r.json())
  .then(data => {
    console.log('Submissions count:', data.submissions?.length || 0);
    console.log('First submission:', data.submissions?.[0]);
  })
```

## If Still Not Working

1. **Clear browser cache** - Ctrl+Shift+Delete or Cmd+Shift+Delete
2. **Reload page** - Ctrl+R or Cmd+R
3. **Check for JavaScript errors** - Console should be clean
4. **Check server logs** - Look for `[consultant.submissions.get.error]`
5. **Verify database connection** - Can you query the submission table?

## Files Involved
- `/home/claude/TRICCI-main/src/components/consultant/ConsultantSubmissionsList.tsx` - Frontend
- `/home/claude/TRICCI-main/src/server/api/consultant/submissions/GET.ts` - API endpoint
- `/home/claude/TRICCI-main/src/server/db/schema.ts` - Database schema
