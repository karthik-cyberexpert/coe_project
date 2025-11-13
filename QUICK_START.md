# Quick Start Guide - COE Management System

**MySQL-Based Architecture** | No Supabase Dependencies

---

## 🚀 Start the Application

### Option 1: Step-by-Step

#### 1. Start Backend API
```powershell
cd C:\Users\Public\coe_project\migration\backend
npm start
```
✅ Backend running on http://localhost:3001

#### 2. Start Frontend (New Terminal)
```powershell
cd C:\Users\Public\coe_project
npm run dev
```
✅ Frontend running on http://localhost:5173

#### 3. Access Application
Open browser: http://localhost:5173

---

### Option 2: One Command (PowerShell)
```powershell
# Start both servers in background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Public\coe_project\migration\backend; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\Users\Public\coe_project; npm run dev"
```

---

## 🔐 Login Credentials

Password for all users: **Test@123**

| Email | Role | Dashboard Access |
|-------|------|------------------|
| admin@coe.com | Admin | Departments, Subjects, Sheets |
| ceo@coe.com | CEO | CEO Sheets |
| subadmin@coe.com | Sub-Admin | Sub-Admin Sheets |
| staff@coe.com | Staff | Staff Sheets |

---

## 📋 Prerequisites Checklist

Before starting, ensure:

- ✅ MySQL 8.0+ installed and running
- ✅ Database `coe_project` created
- ✅ Schema applied (`migration/mysql_schema.sql`)
- ✅ Seed data loaded (`migration/seed_data.sql`)
- ✅ Backend dependencies installed (`migration/backend/node_modules`)
- ✅ Frontend dependencies installed (`node_modules`)

---

## 🗄️ Database Setup (First Time Only)

### 1. Create Database
```sql
mysql -u root -p

CREATE DATABASE IF NOT EXISTS coe_project 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'coe_app'@'localhost' 
  IDENTIFIED BY 'CoeApp@2024';

GRANT ALL PRIVILEGES ON coe_project.* 
  TO 'coe_app'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### 2. Apply Schema
```powershell
mysql -u root -p coe_project < C:\Users\Public\coe_project\migration\mysql_schema.sql
```

### 3. Load Test Data
```powershell
mysql -u root -p coe_project < C:\Users\Public\coe_project\migration\seed_data.sql
```

---

## ✅ Verification

### Check Backend Health
```powershell
curl http://localhost:3001/health
```
Expected: `{"status":"ok","database":"connected",...}`

### Check Frontend
Open http://localhost:5173 in browser

### Test Login
1. Go to http://localhost:5173/login
2. Enter: admin@coe.com / Test@123
3. Click "Sign In"
4. Should redirect to dashboard

---

## 📁 Project Structure

```
coe_project/
├── migration/backend/     # Node.js + Express API (Port 3001)
├── src/                   # React frontend
│   ├── lib/mysqlClient.ts # MySQL adapter (Supabase-compatible)
│   └── integrations/      # API integration layer
├── migration/mysql_schema.sql  # Database schema
└── migration/seed_data.sql    # Test data
```

---

## 🔧 Configuration

### Backend (.env)
Located at: `migration/backend/.env`
```env
PORT=3001
DB_HOST=localhost
DB_USER=coe_app
DB_PASSWORD=CoeApp@2024
DB_NAME=coe_project
DB_PORT=3306
```

### Frontend (.env.local)
Located at: `.env.local`
```env
VITE_API_URL=http://localhost:3001/api
```

---

## 🛠️ Troubleshooting

### Backend won't start
- **Check MySQL**: Ensure MySQL service is running
- **Check port**: Port 3001 must be available
- **Check .env**: Verify database credentials

### Frontend won't start
- **Check dependencies**: Run `npm install`
- **Check port**: Port 5173 (or auto-assigned) must be available

### Login fails
- **Check backend**: Must be running on port 3001
- **Check database**: Seed data must be loaded
- **Check credentials**: Use Test@123 for all users

### Database connection error
- **MySQL running**: Check service status
- **Credentials**: Verify coe_app user exists
- **Database exists**: Verify coe_project database created

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/user` - Get current user

### Departments
- `GET /api/departments` - List all
- `POST /api/departments` - Create new
- `PUT /api/departments/:id` - Update
- `DELETE /api/departments/:id` - Delete

### Subjects
- `GET /api/subjects` - List all
- `POST /api/subjects` - Create new
- `PUT /api/subjects/:id` - Update
- `DELETE /api/subjects/:id` - Delete

### Sheets
- `GET /api/sheets` - List all
- `POST /api/sheets` - Upload new
- `PUT /api/sheets/:id` - Update
- `DELETE /api/sheets/:id` - Delete

---

## 🎯 Testing the System

### 1. Test Login (All Roles)
- Admin: admin@coe.com
- CEO: ceo@coe.com
- Sub-Admin: subadmin@coe.com
- Staff: staff@coe.com

### 2. Test Department Management (Admin Only)
1. Login as admin
2. Navigate to "Departments"
3. Create, edit, delete departments

### 3. Test Subject Management (Admin Only)
1. Login as admin
2. Navigate to "Subjects"
3. Create, edit, delete subjects

### 4. Test Sheets (Role-Based)
1. Login as any user
2. Navigate to respective sheets page
3. View, upload, manage sheets

---

## 📖 Documentation

- **README.md** - Project overview
- **MIGRATION_COMPLETE.md** - Complete migration details
- **AI_RULES.md** - Development guidelines
- **migration/MIGRATION_GUIDE.md** - Detailed migration guide

---

## 🆘 Getting Help

### Check Server Status
```powershell
# Backend
curl http://localhost:3001/health

# Frontend
# Open http://localhost:5173 in browser
```

### View Server Logs
- Backend: Check terminal where `npm start` is running
- Frontend: Check terminal where `npm run dev` is running
- MySQL: Check MySQL error log

### Common Commands
```powershell
# Restart backend
cd migration/backend
npm start

# Restart frontend
npm run dev

# Check MySQL
mysql -u root -p
SHOW DATABASES;
USE coe_project;
SHOW TABLES;
```

---

## 🎉 Success!

If everything is working:
- ✅ Backend responds on port 3001
- ✅ Frontend loads on port 5173
- ✅ Login works with test credentials
- ✅ Dashboard displays correctly

**You're ready to develop!**

---

**System**: MySQL + Node.js + React  
**No Supabase Dependencies**  
**100% Self-Hosted**

