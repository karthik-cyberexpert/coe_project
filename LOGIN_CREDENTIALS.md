# COE Project - Login Credentials Guide

## Quick Reference - All Users

**Password for ALL users:** `Test@123`

---

## 1️⃣ Admin User (Full System Access)

### Login Credentials
- **Email:** `admin@coe.com`
- **Password:** `Test@123`
- **Name:** Admin User
- **Role:** Administrator

### Sidebar Navigation
```
✅ Dashboard
✅ Manage Sheets
✅ Manage Subjects
✅ Manage Departments
```

### Permissions & Features
- **Full System Access** - Complete control over all features
- Create, view, edit, and delete sheets
- Manage all subjects (create, edit, delete)
- Manage all departments (create, edit, delete)
- View all sheet statuses and detailed workflow
- Upload new sheets with full metadata
- Mark attendance, generate duplicates, add external marks
- Bulk operations for subjects and departments
- Access to all audit logs

### Use Case
Primary system administrator with complete control over the examination and sheet management system.

---

## 2️⃣ CEO User (Controller of Examinations)

### Login Credentials
- **Email:** `ceo@coe.com`
- **Password:** `Test@123`
- **Name:** CEO User
- **Role:** CEO (Controller of Examinations)

### Sidebar Navigation
```
✅ Dashboard
✅ COE Sheets
```

### Permissions & Features
- **COE-Level Access** - Controller of Examinations privileges
- View all sheets where attendance has been marked
- Cannot see sheets pending attendance marking
- Generate duplicate answer sheets
- View detailed sheet information
- Read-only access to subjects and departments
- Monitor sheet processing workflow
- Track duplicate generation status

### Use Case
Controller of Examinations who reviews attendance-marked sheets and generates duplicates for further processing.

---

## 3️⃣ Sub-Admin User (Attendance Marker)

### Login Credentials
- **Email:** `subadmin@coe.com`
- **Password:** `Test@123`
- **Name:** Sub Admin User
- **Role:** Sub-Administrator

### Sidebar Navigation
```
✅ Dashboard
✅ Sub-Admin Sheets
```

### Permissions & Features
- **Attendance Management Access**
- View and edit all sheets
- Mark student attendance on sheets
- Edit sheet data (attendance status)
- View sheet metadata
- Cannot create or delete sheets
- Cannot manage subjects or departments
- Focused workflow for attendance marking

### Use Case
Sub-administrator responsible for marking attendance on examination sheets before they proceed to the CEO.

---

## 4️⃣ Staff User (External Marks Entry)

### Login Credentials
- **Email:** `staff@coe.com`
- **Password:** `Test@123`
- **Name:** Staff User
- **Role:** Staff Member

### Sidebar Navigation
```
✅ Dashboard
✅ Staff Sheets
```

### Permissions & Features
- **Marks Entry Access**
- View sheets where duplicates have been generated
- Cannot see sheets without duplicates
- Add external marks to sheets
- Edit marks data
- Read-only access to sheet metadata
- Cannot create or delete sheets
- Cannot manage subjects or departments
- Focused workflow for marks entry

### Use Case
Staff member responsible for adding external examination marks to sheets after duplicates have been generated.

---

## System Workflow Overview

```
1. Admin uploads sheet
   ↓
2. Sub-Admin marks attendance
   ↓
3. CEO generates duplicates
   ↓
4. Staff adds external marks
   ↓
5. Process complete
```

### Sheet Visibility by Role

| Sheet Status | Admin | CEO | Sub-Admin | Staff |
|-------------|-------|-----|-----------|-------|
| Newly uploaded | ✅ | ❌ | ✅ | ❌ |
| Attendance marked | ✅ | ✅ | ✅ | ❌ |
| Duplicates generated | ✅ | ✅ | ✅ | ✅ |
| External marks added | ✅ | ✅ | ✅ | ✅ |

---

## Database Setup

### Initial Setup (If not already done)

1. Run the MySQL schema:
```bash
mysql -u root -p < migration/mysql_schema.sql
```

2. Seed the test data:
```bash
mysql -u root -p < migration/seed_data.sql
```

### Verify Users Exist
```sql
USE coe_project;
SELECT u.email, p.full_name, p.is_admin, p.is_ceo, p.is_sub_admin, p.is_staff 
FROM users u 
INNER JOIN profiles p ON u.id = p.id;
```

---

## Testing Guide

### Test Each Role

1. **Admin Test Flow:**
   - Login as admin@coe.com
   - Navigate to "Manage Sheets" - create a new sheet
   - Navigate to "Manage Subjects" - verify subjects exist
   - Navigate to "Manage Departments" - verify departments exist
   - View dashboard to see all sheets

2. **CEO Test Flow:**
   - Login as ceo@coe.com
   - Verify only "Dashboard" and "COE Sheets" appear in sidebar
   - Confirm only attendance-marked sheets are visible
   - Test duplicate generation feature

3. **Sub-Admin Test Flow:**
   - Login as subadmin@coe.com
   - Verify only "Dashboard" and "Sub-Admin Sheets" appear
   - Test marking attendance on sheets
   - Verify ability to edit sheet data

4. **Staff Test Flow:**
   - Login as staff@coe.com
   - Verify only "Dashboard" and "Staff Sheets" appear
   - Confirm only duplicate-generated sheets are visible
   - Test adding external marks

---

## Troubleshooting

### Password Not Working?
The password hash in the database is: `$2b$10$LqslGu7xXcCd3K241Ifj0uXHS/rXAbDx9kFqKcEmhll32lffrMqo.`

This corresponds to: `Test@123`

### User Not Found?
Run the seed_data.sql script to create all test users.

### Role Not Working Correctly?
Check the profiles table to ensure role flags are set correctly:
```sql
SELECT * FROM profiles WHERE id IN (
    SELECT id FROM users WHERE email LIKE '%@coe.com'
);
```

### Sidebar Items Missing?
- Clear browser cache and localStorage
- Re-login to refresh the user session
- Check browser console for JavaScript errors

---

## Security Notes

⚠️ **Important:** These are **TEST CREDENTIALS ONLY**

- Do not use these credentials in production
- Change all passwords before deploying
- Use strong, unique passwords for production users
- Enable two-factor authentication for admin accounts
- Regularly audit user access and permissions

---

## Quick Login Links (Development)

- Frontend: `http://localhost:5173/login`
- Backend API: `http://localhost:3001`
- Health Check: `http://localhost:3001/health`

---

## Support & Contact

For issues or questions about user roles and permissions, refer to:
- Project documentation
- Backend API documentation at `/migration/backend/server.js`
- Frontend routes at `/src/App.tsx`
- Role-based components in `/src/components/`

---

**Last Updated:** January 2025  
**Version:** 1.0

