/**
 * Express Backend Server for COE Project
 * Replaces Supabase Edge Functions and handles authentication
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Accept UUID-like (v1/v3/v4/v5) strings of 36 chars with hyphens
const UUID_LIKE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const app = express();
const PORT = process.env.PORT || 3001;

// ==============================================
// FILE STORAGE CONFIGURATION
// ==============================================

const STORAGE_DIR = path.join(__dirname, 'storage', 'sheets');

// Ensure storage directory exists
fs.mkdir(STORAGE_DIR, { recursive: true })
  .then(() => console.log('✓ Storage directory ready:', STORAGE_DIR))
  .catch(err => console.error('✗ Failed to create storage directory:', err.message));

// Configure multer for memory storage (we'll handle file writing manually)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// ==============================================
// MIDDLEWARE
// ==============================================

app.use(helmet());

// CORS configuration - allow multiple origins
// const allowedOrigins = [
 // 'http://localhost:5173',
  //'http://localhost:8081',
 // 'http://localhost:3000',
 // 'http://192.168.51.15:8083',
// 'http://192.168.51.16:8081',
// 'http://192.168.51.17:8081',
//'http://192.168.51.18:8081',
//'http://192.168.51.19:8081',
//'http://192.168.51.20:8081',
//'http://192.168.51.21:8081',
//'http://192.168.51.15:8081',
//'http://192.168.51.22:8081',
//'http://192.168.51.23:8081',
//'http://192.168.51.24:8081',
//'http://192.168.51.25:8081',
//  process.env.FRONTEND_URL
//].filter(Boolean);

//app.use(cors({
  //origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
   // if (!origin) return callback(null, true);
    
   // if (allowedOrigins.indexOf(origin) !== -1) {
    //  callback(null, true);
   // } else {
     // callback(new Error('Not allowed by CORS'));
   // }
  //},
app.use(cors({
origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // only 5 requests per 15 minutes
});

// ==============================================
// DATABASE CONNECTION POOL
// ==============================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'coe_app',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coe_project',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
pool.getConnection()
  .then(conn => {
    console.log('✓ Database connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });

// ==============================================
// IP WHITELIST MIDDLEWARE
// ==============================================

// IP Whitelist checker - always allows localhost
const ipWhitelistMiddleware = async (req, res, next) => {
  // Skip IP check for health endpoint
  if (req.path === '/health') {
    return next();
  }

  const clientIp = req.ip || req.socket.remoteAddress;
  
  // Always allow localhost
  const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
  if (localhostIPs.includes(clientIp)) {
    return next();
  }

  try {
    // Check if IP is in whitelist
    const [rows] = await pool.execute(
      'SELECT id FROM allowed_ips WHERE ip_address = ?',
      [clientIp]
    );

    if (rows.length > 0) {
      return next();
    }

    // IP not whitelisted
    console.log(`🚫 Access denied for IP: ${clientIp}`);
    return res.status(403).json({ 
      error: 'Access forbidden',
      message: 'Your IP address is not authorized to access this service. Contact your administrator.'
    });
  } catch (err) {
    console.error('IP whitelist check error:', err);
    // On error, allow request to proceed (fail open for safety)
    next();
  }
};

// Apply IP whitelist to all routes (except explicitly skipped ones)
// app.use(ipWhitelistMiddleware);

// ==============================================
// AUTH MIDDLEWARE
// ==============================================

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if session exists and is valid
    const [sessions] = await pool.execute(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get user profile
    const [users] = await pool.execute(
      `SELECT u.id, u.email, u.email_verified, p.full_name, 
              p.is_admin, p.is_ceo, p.is_sub_admin, p.is_staff
       FROM users u
       INNER JOIN profiles p ON u.id = p.id
       WHERE u.id = ?`,
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = users[0];
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
const requireRole = (...roles) => {
  return (req, res, next) => {
    const hasRole = roles.some(role => {
      switch(role) {
        case 'admin': return req.user.is_admin;
        case 'ceo': return req.user.is_ceo;
        case 'sub_admin': return req.user.is_sub_admin;
        case 'staff': return req.user.is_staff;
        default: return false;
      }
    });

    if (!hasRole) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// ==============================================
// AUTH ENDPOINTS
// ==============================================

// Sign Up
app.post('/api/auth/signup', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('full_name').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, full_name } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user (id is CHAR(36) UUID with default UUID())
    await connection.execute(
      `INSERT INTO users (email, password_hash, raw_user_meta_data) 
       VALUES (?, ?, ?)`,
      [email, password_hash, JSON.stringify({ full_name })]
    );

    // Fetch the created user's UUID (insertId is not valid for CHAR PK)
    const [idRows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const userId = idRows[0].id;

    await connection.commit();

    res.status(201).json({
      message: 'User created successfully',
      user: { id: userId, email }
    });
  } catch (err) {
    await connection.rollback();
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    connection.release();
  }
});

// Sign In
app.post('/api/auth/signin', authLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Get user
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Create session
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await pool.execute(
      `INSERT INTO sessions (user_id, token, refresh_token, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user.id, token, refreshToken, expiresAt, req.ip, req.get('user-agent')]
    );

    // Update last sign in
    await pool.execute(
      'UPDATE users SET last_sign_in_at = NOW() WHERE id = ?',
      [user.id]
    );

    // Get profile
    const [profiles] = await pool.execute(
      'SELECT * FROM profiles WHERE id = ?',
      [user.id]
    );

    res.json({
      access_token: token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        email_verified: user.email_verified,
        profile: profiles[0]
      }
    });
  } catch (err) {
    console.error('Sign in error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Sign Out
app.post('/api/auth/signout', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM sessions WHERE token = ?',
      [req.token]
    );
    res.json({ message: 'Signed out successfully' });
  } catch (err) {
    console.error('Sign out error:', err);
    res.status(500).json({ error: 'Sign out failed' });
  }
});

// Get Current User
app.get('/api/auth/user', authenticateToken, (req, res) => {
  const u = req.user;
  res.json({ 
    user: {
      id: u.id,
      email: u.email,
      email_verified: u.email_verified,
      profile: {
        full_name: u.full_name || null,
        is_admin: !!u.is_admin,
        is_ceo: !!u.is_ceo,
        is_sub_admin: !!u.is_sub_admin,
        is_staff: !!u.is_staff,
      }
    }
  });
});

// Refresh Token
app.post('/api/auth/refresh', [
  body('refresh_token').notEmpty()
], async (req, res) => {
  const { refresh_token } = req.body;

  try {
    const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Verify refresh token exists
    const [sessions] = await pool.execute(
      'SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > NOW()',
      [refresh_token]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Generate new tokens
    const newToken = generateToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Update session
    await pool.execute(
      'UPDATE sessions SET token = ?, refresh_token = ?, expires_at = ? WHERE refresh_token = ?',
      [newToken, newRefreshToken, expiresAt, refresh_token]
    );

    res.json({
      access_token: newToken,
      refresh_token: newRefreshToken
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(401).json({ error: 'Token refresh failed' });
  }
});

// ==============================================
// DEPARTMENTS ENDPOINTS
// ==============================================

// Get all departments
app.get('/api/departments', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM departments ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get departments error:', err);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Create department
app.post('/api/departments', authenticateToken, requireRole('admin'), [
  body('degree').notEmpty().trim(),
  body('department_code').notEmpty().trim(),
  body('department_name').notEmpty().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { degree, department_code, department_name } = req.body;

  try {
    const [result] = await pool.execute(
      'INSERT INTO departments (degree, department_code, department_name) VALUES (?, ?, ?)',
      [degree, department_code, department_name]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM departments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Department code already exists' });
    }
    console.error('Create department error:', err);
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Bulk insert departments
app.post('/api/departments/bulk', authenticateToken, requireRole('admin'), async (req, res) => {
  const { departments } = req.body;

  if (!Array.isArray(departments) || departments.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const values = departments.map(d => [d.degree, d.department_code, d.department_name]);
    
    await connection.query(
      'INSERT INTO departments (degree, department_code, department_name) VALUES ?',
      [values]
    );

    await connection.commit();
    res.status(201).json({ message: `${departments.length} departments created` });
  } catch (err) {
    await connection.rollback();
    console.error('Bulk insert error:', err);
    res.status(500).json({ error: 'Bulk insert failed' });
  } finally {
    connection.release();
  }
});

// Update department
app.put('/api/departments/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE),
  body('degree').optional().trim(),
  body('department_code').optional().trim(),
  body('department_name').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const updates = req.body;

  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    await pool.execute(
      `UPDATE departments SET ${fields} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute('SELECT * FROM departments WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update department error:', err);
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department
app.delete('/api/departments/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const { id } = req.params;

  try {
    await pool.execute('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ message: 'Department deleted' });
  } catch (err) {
    console.error('Delete department error:', err);
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

// ==============================================
// SUBJECTS ENDPOINTS (Similar pattern)
// ==============================================

// Get all subjects
app.get('/api/subjects', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.*, d.department_name 
       FROM subjects s
       LEFT JOIN departments d ON s.department_id = d.id
       ORDER BY s.created_at DESC`
    );
    
    // Transform flat structure to nested format (Supabase-compatible)
    const transformed = rows.map(row => {
      const { department_name, ...rest } = row;
      return {
        ...rest,
        departments: department_name ? { department_name } : null
      };
    });
    
    res.json(transformed);
  } catch (err) {
    console.error('Get subjects error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Get subjects by department
app.get('/api/subjects/department/:departmentId', authenticateToken, async (req, res) => {
  const { departmentId } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT * FROM subjects 
       WHERE department_id = ? OR department_id IS NULL
       ORDER BY subject_name`,
      [departmentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get subjects by department error:', err);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// Create subject
app.post('/api/subjects', authenticateToken, requireRole('admin'), [
  body('subject_code').notEmpty().trim(),
  body('subject_name').notEmpty().trim(),
  body('department_id').optional().matches(UUID_LIKE)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { subject_code, subject_name, department_id } = req.body;

  try {
    const [result] = await pool.execute(
      'INSERT INTO subjects (subject_code, subject_name, department_id) VALUES (?, ?, ?)',
      [subject_code, subject_name, department_id || null]
    );

    const [rows] = await pool.execute('SELECT * FROM subjects WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Subject code already exists' });
    }
    console.error('Create subject error:', err);
    res.status(500).json({ error: 'Failed to create subject' });
  }
});

// Bulk insert subjects
app.post('/api/subjects/bulk', authenticateToken, requireRole('admin'), async (req, res) => {
  const { subjects } = req.body;

  if (!Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'Invalid data format' });
  }

  // Validate payload shape and sanitize values
  const sanitized = [];
  for (const s of subjects) {
    const code = typeof s.subject_code === 'string' ? s.subject_code.trim() : '';
    const name = typeof s.subject_name === 'string' ? s.subject_name.trim() : '';
    const dep = s.department_id ? String(s.department_id).trim() : null;
    if (!code || !name) {
      return res.status(400).json({ error: 'Each subject must include subject_code and subject_name' });
    }
    sanitized.push({ subject_code: code, subject_name: name, department_id: dep || null });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Insert one-by-one to handle duplicates and undefined safely
    let inserted = 0;
    let skipped = 0;

    for (const s of sanitized) {
      try {
        await connection.execute(
          'INSERT INTO subjects (subject_code, subject_name, department_id) VALUES (?, ?, ?)',
          [s.subject_code, s.subject_name, s.department_id]
        );
        inserted += 1;
      } catch (e) {
        if (e && e.code === 'ER_DUP_ENTRY') {
          skipped += 1; // duplicate subject_code; skip
          continue;
        }
        throw e; // rethrow other errors
      }
    }

    await connection.commit();
    res.status(201).json({ message: `Bulk upsert complete`, inserted, skipped });
  } catch (err) {
    await connection.rollback();
    console.error('Bulk insert subjects error:', err);
    res.status(500).json({ error: 'Bulk insert failed', details: err && err.message ? err.message : String(err) });
  } finally {
    connection.release();
  }
});

// Update subject
app.put('/api/subjects/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE),
  body('subject_code').optional().trim(),
  body('subject_name').optional().trim(),
  body('department_id').optional().matches(UUID_LIKE)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const updates = req.body;

  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  try {
    await pool.execute(
      `UPDATE subjects SET ${fields} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute('SELECT * FROM subjects WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update subject error:', err);
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// Delete subject
app.delete('/api/subjects/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const { id } = req.params;

  try {
    await pool.execute('DELETE FROM subjects WHERE id = ?', [id]);
    res.json({ message: 'Subject deleted' });
  } catch (err) {
    console.error('Delete subject error:', err);
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

// ==============================================
// SHEETS ENDPOINTS
// ==============================================

// Get all sheets with relations
app.get('/api/sheets', authenticateToken, async (req, res) => {
  try {
    // Optional filters via query params (e.g., attendance_marked=true, subject_id=..., department_id=...)
    const { attendance_marked, duplicates_generated, external_marks_added, subject_id, department_id, order, dir } = req.query;
    const conditions = [];
    const params = [];

    const parseBool = (v) => {
      if (v === undefined) return undefined;
      const s = String(v).toLowerCase();
      return s === 'true' ? 1 : s === 'false' ? 0 : undefined;
    };

    const am = parseBool(attendance_marked);
    const dg = parseBool(duplicates_generated);
    const em = parseBool(external_marks_added);

    if (am !== undefined) { conditions.push('s.attendance_marked = ?'); params.push(am); }
    if (dg !== undefined) { conditions.push('s.duplicates_generated = ?'); params.push(dg); }
    if (em !== undefined) { conditions.push('s.external_marks_added = ?'); params.push(em); }
    if (subject_id) { conditions.push('s.subject_id = ?'); params.push(subject_id); }
    if (department_id) { conditions.push('s.department_id = ?'); params.push(department_id); }

    const whereClause = conditions.length ? ('WHERE ' + conditions.join(' AND ')) : '';
    const orderBy = ['created_at', 'updated_at'].includes(String(order)) ? String(order) : 'created_at';
    const direction = String(dir).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const [rows] = await pool.execute(
      `SELECT s.*, 
              d.degree, d.department_name,
              sub.subject_code, sub.subject_name
       FROM sheets s
       LEFT JOIN departments d ON s.department_id = d.id
       LEFT JOIN subjects sub ON s.subject_id = sub.id
       ${whereClause}
       ORDER BY s.${orderBy} ${direction}`,
      params
    );
    
    // Transform to match Supabase structure with nested objects
    const transformed = rows.map((row) => ({
      id: row.id,
      sheet_name: row.sheet_name,
      file_path: row.file_path,
      subject_id: row.subject_id,
      department_id: row.department_id,
      user_id: row.user_id,
      created_at: row.created_at,
      start_date: row.start_date,
      end_date: row.end_date,
      updated_at: row.updated_at,
      attendance_marked: row.attendance_marked,
      duplicates_generated: row.duplicates_generated,
      external_marks_added: row.external_marks_added,
      year: row.year,
      batch: row.batch,
      departments: row.department_id ? {
        id: row.department_id,
        degree: row.degree,
        department_name: row.department_name
      } : null,
      subjects: row.subject_id ? {
        subject_code: row.subject_code,
        subject_name: row.subject_name
      } : null
    }));
    
    // Debug: Log the first transformed sheet to verify structure
    if (transformed.length > 0) {
      console.log('📤 Backend sending sheet data sample:', JSON.stringify(transformed[0], null, 2));
    }
    
    res.json(transformed);
  } catch (err) {
    console.error('Get sheets error:', err);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
});

// Get sheets by subject
app.get('/api/sheets/subject/:subjectId', authenticateToken, async (req, res) => {
  const { subjectId } = req.params;

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM v_sheets_detail WHERE subject_id = ? ORDER BY created_at DESC',
      [subjectId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Get sheets error:', err);
    res.status(500).json({ error: 'Failed to fetch sheets' });
  }
});

// Create sheet
app.post('/api/sheets', authenticateToken, [
  body('sheet_name').notEmpty().trim(),
  body('file_path').notEmpty(),
  body('subject_id').matches(UUID_LIKE),
  body('department_id').matches(UUID_LIKE),
  body('maximum_internal_mark').optional().isInt({ min: 1 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { sheet_name, file_path, subject_id, department_id, year, batch, maximum_internal_mark } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO sheets (sheet_name, file_path, subject_id, department_id, user_id, year, batch, maximum_internal_mark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [sheet_name, file_path, subject_id, department_id, req.user.id, year, batch, maximum_internal_mark || 50]
    );

    const [rows] = await pool.execute('SELECT * FROM sheets WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create sheet error:', err);
    res.status(500).json({ error: 'Failed to create sheet' });
  }
});

// Update sheet
app.put('/api/sheets/:id', authenticateToken, [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = ['start_date', 'end_date', 'attendance_marked', 'duplicates_generated', 'external_marks_added', 'year', 'batch'];
  const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = [...fields.map(f => updates[f]), id];

  try {
    await pool.execute(`UPDATE sheets SET ${setClause} WHERE id = ?`, values);
    const [rows] = await pool.execute('SELECT * FROM sheets WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Update sheet error:', err);
    res.status(500).json({ error: 'Failed to update sheet' });
  }
});

// Delete sheet
app.delete('/api/sheets/:id', authenticateToken, [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const { id } = req.params;

  try {
    await pool.execute('DELETE FROM sheets WHERE id = ?', [id]);
    res.json({ message: 'Sheet deleted' });
  } catch (err) {
    console.error('Delete sheet error:', err);
    res.status(500).json({ error: 'Failed to delete sheet' });
  }
});

// ==============================================
// BUNDLE_EXAMINERS ENDPOINTS
// ==============================================

// DEBUG: List all bundle examiners for a sheet
app.get('/api/bundle_examiners/debug/:sheet_id', authenticateToken, async (req, res) => {
  const { sheet_id } = req.params;
  
  try {
    const [rows] = await pool.execute(
      'SELECT id, sheet_id, bundle_number, LENGTH(bundle_number) as bundle_length, internal_examiner_name FROM bundle_examiners WHERE sheet_id = ?',
      [sheet_id]
    );
    
    res.json(rows);
  } catch (err) {
    console.error('[bundle_examiners DEBUG] Error:', err);
    res.status(500).json({ error: 'Failed to fetch debug data' });
  }
});

// Get bundle examiner details
app.get('/api/bundle_examiners', authenticateToken, async (req, res) => {
  const { sheet_id, bundle_number } = req.query;
  
  console.log('[bundle_examiners GET] Query params:', { sheet_id, bundle_number });
  
  try {
    let query = 'SELECT * FROM bundle_examiners';
    const params = [];
    const conditions = [];
    
    if (sheet_id) {
      conditions.push('sheet_id = ?');
      params.push(sheet_id);
    }
    if (bundle_number) {
      // Compare after trimming spaces to avoid subtle mismatches
      conditions.push('TRIM(bundle_number) = TRIM(?)');
      params.push(bundle_number);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    console.log('[bundle_examiners GET] Executing query:', query, 'with params:', params);
    
    const [rows] = await pool.execute(query, params);
    
    console.log('[bundle_examiners GET] Query result:', rows.length, 'rows');
    
    // Return single row if both sheet_id and bundle_number are specified
    if (sheet_id && bundle_number) {
      const result = rows.length > 0 ? rows[0] : null;
      console.log('[bundle_examiners GET] Returning single row:', result ? 'found' : 'null');
      res.json(result);
    } else {
      console.log('[bundle_examiners GET] Returning all rows');
      res.json(rows);
    }
  } catch (err) {
    console.error('[bundle_examiners GET] Error:', err);
    res.status(500).json({ error: 'Failed to fetch bundle examiners' });
  }
});

// Create bundle examiner details
app.post('/api/bundle_examiners', authenticateToken, [
  body('sheet_id').matches(UUID_LIKE),
  body('bundle_number').notEmpty().trim(),
  body('internal_examiner_name').notEmpty().trim(),
  body('internal_examiner_designation').notEmpty().trim(),
  body('internal_examiner_department').notEmpty().trim(),
  body('internal_examiner_college').notEmpty().trim(),
  body('chief_name').optional().trim(),
  body('chief_designation').optional().trim(),
  body('chief_department').optional().trim(),
  body('chief_college').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    sheet_id,
    bundle_number,
    internal_examiner_name,
    internal_examiner_designation,
    internal_examiner_department,
    internal_examiner_college,
    chief_name,
    chief_designation,
    chief_department,
    chief_college
  } = req.body;

  try {
    const [result] = await pool.execute(
      `INSERT INTO bundle_examiners (
        sheet_id, bundle_number,
        internal_examiner_name, internal_examiner_designation,
        internal_examiner_department, internal_examiner_college,
        chief_name, chief_designation, chief_department, chief_college
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sheet_id, bundle_number,
        internal_examiner_name, internal_examiner_designation,
        internal_examiner_department, internal_examiner_college,
        chief_name || null, chief_designation || null,
        chief_department || null, chief_college || null
      ]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM bundle_examiners WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Examiner details already exist for this bundle' });
    }
    console.error('Create bundle examiner error:', err);
    res.status(500).json({ error: 'Failed to create bundle examiner' });
  }
});

// Update bundle examiner details
app.put('/api/bundle_examiners/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const allowedFields = [
    'internal_examiner_name', 'internal_examiner_designation',
    'internal_examiner_department', 'internal_examiner_college',
    'chief_name', 'chief_designation', 'chief_department', 'chief_college'
  ];
  
  const fields = Object.keys(updates).filter(k => allowedFields.includes(k));
  
  if (fields.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const setClause = fields.map(f => `${f} = ?`).join(', ');
  const values = [...fields.map(f => updates[f]), id];

  try {
    await pool.execute(
      `UPDATE bundle_examiners SET ${setClause} WHERE id = ?`,
      values
    );
    
    const [rows] = await pool.execute(
      'SELECT * FROM bundle_examiners WHERE id = ?',
      [id]
    );
    
    res.json(rows[0]);
  } catch (err) {
    console.error('Update bundle examiner error:', err);
    res.status(500).json({ error: 'Failed to update bundle examiner' });
  }
});

// Delete bundle examiner details
app.delete('/api/bundle_examiners/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const { id } = req.params;

  try {
    await pool.execute('DELETE FROM bundle_examiners WHERE id = ?', [id]);
    res.json({ message: 'Bundle examiner deleted' });
  } catch (err) {
    console.error('Delete bundle examiner error:', err);
    res.status(500).json({ error: 'Failed to delete bundle examiner' });
  }
});

// ==============================================
// USER MANAGEMENT ENDPOINTS
// ==============================================

// Get all users (Admin only)
app.get('/api/users', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.email_verified, u.created_at, u.last_sign_in_at,
              p.full_name, p.is_admin, p.is_ceo, p.is_sub_admin, p.is_staff
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       ORDER BY u.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user by ID (Admin only)
app.get('/api/users/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const [rows] = await pool.execute(
      `SELECT u.id, u.email, u.email_verified, u.created_at, u.last_sign_in_at,
              p.full_name, p.is_admin, p.is_ceo, p.is_sub_admin, p.is_staff
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       WHERE u.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user (Admin only)
app.post('/api/users', authenticateToken, requireRole('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('full_name').optional().trim(),
  body('is_admin').optional().isBoolean(),
  body('is_ceo').optional().isBoolean(),
  body('is_sub_admin').optional().isBoolean(),
  body('is_staff').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, full_name, is_admin, is_ceo, is_sub_admin, is_staff } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user (id is CHAR(36) UUID with default UUID())
    await connection.execute(
      `INSERT INTO users (email, password_hash, raw_user_meta_data) 
       VALUES (?, ?, ?)`,
      [email, password_hash, JSON.stringify({ full_name })]
    );

    // Fetch the created user's UUID (insertId is not valid for CHAR PK)
    const [idRows] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    const userId = idRows[0].id;

    // Update profile with roles (profile row is created by trigger after insert)
    await connection.execute(
      `UPDATE profiles 
       SET full_name = ?, is_admin = ?, is_ceo = ?, is_sub_admin = ?, is_staff = ?
       WHERE id = ?`,
      [
        full_name || null,
        is_admin || false,
        is_ceo || false,
        is_sub_admin || false,
        is_staff || false,
        userId
      ]
    );

    await connection.commit();

    // Fetch the created user with profile
    const [rows] = await connection.execute(
      `SELECT u.id, u.email, u.email_verified, u.created_at,
              p.full_name, p.is_admin, p.is_ceo, p.is_sub_admin, p.is_staff
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       WHERE u.id = ?`,
      [userId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    await connection.rollback();
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    connection.release();
  }
});

// Update user (Admin only)
app.put('/api/users/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE),
  body('email').optional().isEmail().normalizeEmail(),
  body('full_name').optional().trim(),
  body('is_admin').optional().isBoolean(),
  body('is_ceo').optional().isBoolean(),
  body('is_sub_admin').optional().isBoolean(),
  body('is_staff').optional().isBoolean(),
  body('password').optional().isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { email, full_name, is_admin, is_ceo, is_sub_admin, is_staff, password } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user table if email or password changed
    if (email || password) {
      const userUpdates = [];
      const userValues = [];

      if (email) {
        userUpdates.push('email = ?');
        userValues.push(email);
      }

      if (password) {
        const password_hash = await bcrypt.hash(password, 10);
        userUpdates.push('password_hash = ?');
        userValues.push(password_hash);
      }

      if (userUpdates.length > 0) {
        userValues.push(id);
        await connection.execute(
          `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`,
          userValues
        );
      }
    }

    // Update profile table
    const profileUpdates = [];
    const profileValues = [];

    if (full_name !== undefined) {
      profileUpdates.push('full_name = ?');
      profileValues.push(full_name || null);
    }
    if (is_admin !== undefined) {
      profileUpdates.push('is_admin = ?');
      profileValues.push(is_admin);
    }
    if (is_ceo !== undefined) {
      profileUpdates.push('is_ceo = ?');
      profileValues.push(is_ceo);
    }
    if (is_sub_admin !== undefined) {
      profileUpdates.push('is_sub_admin = ?');
      profileValues.push(is_sub_admin);
    }
    if (is_staff !== undefined) {
      profileUpdates.push('is_staff = ?');
      profileValues.push(is_staff);
    }

    if (profileUpdates.length > 0) {
      profileValues.push(id);
      await connection.execute(
        `UPDATE profiles SET ${profileUpdates.join(', ')} WHERE id = ?`,
        profileValues
      );
    }

    await connection.commit();

    // Fetch updated user
    const [rows] = await connection.execute(
      `SELECT u.id, u.email, u.email_verified, u.created_at, u.last_sign_in_at,
              p.full_name, p.is_admin, p.is_ceo, p.is_sub_admin, p.is_staff
       FROM users u
       LEFT JOIN profiles p ON u.id = p.id
       WHERE u.id = ?`,
      [id]
    );

    res.json(rows[0]);
  } catch (err) {
    await connection.rollback();
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    connection.release();
  }
});

// Delete user (Admin only)
app.delete('/api/users/:id', authenticateToken, requireRole('admin'), [
  param('id').matches(UUID_LIKE)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const connection = await pool.getConnection();

  try {
    // Prevent deleting yourself
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await connection.beginTransaction();

    // Delete profile first (due to foreign key)
    await connection.execute('DELETE FROM profiles WHERE id = ?', [id]);

    // Delete user sessions
    await connection.execute('DELETE FROM sessions WHERE user_id = ?', [id]);

    // Delete user
    const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'User not found' });
    }

    await connection.commit();
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    await connection.rollback();
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    connection.release();
  }
});

// ==============================================
// IP WHITELIST MANAGEMENT ENDPOINTS (Admin only)
// ==============================================

// Get all allowed IPs
app.get('/api/allowed-ips', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM allowed_ips ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('Get allowed IPs error:', err);
    res.status(500).json({ error: 'Failed to fetch allowed IPs' });
  }
});

// Add an IP to whitelist
app.post('/api/allowed-ips', authenticateToken, requireRole('admin'), [
  body('ip_address').notEmpty().trim().isIP(),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { ip_address, description } = req.body;

  try {
    const [result] = await pool.execute(
      'INSERT INTO allowed_ips (ip_address, description) VALUES (?, ?)',
      [ip_address, description || null]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM allowed_ips WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'IP address already whitelisted' });
    }
    console.error('Create allowed IP error:', err);
    res.status(500).json({ error: 'Failed to add IP to whitelist' });
  }
});

// Update allowed IP
app.put('/api/allowed-ips/:id', authenticateToken, requireRole('admin'), [
  param('id').isInt(),
  body('ip_address').optional().isIP(),
  body('description').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const updates = req.body;

  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = [...Object.values(updates), id];

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  try {
    await pool.execute(
      `UPDATE allowed_ips SET ${fields} WHERE id = ?`,
      values
    );

    const [rows] = await pool.execute(
      'SELECT * FROM allowed_ips WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'IP address not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Update allowed IP error:', err);
    res.status(500).json({ error: 'Failed to update allowed IP' });
  }
});

// Delete allowed IP
app.delete('/api/allowed-ips/:id', authenticateToken, requireRole('admin'), [
  param('id').isInt()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;

  try {
    const [result] = await pool.execute(
      'DELETE FROM allowed_ips WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'IP address not found' });
    }

    res.json({ message: 'IP address removed from whitelist' });
  } catch (err) {
    console.error('Delete allowed IP error:', err);
    res.status(500).json({ error: 'Failed to remove IP from whitelist' });
  }
});

// ==============================================
// STORAGE ENDPOINTS
// ==============================================

// Utility function to sanitize paths and prevent directory traversal
const sanitizePath = (filePath) => {
  const normalized = path.normalize(filePath).replace(/^(\.\.[\\\/])+/, '');
  const fullPath = path.join(STORAGE_DIR, normalized);
  
  // Ensure the resolved path is within STORAGE_DIR
  if (!fullPath.startsWith(STORAGE_DIR)) {
    throw new Error('Invalid file path');
  }
  
  return fullPath;
};

// Upload new file
app.post('/api/storage/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { path: targetPath } = req.body;
    
    if (!targetPath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = sanitizePath(targetPath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, req.file.buffer);

    res.status(201).json({ 
      message: 'File uploaded successfully',
      path: targetPath,
      size: req.file.size
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload file', details: err.message });
  }
});

// Update existing file (overwrite)
app.post('/api/storage/update', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { path: targetPath } = req.body;
    
    if (!targetPath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = sanitizePath(targetPath);
    
    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Overwrite file
    await fs.writeFile(fullPath, req.file.buffer);

    res.json({ 
      message: 'File updated successfully',
      path: targetPath,
      size: req.file.size
    });
  } catch (err) {
    console.error('Update file error:', err);
    res.status(500).json({ error: 'Failed to update file', details: err.message });
  }
});

// Download file
app.get('/api/storage/download', authenticateToken, async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = sanitizePath(filePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Send file
    res.sendFile(fullPath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download file', details: err.message });
  }
});

// Delete file
app.delete('/api/storage/remove', authenticateToken, async (req, res) => {
  try {
    const { path: filePath } = req.query;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }

    const fullPath = sanitizePath(filePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete file
    await fs.unlink(fullPath);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
});

// List files in a directory (optional)
app.get('/api/storage/list', authenticateToken, async (req, res) => {
  try {
    const { path: dirPath = '' } = req.query;
    
    const fullPath = sanitizePath(dirPath);

    // Check if directory exists
    try {
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        return res.status(400).json({ error: 'Path is not a directory' });
      }
    } catch {
      return res.status(404).json({ error: 'Directory not found' });
    }

    // Read directory
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(fullPath, entry.name);
        const stat = await fs.stat(entryPath);
        const relativePath = path.relative(STORAGE_DIR, entryPath).replace(/\\/g, '/');
        
        return {
          name: entry.name,
          path: relativePath,
          isDirectory: entry.isDirectory(),
          size: stat.size,
          modified: stat.mtime
        };
      })
    );

    res.json({ files });
  } catch (err) {
    console.error('List files error:', err);
    res.status(500).json({ error: 'Failed to list files', details: err.message });
  }
});

// ==============================================
// HEALTH CHECK
// ==============================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==============================================
// ERROR HANDLERS
// ==============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ==============================================
// START SERVER
// ==============================================

app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await pool.end();
  process.exit(0);
});

