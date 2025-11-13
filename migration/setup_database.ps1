# Database Setup Script for COE Project Migration
# Runs the MySQL schema and seed data

Write-Host "=== COE Project Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Get MySQL root password
$rootPassword = Read-Host "Enter MySQL root password" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($rootPassword)
$rootPass = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Step 1: Creating database and user..." -ForegroundColor Yellow

# Create database and user
$createDB = @"
CREATE DATABASE IF NOT EXISTS coe_project CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'coe_app'@'localhost' IDENTIFIED BY 'CoeApp@2024';
GRANT SELECT, INSERT, UPDATE, DELETE ON coe_project.* TO 'coe_app'@'localhost';
FLUSH PRIVILEGES;
"@

$createDB | mysql -u root -p"$rootPass" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Database and user created successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to create database" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Running schema migration..." -ForegroundColor Yellow

# Run schema
mysql -u root -p"$rootPass" coe_project < "C:\Users\Public\coe_project\migration\mysql_schema.sql" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Schema migration completed" -ForegroundColor Green
} else {
    Write-Host "✗ Schema migration failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Seeding test data..." -ForegroundColor Yellow

# Run seed data
mysql -u coe_app -p"CoeApp@2024" coe_project < "C:\Users\Public\coe_project\migration\seed_data.sql" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Test data seeded successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Seeding failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Setup Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Test User Credentials:" -ForegroundColor Cyan
Write-Host "  admin@coe.com / Test@123 (Admin)"
Write-Host "  ceo@coe.com / Test@123 (CEO)"
Write-Host "  subadmin@coe.com / Test@123 (Sub-Admin)"
Write-Host "  staff@coe.com / Test@123 (Staff)"
Write-Host ""
Write-Host "Database: coe_project"
Write-Host "App User: coe_app / CoeApp@2024"
Write-Host ""

