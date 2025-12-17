-- Migration: Add is_downloaded column to sheets table
-- Run this on the server to update the database schema

USE coe_db;

SET @dbname = DATABASE();
SET @tablename = "sheets";
SET @columnname = "is_downloaded";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE sheets ADD COLUMN is_downloaded BOOLEAN DEFAULT FALSE;"
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Simple verify
SELECT id, sheet_name, is_downloaded FROM sheets LIMIT 5;
