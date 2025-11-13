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

