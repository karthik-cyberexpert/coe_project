-- ===============================================================================
-- MERGED SCHEMA FILE
-- Project: COE Project
-- Generated: 2025-11-13
-- 
-- This file contains all SQL schema definitions, migrations, and seed data
-- merged from the following source files:
--   1. migration/add_bundle_examiners_table.sql
--   2. migration/add_ip_whitelist_table.sql
--   3. migration/backend/migrations/add_maximum_internal_mark.sql
--   4. migration/backend/migrations/add_staff_id_to_bundle_examiners.sql
--   5. migration/mysql_schema.sql
--   6. migration/seed_data.sql
-- ===============================================================================


-- ===============================================================================
-- FILE: migration/mysql_schema.sql
-- Main database schema with core tables, triggers, views, and functions
-- ===============================================================================

-- MySQL Database Schema for COE Project
-- Migrated from Supabase (PostgreSQL)
-- Version: 1.0
-- Date: 2025-11-11

-- ==============================================
-- DATABASE SETUP
-- ==============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS coe_project 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE coe_project;

-- ==============================================
-- TABLE: users
-- Replaces Supabase auth.users
-- ==============================================

CREATE TABLE users (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_sign_in_at TIMESTAMP NULL,
  raw_user_meta_data JSON NULL,
  PRIMARY KEY (id),
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: profiles
-- User profile information with role-based access
-- ==============================================

CREATE TABLE profiles (
  id CHAR(36) NOT NULL,
  full_name VARCHAR(255) NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  is_ceo BOOLEAN DEFAULT FALSE,
  is_sub_admin BOOLEAN DEFAULT FALSE,
  is_staff BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_profiles_users 
    FOREIGN KEY (id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  INDEX idx_is_admin (is_admin),
  INDEX idx_is_ceo (is_ceo),
  INDEX idx_is_sub_admin (is_sub_admin),
  INDEX idx_is_staff (is_staff)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: departments
-- Academic departments
-- ==============================================

CREATE TABLE departments (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  degree VARCHAR(100) NOT NULL,
  department_code VARCHAR(50) NOT NULL,
  department_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_department_code (department_code),
  INDEX idx_degree (degree),
  INDEX idx_department_code (department_code),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: subjects
-- Academic subjects/courses
-- ==============================================

CREATE TABLE subjects (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  subject_code VARCHAR(50) NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  department_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_subject_code (subject_code),
  CONSTRAINT fk_subjects_departments 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id) 
    ON DELETE SET NULL,
  INDEX idx_subject_code (subject_code),
  INDEX idx_department_id (department_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: sheets
-- Uploaded data sheets with metadata
-- ==============================================

CREATE TABLE sheets (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  sheet_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  subject_id CHAR(36) NOT NULL,
  department_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  start_date TIMESTAMP NULL,
  end_date TIMESTAMP NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  attendance_marked BOOLEAN DEFAULT FALSE,
  duplicates_generated BOOLEAN DEFAULT FALSE,
  external_marks_added BOOLEAN DEFAULT FALSE,
  year VARCHAR(20) NULL,
  batch VARCHAR(50) NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sheets_departments 
    FOREIGN KEY (department_id) 
    REFERENCES departments(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_sheets_subjects 
    FOREIGN KEY (subject_id) 
    REFERENCES subjects(id) 
    ON DELETE CASCADE,
  CONSTRAINT fk_sheets_users 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  INDEX idx_subject_id (subject_id),
  INDEX idx_department_id (department_id),
  INDEX idx_user_id (user_id),
  INDEX idx_year_batch (year, batch),
  INDEX idx_created_at (created_at),
  INDEX idx_start_end_date (start_date, end_date),
  INDEX idx_attendance_marked (attendance_marked),
  INDEX idx_duplicates_generated (duplicates_generated),
  INDEX idx_external_marks_added (external_marks_added)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: sessions
-- User session management (replaces Supabase auth sessions)
-- ==============================================

CREATE TABLE sessions (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  refresh_token VARCHAR(512) NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sessions_users 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: audit_logs
-- Activity logging for compliance and debugging
-- ==============================================

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT,
  user_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(36) NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_users 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_table_name (table_name),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- TABLE: password_reset_tokens
-- Password reset functionality
-- ==============================================

CREATE TABLE password_reset_tokens (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_password_reset_users 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================
-- STORED PROCEDURES
-- ==============================================

-- Procedure to clean expired sessions
DELIMITER $$

CREATE PROCEDURE cleanup_expired_sessions()
BEGIN
  DELETE FROM sessions 
  WHERE expires_at < NOW();
END$$

DELIMITER ;

-- Procedure to clean expired password reset tokens
DELIMITER $$

CREATE PROCEDURE cleanup_expired_password_tokens()
BEGIN
  DELETE FROM password_reset_tokens 
  WHERE expires_at < NOW() OR used = TRUE;
END$$

DELIMITER ;

-- ==============================================
-- TRIGGERS
-- ==============================================

-- Trigger: Auto-create profile after user registration
DELIMITER $$

CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO profiles (id, full_name, created_at)
  VALUES (
    NEW.id,
    JSON_UNQUOTE(JSON_EXTRACT(NEW.raw_user_meta_data, '$.full_name')),
    NOW()
  );
END$$

DELIMITER ;

-- Trigger: Log sheet deletions
DELIMITER $$

CREATE TRIGGER before_sheet_delete
BEFORE DELETE ON sheets
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
  VALUES (
    OLD.user_id,
    'DELETE',
    'sheets',
    OLD.id,
    JSON_OBJECT(
      'sheet_name', OLD.sheet_name,
      'file_path', OLD.file_path,
      'subject_id', OLD.subject_id,
      'department_id', OLD.department_id
    )
  );
END$$

DELIMITER ;

-- Trigger: Log department deletions
DELIMITER $$

CREATE TRIGGER before_department_delete
BEFORE DELETE ON departments
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (action, table_name, record_id, old_values)
  VALUES (
    'DELETE',
    'departments',
    OLD.id,
    JSON_OBJECT(
      'degree', OLD.degree,
      'department_code', OLD.department_code,
      'department_name', OLD.department_name
    )
  );
END$$

DELIMITER ;

-- ==============================================
-- EVENTS (Scheduled Tasks)
-- ==============================================

-- Enable event scheduler
SET GLOBAL event_scheduler = ON;

-- Event: Clean expired sessions daily
CREATE EVENT IF NOT EXISTS cleanup_sessions_daily
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
  CALL cleanup_expired_sessions();

-- Event: Clean expired password tokens every 6 hours
CREATE EVENT IF NOT EXISTS cleanup_password_tokens
ON SCHEDULE EVERY 6 HOUR
STARTS CURRENT_TIMESTAMP
DO
  CALL cleanup_expired_password_tokens();

-- ==============================================
-- INITIAL DATA (Optional)
-- ==============================================

-- Insert default admin user (password: Admin@123)
-- Password hash should be generated by your application
-- This is just a placeholder
INSERT INTO users (id, email, password_hash, email_verified, raw_user_meta_data)
VALUES (
  UUID(),
  'admin@example.com',
  '$2a$10$placeholder_hash_replace_with_actual_hash',
  TRUE,
  JSON_OBJECT('full_name', 'System Administrator')
);

-- Update the admin profile
UPDATE profiles 
SET is_admin = TRUE, is_staff = FALSE 
WHERE id = (SELECT id FROM users WHERE email = 'admin@example.com');

-- ==============================================
-- VIEWS
-- ==============================================

-- View: User profiles with email
CREATE VIEW v_user_profiles AS
SELECT 
  u.id,
  u.email,
  u.email_verified,
  u.created_at AS user_created_at,
  u.last_sign_in_at,
  p.full_name,
  p.is_admin,
  p.is_ceo,
  p.is_sub_admin,
  p.is_staff,
  p.updated_at AS profile_updated_at
FROM users u
INNER JOIN profiles p ON u.id = p.id;

-- View: Sheets with related information
CREATE VIEW v_sheets_detail AS
SELECT 
  s.id,
  s.sheet_name,
  s.file_path,
  s.created_at,
  s.updated_at,
  s.start_date,
  s.end_date,
  s.year,
  s.batch,
  s.attendance_marked,
  s.duplicates_generated,
  s.external_marks_added,
  subj.subject_code,
  subj.subject_name,
  dept.department_code,
  dept.department_name,
  dept.degree,
  u.email AS uploaded_by_email,
  p.full_name AS uploaded_by_name
FROM sheets s
INNER JOIN subjects subj ON s.subject_id = subj.id
INNER JOIN departments dept ON s.department_id = dept.id
LEFT JOIN users u ON s.user_id = u.id
LEFT JOIN profiles p ON s.user_id = p.id;

-- View: Subjects with department info
CREATE VIEW v_subjects_detail AS
SELECT 
  s.id,
  s.subject_code,
  s.subject_name,
  s.created_at,
  s.department_id,
  d.department_code,
  d.department_name,
  d.degree,
  CASE 
    WHEN s.department_id IS NULL THEN 'Common'
    ELSE 'Department-Specific'
  END AS subject_type
FROM subjects s
LEFT JOIN departments d ON s.department_id = d.id;

-- ==============================================
-- STORED FUNCTIONS
-- ==============================================

-- Function: Check if user has specific role
DELIMITER $$

CREATE FUNCTION has_role(
  p_user_id CHAR(36),
  p_role VARCHAR(20)
) RETURNS BOOLEAN
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE result BOOLEAN DEFAULT FALSE;
  
  SELECT 
    CASE p_role
      WHEN 'admin' THEN is_admin
      WHEN 'ceo' THEN is_ceo
      WHEN 'sub_admin' THEN is_sub_admin
      WHEN 'staff' THEN is_staff
      ELSE FALSE
    END INTO result
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(result, FALSE);
END$$

DELIMITER ;

-- Function: Get user full name by ID
DELIMITER $$

CREATE FUNCTION get_user_full_name(
  p_user_id CHAR(36)
) RETURNS VARCHAR(255)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE user_name VARCHAR(255);
  
  SELECT full_name INTO user_name
  FROM profiles
  WHERE id = p_user_id;
  
  RETURN COALESCE(user_name, 'Unknown User');
END$$

DELIMITER ;

-- ==============================================
-- INDEXES FOR PERFORMANCE
-- ==============================================

-- Additional composite indexes for common queries
CREATE INDEX idx_sheets_dept_subj ON sheets(department_id, subject_id);
CREATE INDEX idx_sheets_user_created ON sheets(user_id, created_at DESC);
CREATE INDEX idx_profiles_roles ON profiles(is_admin, is_ceo, is_sub_admin, is_staff);

-- ==============================================
-- GRANTS (Adjust based on your security needs)
-- ==============================================

-- Create application user
-- CREATE USER 'coe_app'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON coe_project.* TO 'coe_app'@'localhost';
-- FLUSH PRIVILEGES;

-- ==============================================
-- MIGRATION VERIFICATION QUERIES
-- ==============================================

-- These queries can help verify the migration
/*
-- Count records in each table
SELECT 'users' AS table_name, COUNT(*) AS count FROM users
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'departments', COUNT(*) FROM departments
UNION ALL
SELECT 'subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'sheets', COUNT(*) FROM sheets;

-- Verify foreign key relationships
SELECT 
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'coe_project'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Check indexes
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'coe_project'
GROUP BY TABLE_NAME, INDEX_NAME;
*/


-- ===============================================================================
-- FILE: migration/add_bundle_examiners_table.sql
-- Migration for bundle_examiners table
-- ===============================================================================

-- Migration: Add bundle_examiners table
-- Date: 2025-11-11
-- Purpose: Store examiner details for each bundle in a sheet

USE coe_project;

-- ==============================================
-- TABLE: bundle_examiners
-- Stores examiner information for sheet bundles
-- ==============================================

CREATE TABLE IF NOT EXISTS bundle_examiners (
  id CHAR(36) NOT NULL DEFAULT (UUID()),
  sheet_id CHAR(36) NOT NULL,
  bundle_number VARCHAR(50) NOT NULL,
  internal_examiner_name VARCHAR(255) NOT NULL,
  internal_examiner_designation VARCHAR(255) NOT NULL,
  internal_examiner_department VARCHAR(255) NOT NULL,
  internal_examiner_college VARCHAR(255) NOT NULL,
  chief_name VARCHAR(255) NULL,
  chief_designation VARCHAR(255) NULL,
  chief_department VARCHAR(255) NULL,
  chief_college VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sheet_bundle (sheet_id, bundle_number),
  CONSTRAINT fk_bundle_examiners_sheets 
    FOREIGN KEY (sheet_id) 
    REFERENCES sheets(id) 
    ON DELETE CASCADE,
  INDEX idx_sheet_id (sheet_id),
  INDEX idx_bundle_number (bundle_number),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ===============================================================================
-- FILE: migration/add_ip_whitelist_table.sql
-- IP whitelist table for access control
-- ===============================================================================

-- Add IP Whitelist Table
-- Run this with: mysql -u coe_app -p coe_project < add_ip_whitelist_table.sql

USE coe_project;

-- Create allowed_ips table
CREATE TABLE IF NOT EXISTS allowed_ips (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  created_by CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_address (ip_address),
  CONSTRAINT fk_allowed_ips_users 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default localhost entries (always allowed)
INSERT IGNORE INTO allowed_ips (ip_address, description) VALUES
('127.0.0.1', 'Localhost IPv4'),
('::1', 'Localhost IPv6'),
('::ffff:127.0.0.1', 'IPv4-mapped IPv6 localhost');

SELECT 'IP whitelist table created and localhost entries added' AS Status;


-- ===============================================================================
-- FILE: migration/backend/migrations/add_maximum_internal_mark.sql
-- Add maximum_internal_mark column to sheets table
-- ===============================================================================

-- Add maximum_internal_mark column to sheets table
ALTER TABLE sheets ADD COLUMN maximum_internal_mark INT DEFAULT 50;


-- ===============================================================================
-- FILE: migration/backend/migrations/add_staff_id_to_bundle_examiners.sql
-- Add staff_id to bundle_examiners table
-- ===============================================================================

-- Migration: Add staff_id to bundle_examiners
-- Date: 2025-11-12
-- Purpose: Track which staff member is assigned to each bundle

USE coe_project;

-- Add staff_id column to bundle_examiners table
ALTER TABLE bundle_examiners 
ADD COLUMN staff_id CHAR(36) NULL AFTER bundle_number;

-- Add foreign key constraint
ALTER TABLE bundle_examiners
ADD CONSTRAINT fk_bundle_examiners_staff
  FOREIGN KEY (staff_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Add index for staff_id lookups
ALTER TABLE bundle_examiners
ADD INDEX idx_staff_id (staff_id);

-- Add composite index for staff_id + bundle queries
ALTER TABLE bundle_examiners
ADD INDEX idx_staff_bundle (staff_id, bundle_number);


-- ===============================================================================
-- FILE: migration/seed_data.sql
-- Seed data with test users and sample records
-- ===============================================================================

-- Seed Data Script for COE Project
-- Creates 4 test users with different roles and sample data
-- Version: 1.0

USE coe_project;

-- Disable foreign key checks for clean insertion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (for testing)
TRUNCATE TABLE audit_logs;
TRUNCATE TABLE sheets;
TRUNCATE TABLE sessions;
TRUNCATE TABLE password_reset_tokens;
TRUNCATE TABLE subjects;
TRUNCATE TABLE departments;
TRUNCATE TABLE profiles;
TRUNCATE TABLE users;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================
-- INSERT TEST USERS
-- Password for all users: Test@123
-- Bcrypt hash: $2a$10$rG3YwLqB5v8k.Y5wZ5bQ6OqzVmZF5x8K9.0xJHxvVqXyL8Y5wZ5bQ
-- ==============================================

INSERT INTO users (id, email, password_hash, email_verified, raw_user_meta_data, created_at) VALUES
(UUID(), 'admin@coe.com', '$2b$10$LqslGu7xXcCd3K241Ifj0uXHS/rXAbDx9kFqKcEmhll32lffrMqo.', TRUE, JSON_OBJECT('full_name', 'Admin User'), NOW()),
(UUID(), 'ceo@coe.com', '$2b$10$LqslGu7xXcCd3K241Ifj0uXHS/rXAbDx9kFqKcEmhll32lffrMqo.', TRUE, JSON_OBJECT('full_name', 'CEO User'), NOW()),
(UUID(), 'subadmin@coe.com', '$2b$10$LqslGu7xXcCd3K241Ifj0uXHS/rXAbDx9kFqKcEmhll32lffrMqo.', TRUE, JSON_OBJECT('full_name', 'Sub Admin User'), NOW()),
(UUID(), 'staff@coe.com', '$2b$10$LqslGu7xXcCd3K241Ifj0uXHS/rXAbDx9kFqKcEmhll32lffrMqo.', TRUE, JSON_OBJECT('full_name', 'Staff User'), NOW());

-- Update profiles with roles (triggered automatically, but we'll update roles)
UPDATE profiles p
INNER JOIN users u ON p.id = u.id
SET 
    p.is_admin = TRUE,
    p.is_staff = FALSE
WHERE u.email = 'admin@coe.com';

UPDATE profiles p
INNER JOIN users u ON p.id = u.id
SET 
    p.is_ceo = TRUE,
    p.is_staff = FALSE
WHERE u.email = 'ceo@coe.com';

UPDATE profiles p
INNER JOIN users u ON p.id = u.id
SET 
    p.is_sub_admin = TRUE,
    p.is_staff = FALSE
WHERE u.email = 'subadmin@coe.com';

-- Staff user keeps default settings (is_staff = TRUE)

-- ==============================================
-- INSERT SAMPLE DEPARTMENTS
-- ==============================================

-- INSERT INTO departments (id, degree, department_code, department_name, created_at) VALUES
-- (UUID(), 'B.Tech', 'CSE', 'Computer Science and Engineering', NOW()),
-- (UUID(), 'B.Tech', 'ECE', 'Electronics and Communication Engineering', NOW()),
-- (UUID(), 'B.Tech', 'MECH', 'Mechanical Engineering', NOW()),
-- (UUID(), 'B.Tech', 'CIVIL', 'Civil Engineering', NOW()),
-- (UUID(), 'M.Tech', 'CSE-DS', 'Data Science', NOW());

-- ==============================================
-- INSERT SAMPLE SUBJECTS
-- ==============================================

-- Get department IDs for reference
-- SET @cse_id = (SELECT id FROM departments WHERE department_code = 'CSE' LIMIT 1);
-- SET @ece_id = (SELECT id FROM departments WHERE department_code = 'ECE' LIMIT 1);
-- SET @mech_id = (SELECT id FROM departments WHERE department_code = 'MECH' LIMIT 1);

-- Department-specific subjects
-- INSERT INTO subjects (id, subject_code, subject_name, department_id, created_at) VALUES
-- (UUID(), 'CS101', 'Data Structures and Algorithms', @cse_id, NOW()),
-- (UUID(), 'CS201', 'Database Management Systems', @cse_id, NOW()),
-- (UUID(), 'CS301', 'Machine Learning', @cse_id, NOW()),
-- (UUID(), 'EC101', 'Digital Electronics', @ece_id, NOW()),
-- (UUID(), 'EC201', 'Communication Systems', @ece_id, NOW()),
-- (UUID(), 'ME101', 'Engineering Mechanics', @mech_id, NOW()),
-- (UUID(), 'ME201', 'Thermodynamics', @mech_id, NOW());

-- Common subjects (no department_id)
-- INSERT INTO subjects (id, subject_code, subject_name, department_id, created_at) VALUES
-- (UUID(), 'MA101', 'Engineering Mathematics I', NULL, NOW()),
-- (UUID(), 'PH101', 'Engineering Physics', NULL, NOW()),
-- (UUID(), 'CH101', 'Engineering Chemistry', NULL, NOW()),
-- (UUID(), 'EN101', 'English Communication', NULL, NOW());

-- ==============================================
-- INSERT SAMPLE SHEETS
-- ==============================================

-- Get user ID for admin (sheet uploader)
-- SET @admin_id = (SELECT id FROM users WHERE email = 'admin@coe.com' LIMIT 1);
-- SET @staff_id = (SELECT id FROM users WHERE email = 'staff@coe.com' LIMIT 1);

-- Get subject IDs
-- SET @ds_algo_id = (SELECT id FROM subjects WHERE subject_code = 'CS101' LIMIT 1);
-- SET @dbms_id = (SELECT id FROM subjects WHERE subject_code = 'CS201' LIMIT 1);
-- SET @ml_id = (SELECT id FROM subjects WHERE subject_code = 'CS301' LIMIT 1);
-- SET @math_id = (SELECT id FROM subjects WHERE subject_code = 'MA101' LIMIT 1);

INSERT INTO sheets (
    id, sheet_name, file_path, subject_id, department_id, user_id,
    start_date, end_date, year, batch, 
    attendance_marked, duplicates_generated, external_marks_added,
    created_at
) VALUES
(
    UUID(), 
    'DSA Mid-Term Exam Results', 
    '/uploads/sheets/dsa_midterm_2024.xlsx',
    @ds_algo_id,
    @cse_id,
    @admin_id,
    '2024-01-15 09:00:00',
    '2024-01-15 12:00:00',
    '2024',
    'Batch 2022',
    TRUE,
    FALSE,
    TRUE,
    NOW()
),
(
    UUID(), 
    'DBMS Assignment Marks', 
    '/uploads/sheets/dbms_assignment_2024.xlsx',
    @dbms_id,
    @cse_id,
    @staff_id,
    '2024-02-01 00:00:00',
    '2024-02-28 23:59:59',
    '2024',
    'Batch 2021',
    FALSE,
    FALSE,
    FALSE,
    NOW()
),
(
    UUID(), 
    'Machine Learning Project Evaluation', 
    '/uploads/sheets/ml_project_2024.xlsx',
    @ml_id,
    @cse_id,
    @admin_id,
    '2024-03-10 00:00:00',
    '2024-03-20 23:59:59',
    '2024',
    'Batch 2020',
    TRUE,
    TRUE,
    TRUE,
    NOW()
),
(
    UUID(), 
    'Mathematics End-Sem Results', 
    '/uploads/sheets/math_endsem_2024.xlsx',
    @math_id,
    @cse_id,
    @staff_id,
    '2024-05-01 09:00:00',
    '2024-05-01 12:00:00',
    '2024',
    'Batch 2023',
    TRUE,
    FALSE,
    TRUE,
    NOW()
);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Display created users
SELECT 
    'USERS' AS section,
    u.email,
    p.full_name,
    CASE 
        WHEN p.is_admin THEN 'Admin'
        WHEN p.is_ceo THEN 'CEO'
        WHEN p.is_sub_admin THEN 'Sub-Admin'
        WHEN p.is_staff THEN 'Staff'
        ELSE 'No Role'
    END AS role
FROM users u
INNER JOIN profiles p ON u.id = p.id
ORDER BY u.email;

-- Display departments
SELECT 
    'DEPARTMENTS' AS section,
    department_code,
    department_name,
    degree
FROM departments
ORDER BY department_code;

-- Display subjects
SELECT 
    'SUBJECTS' AS section,
    s.subject_code,
    s.subject_name,
    COALESCE(d.department_code, 'COMMON') AS department
FROM subjects s
LEFT JOIN departments d ON s.department_id = d.id
ORDER BY s.subject_code;

-- Display sheets
SELECT 
    'SHEETS' AS section,
    sh.sheet_name,
    sub.subject_code,
    d.department_code,
    u.email AS uploaded_by,
    sh.year,
    sh.batch,
    sh.attendance_marked,
    sh.duplicates_generated,
    sh.external_marks_added
FROM sheets sh
INNER JOIN subjects sub ON sh.subject_id = sub.id
INNER JOIN departments d ON sh.department_id = d.id
INNER JOIN users u ON sh.user_id = u.id
ORDER BY sh.created_at DESC;

-- Summary counts
SELECT 
    'SUMMARY' AS section,
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM departments) AS total_departments,
    (SELECT COUNT(*) FROM subjects) AS total_subjects,
    (SELECT COUNT(*) FROM sheets) AS total_sheets;

-- ==============================================
-- TEST LOGIN CREDENTIALS
-- ==============================================

SELECT 
    '=== TEST USER CREDENTIALS ===' AS info,
    'All passwords: Test@123' AS password;

SELECT 
    'admin@coe.com' AS email,
    'Admin User' AS name,
    'Admin' AS role,
    'Test@123' AS password,
    'Full system access' AS permissions
UNION ALL
SELECT 
    'ceo@coe.com',
    'CEO User',
    'CEO',
    'Test@123',
    'CEO sheets access'
UNION ALL
SELECT 
    'subadmin@coe.com',
    'Sub Admin User',
    'Sub-Admin',
    'Test@123',
    'Sub-admin sheets access'
UNION ALL
SELECT 
    'staff@coe.com',
    'Staff User',
    'Staff',
    'Test@123',
    'Staff sheets access';


-- ===============================================================================
-- END OF MERGED SCHEMA FILE
-- ===============================================================================

