-- Add maximum_internal_mark column to sheets table
ALTER TABLE sheets ADD COLUMN maximum_internal_mark INT DEFAULT 50;

