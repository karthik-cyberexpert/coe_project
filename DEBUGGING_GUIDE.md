# Debugging Guide: StaffSheetViewerDialog Input Disable Issue

## Issue Description
After marks are updated and examiner details are submitted, the inputs in the StaffSheetViewerDialog remain editable instead of becoming read-only as intended.

## Root Cause Analysis
The issue stems from the `view` state not transitioning correctly to `'submitted'` after examiner details are saved. The inputs are disabled based on the condition `disabled={view === 'submitted'}` (line 507 of StaffSheetViewerDialog.tsx).

## Changes Made

### 1. Frontend Logging (StaffSheetViewerDialog.tsx)

#### Lines 163-173: Bundle Status Check
- Added logging to track query parameters (`sheet_id`, `bundle_number`)
- Log the API query result (data and any errors)
- Log errors if the query fails

#### Lines 199-211: View State Update Based on Examiner Details
- Log when examiner details are found and what view state will be set
- Log whether `forceEditable` is affecting the view state
- Log when no examiner details are found

#### Lines 299-308: Examiner Success Handler
- Log when examiner details are successfully submitted
- Log the view state being set after submission
- Log if `forceEditable` prevents the view from changing to `'submitted'`

### 2. Backend Logging (server.js)

#### Lines 897-937: GET /api/bundle_examiners Endpoint
- Log incoming query parameters
- Log the SQL query being executed with parameters
- Log query results (number of rows returned)
- Log whether returning a single row or all rows

## How to Test

### Step 1: Start the Backend with Logging
```bash
cd C:\Users\Public\coe_project\migration\backend
node server.js
```

### Step 2: Start the Frontend
```bash
cd C:\Users\Public\coe_project
npm run dev
```

### Step 3: Open Browser Console
Open your browser's developer tools (F12) and navigate to the Console tab.

### Step 4: Test the Flow

1. **Login as a staff member**
2. **Navigate to StaffSheets page**
3. **Select a sheet and open the dialog**
4. **Select a bundle number** - Watch the console for:
   ```
   [StaffSheetViewerDialog] Checking bundle status: {sheet_id: "...", bundle_number: "..."}
   [StaffSheetViewerDialog] Bundle examiner query result: {data: ..., error: ...}
   ```
5. **Check the backend logs** for:
   ```
   [bundle_examiners GET] Query params: { sheet_id: '...', bundle_number: '...' }
   [bundle_examiners GET] Executing query: SELECT * FROM bundle_examiners WHERE sheet_id = ? AND bundle_number = ? ORDER BY created_at DESC with params: [ '...', '...' ]
   [bundle_examiners GET] Query result: X rows
   ```

6. **If no examiner details exist**, you should see:
   ```
   [StaffSheetViewerDialog] No examiner details found, setting view to marks
   ```
   
7. **Edit marks and click "Save & Finalize"**

8. **Fill in examiner details and submit** - Watch for:
   ```
   [StaffSheetViewerDialog] Examiner details submitted successfully: {...}
   [StaffSheetViewerDialog] Setting view to submitted after examiner success
   ```

9. **Close and reopen the dialog, select the same bundle** - You should see:
   ```
   [StaffSheetViewerDialog] Examiner details found, setting view to: submitted
   ```

10. **Verify inputs are disabled** - All mark input fields should now be disabled.

## Expected Behavior After Fix

1. **Before examiner details are submitted:**
   - `view` state = `'marks'`
   - Inputs are editable
   - Footer shows "Save & Finalize" button

2. **After examiner details are submitted:**
   - `view` state = `'submitted'` (unless `forceEditable` is true)
   - Inputs are disabled
   - Footer shows "This bundle has been finalized" message and "Download PDF" button

## Troubleshooting

### Issue 1: Query Returns No Data When It Should
**Symptoms:** Backend logs show "Query result: 0 rows" even though data was just inserted.
**Possible Causes:**
- The `sheet_id` or `bundle_number` doesn't match what was inserted
- There's a data type mismatch (e.g., UUID string format)
- The insert failed silently

**Solution:** Check the backend logs when inserting examiner details (POST `/api/bundle_examiners`) to ensure the insert succeeds.

### Issue 2: View State Not Updating
**Symptoms:** Console shows "Examiner details found" but view doesn't change.
**Possible Causes:**
- `forceEditable` prop is set to `true`
- The component is not re-rendering
- State update is being overridden

**Solution:**
1. Check if `forceEditable` is being passed as `true` from the parent component
2. Verify the `useEffect` dependency array includes all necessary dependencies
3. Check React DevTools to see the current component state

### Issue 3: API Request Failing
**Symptoms:** Frontend logs show error in query result.
**Possible Causes:**
- Backend server is not running
- CORS issues
- Authentication token expired

**Solution:**
1. Ensure backend is running on `http://localhost:3001`
2. Check backend logs for CORS or authentication errors
3. Verify the token is valid in localStorage

## Additional Diagnostics

If the issue persists, add this temporary debug code to StaffSheetViewerDialog.tsx after line 507:

```typescript
// Temporary debug - add before the return statement
useEffect(() => {
  console.log('[DEBUG] Current view state:', view);
  console.log('[DEBUG] Examiner details:', examinerDetails);
  console.log('[DEBUG] forceEditable:', forceEditable);
  console.log('[DEBUG] Selected bundle:', selectedBundle);
}, [view, examinerDetails, forceEditable, selectedBundle]);
```

This will continuously log the state values as they change.

## Cleanup

Once the issue is resolved, you can remove the console.log statements or convert them to use a proper logging library for production.

