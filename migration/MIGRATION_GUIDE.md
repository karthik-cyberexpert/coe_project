# Complete Migration Guide: Supabase to MySQL
## COE Project Migration Documentation

---

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Database Migration](#database-migration)
4. [Backend Setup](#backend-setup)
5. [Frontend Migration](#frontend-migration)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Rollback Plan](#rollback-plan)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### What's Changing
- **From**: Supabase (PostgreSQL + Auth + Realtime)
- **To**: MySQL + Custom Express.js Backend

### Migration Benefits
- ✅ Full control over infrastructure
- ✅ No vendor lock-in
- ✅ Cost optimization
- ✅ Custom business logic in backend
- ✅ Better performance tuning

### Migration Timeline
- **Preparation**: 2-4 hours
- **Database Migration**: 1-2 hours
- **Backend Setup**: 2-3 hours
- **Frontend Migration**: 4-6 hours
- **Testing**: 2-4 hours
- **Total**: ~12-20 hours

---

## Prerequisites

### Required Software
- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **npm** or **yarn**: Latest version
- **Git**: For version control

### Required Knowledge
- Basic MySQL administration
- Node.js/Express.js fundamentals
- REST API concepts
- Environment configuration

---

## Database Migration

### Step 1: Install MySQL

**Windows:**
```powershell
# Download from https://dev.mysql.com/downloads/mysql/
# Or use Chocolatey
choco install mysql
```

**Linux/macOS:**
```bash
# Ubuntu/Debian
sudo apt-get install mysql-server

# macOS
brew install mysql
```

### Step 2: Start MySQL Service

```powershell
# Windows
net start MySQL80

# Linux/macOS
sudo systemctl start mysql
# or
mysql.server start
```

### Step 3: Secure MySQL Installation

```bash
mysql_secure_installation
```

Follow prompts to:
- Set root password
- Remove anonymous users
- Disallow root login remotely
- Remove test database

### Step 4: Create Database and User

```sql
-- Login as root
mysql -u root -p

-- Create database
CREATE DATABASE coe_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create application user
CREATE USER 'coe_app'@'localhost' IDENTIFIED BY 'your_secure_password';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON coe_project.* TO 'coe_app'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

### Step 5: Run Schema Migration

```bash
cd C:\Users\Public\coe_project\migration

# Import the schema
mysql -u coe_app -p coe_project < mysql_schema.sql
```

### Step 6: Export Data from Supabase

**Option A: Using Supabase Dashboard**
1. Go to Table Editor
2. For each table: Click "..." → Export as CSV
3. Save files in `migration/data/` folder

**Option B: Using SQL Dump (if you have direct access)**
```bash
pg_dump -h your-project.supabase.co -U postgres -d postgres \
  --table=public.departments --table=public.subjects \
  --table=public.sheets --table=public.profiles \
  --data-only --column-inserts > supabase_data.sql
```

### Step 7: Import Data to MySQL

Create import script `migration/import_data.js`:

```javascript
const mysql = require('mysql2/promise');
const fs = require('fs');
const csv = require('csv-parser');

async function importCSV(table, filePath) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'coe_app',
    password: 'your_password',
    database: 'coe_project'
  });

  const rows = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', async () => {
        try {
          for (const row of rows) {
            const columns = Object.keys(row).join(', ');
            const placeholders = Object.keys(row).map(() => '?').join(', ');
            const values = Object.values(row);
            
            await connection.execute(
              `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`,
              values
            );
          }
          await connection.end();
          console.log(`✓ Imported ${rows.length} rows into ${table}`);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
  });
}

// Run imports
(async () => {
  await importCSV('departments', './data/departments.csv');
  await importCSV('subjects', './data/subjects.csv');
  await importCSV('sheets', './data/sheets.csv');
  await importCSV('profiles', './data/profiles.csv');
})();
```

Run the import:
```bash
cd migration
npm install mysql2 csv-parser
node import_data.js
```

### Step 8: Verify Data Migration

```sql
-- Login to MySQL
mysql -u coe_app -p coe_project

-- Check record counts
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'sheets', COUNT(*) FROM sheets;

-- Verify relationships
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'coe_project'
  AND REFERENCED_TABLE_NAME IS NOT NULL;
```

---

## Backend Setup

### Step 1: Initialize Backend Project

```bash
cd C:\Users\Public\coe_project\migration\backend

# Initialize if needed
npm init -y

# Install dependencies
npm install
```

### Step 2: Configure Environment

```bash
# Copy example env file
copy .env.example .env

# Edit .env with your settings
notepad .env
```

**Required `.env` Configuration:**
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_USER=coe_app
DB_PASSWORD=your_actual_password
DB_NAME=coe_project

# Generate strong secrets (32+ characters)
JWT_SECRET=your_generated_jwt_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
```

**Generate Secure Secrets:**
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Test Backend Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

**Verify endpoints:**
```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status":"ok","timestamp":"..."}
```

### Step 4: Create Initial Admin User

```bash
# Using bcrypt to hash password
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('Admin@123', 10, (err, hash) => console.log(hash));"
```

Then update the SQL script in `mysql_schema.sql` line 344 with the actual hash.

Or create via API:
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin@123",
    "full_name": "System Administrator"
  }'
```

Then manually update the profile:
```sql
UPDATE profiles SET is_admin = TRUE, is_staff = FALSE 
WHERE id = (SELECT id FROM users WHERE email = 'admin@example.com');
```

### Step 5: Setup as Windows Service (Optional)

Install `node-windows`:
```bash
npm install -g node-windows
```

Create `install-service.js`:
```javascript
const Service = require('node-windows').Service;

const svc = new Service({
  name: 'COE Backend API',
  description: 'Express API server for COE project',
  script: 'C:\\Users\\Public\\coe_project\\migration\\backend\\server.js',
  nodeOptions: ['--harmony', '--max_old_space_size=4096'],
  env: {
    name: 'NODE_ENV',
    value: 'production'
  }
});

svc.on('install', () => {
  svc.start();
  console.log('Service installed and started');
});

svc.install();
```

Run:
```bash
node install-service.js
```

---

## Frontend Migration

### Step 1: Install New Dependencies

```bash
cd C:\Users\Public\coe_project

# No new dependencies needed - we're replacing Supabase
# But you may want to add axios for better HTTP handling
npm install axios
```

### Step 2: Update Environment Variables

Create/update `.env.local`:
```env
VITE_API_URL=http://localhost:3001/api
VITE_APP_NAME=COE Management System
```

### Step 3: Replace Supabase Client

**Option A: Quick Replace (Recommended)**

1. Copy the client adapter:
```bash
copy migration\frontend\src\lib\mysqlClient.ts src\lib\mysqlClient.ts
```

2. Update import statements globally:
```bash
# Using PowerShell
Get-ChildItem -Path src -Filter "*.tsx" -Recurse | ForEach-Object {
  (Get-Content $_.FullName) -replace 'from.*@/integrations/supabase/client', 'from "@/lib/mysqlClient"' | 
  Set-Content $_.FullName
}
```

3. Update variable names:
```bash
Get-ChildItem -Path src -Filter "*.tsx" -Recurse | ForEach-Object {
  (Get-Content $_.FullName) -replace 'import \{ supabase \}', 'import { mysqlClient as supabase }' | 
  Set-Content $_.FullName
}
```

**Option B: Manual Migration**

For each file using `supabase`:

1. **Replace import:**
```typescript
// Before
import { supabase } from "@/integrations/supabase/client";

// After
import { mysqlClient as supabase } from "@/lib/mysqlClient";
```

2. **Update Auth Calls:**
```typescript
// signInWithPassword - NO CHANGE NEEDED
await supabase.auth.signInWithPassword({ email, password });

// signUp - NO CHANGE NEEDED
await supabase.auth.signUp({
  email,
  password,
  options: { data: { full_name } }
});

// signOut - NO CHANGE NEEDED
await supabase.auth.signOut();

// onAuthStateChange - NO CHANGE NEEDED
supabase.auth.onAuthStateChange((event, session) => {
  // ...
});
```

3. **Update CRUD Operations:**
```typescript
// SELECT - NO CHANGE NEEDED
const { data, error } = await supabase
  .from('departments')
  .select('*')
  .order('created_at', { ascending: false });

// INSERT - NO CHANGE NEEDED
const { error } = await supabase
  .from('departments')
  .insert([values]);

// UPDATE - NO CHANGE NEEDED
const { error } = await supabase
  .from('sheets')
  .update({ attendance_marked: true })
  .eq('id', sheetId);

// DELETE - NO CHANGE NEEDED
const { error } = await supabase
  .from('departments')
  .delete()
  .eq('id', departmentId);
```

### Step 4: Update Auth UI Component

Remove Supabase Auth UI and create custom login:

**src/pages/Login.tsx:**
```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mysqlClient as supabase } from '@/lib/mysqlClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { showError } from '@/utils/toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
    } else {
      navigate('/dashboard');
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">Welcome</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
```

### Step 5: Update Protected Routes

The protected routes should work as-is, but verify profile structure:

**src/components/DashboardLayout.tsx:**
```typescript
// Update profile fetching
const [profiles] = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// Access profile fields
profile.is_admin
profile.is_ceo
profile.is_sub_admin
profile.is_staff
```

### Step 6: Handle Realtime Updates

The adapter uses polling (5-second intervals). For true realtime, consider:

**Option A: Keep polling (simple)**
- Already implemented in `mysqlClient.ts`
- Works for most use cases

**Option B: Add WebSockets (advanced)**

Install Socket.io:
```bash
npm install socket.io-client
```

Update backend with Socket.io and emit events on data changes.

---

## Testing

### Step 1: Backend API Testing

Create `backend/tests/api.test.js`:
```javascript
const request = require('supertest');
const app = require('../server');

describe('Auth Endpoints', () => {
  it('should signup new user', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'Test@123',
        full_name: 'Test User'
      });
    expect(res.statusCode).toEqual(201);
  });

  it('should signin user', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'admin@example.com',
        password: 'Admin@123'
      });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('access_token');
  });
});
```

Run tests:
```bash
cd backend
npm test
```

### Step 2: Frontend Integration Testing

Test key workflows:

1. **Authentication Flow**
   - [ ] Sign up new user
   - [ ] Sign in
   - [ ] Sign out
   - [ ] Auto redirect on expired token

2. **Department Management**
   - [ ] View departments list
   - [ ] Add single department
   - [ ] Bulk upload departments
   - [ ] Edit department
   - [ ] Delete department

3. **Subject Management**
   - [ ] View subjects list
   - [ ] Add subject (department-specific)
   - [ ] Add common subject
   - [ ] Bulk upload subjects
   - [ ] Edit subject
   - [ ] Delete subject

4. **Sheet Management**
   - [ ] View sheets by department/subject
   - [ ] Upload new sheet
   - [ ] Edit sheet metadata
   - [ ] Mark attendance
   - [ ] Generate duplicates
   - [ ] Add external marks
   - [ ] Download sheet
   - [ ] Delete sheet

5. **Role-Based Access**
   - [ ] Admin can access admin routes
   - [ ] CEO can access CEO sheets
   - [ ] Sub-admin can access sub-admin sheets
   - [ ] Staff can access staff sheets
   - [ ] Unauthorized users redirected

### Step 3: Performance Testing

```bash
# Install Apache Bench
# Windows: Download from https://www.apachelounge.com/download/

# Test API performance
ab -n 1000 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
   http://localhost:3001/api/departments
```

Expected results:
- Response time: < 100ms
- Throughput: > 100 req/s
- Error rate: < 1%

---

## Deployment

### Production Checklist

- [ ] MySQL secured with strong passwords
- [ ] Firewall configured (only allow necessary ports)
- [ ] JWT secrets are cryptographically secure (32+ bytes)
- [ ] Environment variables set correctly
- [ ] HTTPS enabled (use nginx reverse proxy)
- [ ] CORS configured for production domain
- [ ] Database backups configured
- [ ] Logging enabled
- [ ] Rate limiting active
- [ ] Error monitoring set up (e.g., Sentry)

### Backend Deployment

**Option 1: VPS/Dedicated Server**

1. Setup nginx as reverse proxy:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

2. Enable HTTPS with Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

3. Setup PM2 for process management:
```bash
npm install -g pm2
cd /path/to/backend
pm2 start server.js --name coe-api
pm2 startup
pm2 save
```

**Option 2: Docker**

Create `backend/Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t coe-backend .
docker run -d -p 3001:3001 --env-file .env coe-backend
```

### Frontend Deployment

Update `vite.config.ts`:
```typescript
export default defineConfig({
  // ...
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
  }
});
```

Build for production:
```bash
npm run build
```

Deploy `dist/` folder to:
- **Vercel**: `vercel --prod`
- **Netlify**: `netlify deploy --prod`
- **Custom server**: Copy to nginx web root

Update `.env.production`:
```env
VITE_API_URL=https://api.yourdomain.com/api
```

---

## Rollback Plan

### If Issues Arise

**Step 1: Keep Supabase Active**
- Don't delete Supabase project immediately
- Keep it running for 30 days post-migration

**Step 2: Quick Rollback**
```bash
# Restore original client
git checkout src/integrations/supabase/client.ts

# Restore all component imports
git checkout src/

# Rebuild
npm run build
```

**Step 3: Database Rollback**
- Export current MySQL data
- Re-sync with Supabase if needed
- Use Supabase backup/restore features

---

## Troubleshooting

### Common Issues

**Issue 1: MySQL Connection Refused**
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**Solution:**
```bash
# Check MySQL service status
# Windows
sc query MySQL80

# Linux
sudo systemctl status mysql

# Restart if needed
# Windows
net stop MySQL80
net start MySQL80

# Linux
sudo systemctl restart mysql
```

**Issue 2: JWT Token Errors**
```
Error: jwt malformed
```

**Solution:**
- Verify JWT_SECRET is set in `.env`
- Ensure secret is at least 32 characters
- Check token format in Authorization header

**Issue 3: CORS Errors**
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:**
```javascript
// In server.js, update CORS config
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));
```

**Issue 4: MySQL UUID Issues**
```
Error: Incorrect string value for column 'id'
```

**Solution:**
- Use `CHAR(36)` for UUID columns
- Generate UUIDs using `UUID()` function in MySQL 8.0+
- Or use BINARY(16) with `UUID_TO_BIN()` for better performance

**Issue 5: Session Expired Immediately**
```
Error: Session expired right after login
```

**Solution:**
- Check system clock synchronization
- Verify JWT_EXPIRES_IN is set (e.g., '24h')
- Check session table expires_at values

---

## Performance Optimization

### Database Indexes
Already included in schema, but verify:
```sql
SHOW INDEX FROM sheets;
SHOW INDEX FROM profiles;
SHOW INDEX FROM departments;
```

### Connection Pooling
Adjust in `server.js`:
```javascript
const pool = mysql.createPool({
  // ...
  connectionLimit: 20,  // Increase for high traffic
  queueLimit: 0,
  waitForConnections: true
});
```

### Caching Strategy
Add Redis for session and query caching:
```bash
npm install redis
```

```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache department list for 5 minutes
app.get('/api/departments', async (req, res) => {
  const cached = await client.get('departments');
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const { data } = await pool.execute('SELECT * FROM departments');
  await client.setEx('departments', 300, JSON.stringify(data));
  res.json(data);
});
```

---

## Monitoring & Maintenance

### Database Backups

**Automated Daily Backups:**
```bash
# Create backup script: backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u coe_app -p coe_project > /backups/coe_$DATE.sql
# Keep only last 7 days
find /backups -name "coe_*.sql" -mtime +7 -delete
```

**Schedule with cron (Linux) or Task Scheduler (Windows)**

### Log Monitoring

Add Morgan logging:
```javascript
const morgan = require('morgan');
const fs = require('fs');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'logs/access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
```

### Health Monitoring

Add health check endpoint with database connectivity:
```javascript
app.get('/health/detailed', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      error: err.message
    });
  }
});
```

---

## Post-Migration Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Check database performance
- [ ] Verify backup processes
- [ ] Collect user feedback

### Week 2-4
- [ ] Optimize slow queries
- [ ] Fine-tune cache settings
- [ ] Review security logs
- [ ] Update documentation

### Month 2+
- [ ] Analyze usage patterns
- [ ] Plan feature improvements
- [ ] Consider scaling strategies
- [ ] Decommission Supabase (if stable)

---

## Support & Resources

### Documentation
- MySQL: https://dev.mysql.com/doc/
- Express.js: https://expressjs.com/
- JWT: https://jwt.io/

### Community
- Stack Overflow: Tag [mysql], [express], [jwt]
- GitHub Issues: Create issues in your repository

---

**Migration Completed**: 🎉
**Last Updated**: 2025-11-11
**Version**: 1.0

