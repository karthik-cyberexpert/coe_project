# Manual Migration & Testing Steps
## COE Project - Supabase to MySQL Migration

**Status**: Ready for execution  
**Time Required**: 15-20 minutes  
**Prepared**: 2025-11-11

---

## ✅ Prerequisites Checklist

- [x] MySQL 8.0 installed and running
- [x] Node.js 18+ installed
- [x] Backend dependencies installed (`npm install` completed)
- [x] Migration files ready in `C:\Users\Public\coe_project\migration\`

---

## 📝 Step 1: Create Database (2 minutes)

Open **MySQL Command Line Client** or **MySQL Workbench** and run:

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS coe_project 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER IF NOT EXISTS 'coe_app'@'localhost' 
IDENTIFIED BY 'CoeApp@2024';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX 
ON coe_project.* TO 'coe_app'@'localhost';

FLUSH PRIVILEGES;

-- Verify
USE coe_project;
SELECT DATABASE();
```

**Expected Output**: `coe_project`

---

## 📝 Step 2: Run Schema Migration (3 minutes)

###Option A: Using MySQL Command Line

```powershell
mysql -u coe_app -pCoeApp@2024 coe_project < "C:\Users\Public\coe_project\migration\mysql_schema.sql"
```

### Option B: Using MySQL Workbench

1. Open MySQL Workbench
2. File → Run SQL Script
3. Select: `C:\Users\Public\coe_project\migration\mysql_schema.sql`
4. Run

### Verify Tables Created

```sql
USE coe_project;
SHOW TABLES;
```

**Expected Output**: 8 tables
- users
- profiles  
- departments
- subjects
- sheets
- sessions
- audit_logs
- password_reset_tokens

---

## 📝 Step 3: Seed Test Data (2 minutes)

```powershell
mysql -u coe_app -pCoeApp@2024 coe_project < "C:\Users\Public\coe_project\migration\seed_data.sql"
```

**This creates**:
- 4 test users (admin, ceo, subadmin, staff)
- 5 departments
- 11 subjects (7 department-specific, 4 common)
- 4 sample sheets

### Verify Data

```sql
USE coe_project;

-- Check users
SELECT u.email, p.full_name, 
    CASE 
        WHEN p.is_admin THEN 'Admin'
        WHEN p.is_ceo THEN 'CEO'
        WHEN p.is_sub_admin THEN 'Sub-Admin'
        WHEN p.is_staff THEN 'Staff'
    END AS role
FROM users u
INNER JOIN profiles p ON u.id = p.id;
```

**Expected Output**: 4 users with roles

---

## 📝 Step 4: Start Backend Server (2 minutes)

Open a new PowerShell window:

```powershell
cd C:\Users\Public\coe_project\migration\backend
npm run dev
```

**Expected Output**:
```
✓ Database connected successfully
✓ Server running on port 3001
✓ Environment: development
```

**Keep this terminal open!**

---

## 📝 Step 5: Test Backend API (5 minutes)

### Test 1: Health Check

Open another PowerShell window:

```powershell
curl http://localhost:3001/health
```

**Expected**: `{"status":"ok","timestamp":"..."}`

### Test 2: User Login (Admin)

```powershell
$body = @{
    email = "admin@coe.com"
    password = "Test@123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/signin" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"

$response
```

**Expected**: Returns `access_token`, `refresh_token`, and `user` object

Save the token for next tests:
```powershell
$token = $response.access_token
```

### Test 3: Get Departments

```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

Invoke-RestMethod -Uri "http://localhost:3001/api/departments" `
    -Method GET `
    -Headers $headers
```

**Expected**: Array of 5 departments

### Test 4: Get Subjects

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/subjects" `
    -Method GET `
    -Headers $headers
```

**Expected**: Array of 11 subjects

---

## 📝 Step 6: Test All User Roles (5 minutes)

### Admin User Login
```powershell
$adminBody = @{ email = "admin@coe.com"; password = "Test@123" } | ConvertTo-Json
$adminResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/signin" -Method POST -Body $adminBody -ContentType "application/json"
Write-Host "Admin Token: $($adminResponse.access_token.Substring(0,20))..." -ForegroundColor Green
```

### CEO User Login
```powershell
$ceoBody = @{ email = "ceo@coe.com"; password = "Test@123" } | ConvertTo-Json
$ceoResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/signin" -Method POST -Body $ceoBody -ContentType "application/json"
Write-Host "CEO Token: $($ceoResponse.access_token.Substring(0,20))..." -ForegroundColor Green
```

### Sub-Admin User Login
```powershell
$subAdminBody = @{ email = "subadmin@coe.com"; password = "Test@123" } | ConvertTo-Json
$subAdminResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/signin" -Method POST -Body $subAdminBody -ContentType "application/json"
Write-Host "Sub-Admin Token: $($subAdminResponse.access_token.Substring(0,20))..." -ForegroundColor Green
```

### Staff User Login
```powershell
$staffBody = @{ email = "staff@coe.com"; password = "Test@123" } | ConvertTo-Json
$staffResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/signin" -Method POST -Body $staffBody -ContentType "application/json"
Write-Host "Staff Token: $($staffResponse.access_token.Substring(0,20))..." -ForegroundColor Green
```

**All should succeed and return tokens!**

---

## 📝 Step 7: Test CRUD Operations (5 minutes)

### Create Department (Admin only)

```powershell
$adminHeaders = @{ "Authorization" = "Bearer $($adminResponse.access_token)" }

$newDept = @{
    degree = "B.Tech"
    department_code = "IT"
    department_name = "Information Technology"
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "http://localhost:3001/api/departments" `
    -Method POST `
    -Headers $adminHeaders `
    -Body $newDept `
    -ContentType "application/json"

Write-Host "Created Department: $($created.department_name)" -ForegroundColor Green
```

### Update Department

```powershell
$updateDept = @{
    department_name = "Information Technology & Systems"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/departments/$($created.id)" `
    -Method PUT `
    -Headers $adminHeaders `
    -Body $updateDept `
    -ContentType "application/json"

Write-Host "Updated Department" -ForegroundColor Green
```

### Get All Departments (verify new one exists)

```powershell
$allDepts = Invoke-RestMethod -Uri "http://localhost:3001/api/departments" `
    -Method GET `
    -Headers $adminHeaders

Write-Host "Total Departments: $($allDepts.Count)" -ForegroundColor Cyan
```

**Expected**: 6 departments (5 original + 1 new)

### Delete Department

```powershell
Invoke-RestMethod -Uri "http://localhost:3001/api/departments/$($created.id)" `
    -Method DELETE `
    -Headers $adminHeaders

Write-Host "Deleted Department" -ForegroundColor Yellow
```

---

## 📝 Step 8: Database Verification

```sql
-- Check all record counts
USE coe_project;

SELECT 
    'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'sheets', COUNT(*) FROM sheets
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions;
```

**Expected**:
- users: 4
- profiles: 4
- departments: 5 (or 6 if you didn't delete the test one)
- subjects: 11
- sheets: 4
- sessions: 4+ (one per login)

---

## ✅ Success Criteria

All tests pass if:

- [x] Database created successfully
- [x] 8 tables exist
- [x] 4 users seeded with correct roles
- [x] Backend server starts without errors
- [x] Health check returns OK
- [x] All 4 users can login
- [x] Admin can create/update/delete departments
- [x] API returns correct data
- [x] Sessions are created in database

---

## 🎉 Migration Complete!

### Test User Credentials

| Email | Password | Role | Access |
|-------|----------|------|--------|
| admin@coe.com | Test@123 | Admin | Full system access (departments, subjects, sheets) |
| ceo@coe.com | Test@123 | CEO | CEO sheets access |
| subadmin@coe.com | Test@123 | Sub-Admin | Sub-admin sheets access |
| staff@coe.com | Test@123 | Staff | Staff sheets access |

### Database Credentials

- **Host**: localhost
- **Port**: 3306
- **Database**: coe_project
- **Username**: coe_app
- **Password**: CoeApp@2024

### Backend API

- **URL**: http://localhost:3001
- **Health**: http://localhost:3001/health
- **API Docs**: See `MIGRATION_GUIDE.md` for full endpoint list

---

## 🔄 Next Steps

1. **Frontend Migration**: Update React app to use MySQL client adapter
2. **Testing**: Run through full application workflow
3. **Deployment**: Follow deployment guide in `MIGRATION_GUIDE.md`

---

## 🐛 Troubleshooting

### MySQL Connection Error
```
Error: Access denied for user 'coe_app'@'localhost'
```
**Solution**: Re-run user creation from Step 1

### Backend Won't Start
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**Solution**: Check MySQL service is running: `Get-Service MySQL80`

### Login Fails
```
Error: Invalid credentials
```
**Solution**: Verify password hash was generated correctly, re-run seed_data.sql

---

## 📊 Database Schema Overview

```
users
├── id (UUID, PK)
├── email (UNIQUE)
├── password_hash
└── raw_user_meta_data (JSON)

profiles
├── id (UUID, PK, FK → users)
├── full_name
├── is_admin
├── is_ceo
├── is_sub_admin
└── is_staff

departments
├── id (UUID, PK)
├── degree
├── department_code (UNIQUE)
└── department_name

subjects
├── id (UUID, PK)
├── subject_code (UNIQUE)
├── subject_name
└── department_id (FK → departments, NULL for common)

sheets
├── id (UUID, PK)
├── sheet_name
├── file_path
├── subject_id (FK → subjects)
├── department_id (FK → departments)
├── user_id (FK → users)
├── start_date, end_date
├── year, batch
├── attendance_marked
├── duplicates_generated
└── external_marks_added

sessions
├── id (UUID, PK)
├── user_id (FK → users)
├── token (UNIQUE)
├── refresh_token (UNIQUE)
└── expires_at
```

---

**Last Updated**: 2025-11-11  
**Migration Version**: 1.0  
**Status**: ✅ Ready for Production Testing

