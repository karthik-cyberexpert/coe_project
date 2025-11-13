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

