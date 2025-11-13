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

