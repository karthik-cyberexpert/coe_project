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

INSERT INTO departments (id, degree, department_code, department_name, created_at) VALUES
(UUID(), 'B.Tech', 'CSE', 'Computer Science and Engineering', NOW()),
(UUID(), 'B.Tech', 'ECE', 'Electronics and Communication Engineering', NOW()),
(UUID(), 'B.Tech', 'MECH', 'Mechanical Engineering', NOW()),
(UUID(), 'B.Tech', 'CIVIL', 'Civil Engineering', NOW()),
(UUID(), 'M.Tech', 'CSE-DS', 'Data Science', NOW());

-- ==============================================
-- INSERT SAMPLE SUBJECTS
-- ==============================================

-- Get department IDs for reference
SET @cse_id = (SELECT id FROM departments WHERE department_code = 'CSE' LIMIT 1);
SET @ece_id = (SELECT id FROM departments WHERE department_code = 'ECE' LIMIT 1);
SET @mech_id = (SELECT id FROM departments WHERE department_code = 'MECH' LIMIT 1);

-- Department-specific subjects
INSERT INTO subjects (id, subject_code, subject_name, department_id, created_at) VALUES
(UUID(), 'CS101', 'Data Structures and Algorithms', @cse_id, NOW()),
(UUID(), 'CS201', 'Database Management Systems', @cse_id, NOW()),
(UUID(), 'CS301', 'Machine Learning', @cse_id, NOW()),
(UUID(), 'EC101', 'Digital Electronics', @ece_id, NOW()),
(UUID(), 'EC201', 'Communication Systems', @ece_id, NOW()),
(UUID(), 'ME101', 'Engineering Mechanics', @mech_id, NOW()),
(UUID(), 'ME201', 'Thermodynamics', @mech_id, NOW());

-- Common subjects (no department_id)
INSERT INTO subjects (id, subject_code, subject_name, department_id, created_at) VALUES
(UUID(), 'MA101', 'Engineering Mathematics I', NULL, NOW()),
(UUID(), 'PH101', 'Engineering Physics', NULL, NOW()),
(UUID(), 'CH101', 'Engineering Chemistry', NULL, NOW()),
(UUID(), 'EN101', 'English Communication', NULL, NOW());

-- ==============================================
-- INSERT SAMPLE SHEETS
-- ==============================================

-- Get user ID for admin (sheet uploader)
SET @admin_id = (SELECT id FROM users WHERE email = 'admin@coe.com' LIMIT 1);
SET @staff_id = (SELECT id FROM users WHERE email = 'staff@coe.com' LIMIT 1);

-- Get subject IDs
SET @ds_algo_id = (SELECT id FROM subjects WHERE subject_code = 'CS101' LIMIT 1);
SET @dbms_id = (SELECT id FROM subjects WHERE subject_code = 'CS201' LIMIT 1);
SET @ml_id = (SELECT id FROM subjects WHERE subject_code = 'CS301' LIMIT 1);
SET @math_id = (SELECT id FROM subjects WHERE subject_code = 'MA101' LIMIT 1);

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

