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

