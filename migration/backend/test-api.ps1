# API Testing Script for COE Backend
# Tests authentication and all CRUD operations

$baseUrl = "http://localhost:3001/api"
$testResults = @()

Write-Host "`n=== COE Backend API Tests ===`n" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "Test 1: Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method GET
    Write-Host "✓ Health check passed: $($health.status)" -ForegroundColor Green
    $testResults += "Health Check: PASSED"
} catch {
    Write-Host "✗ Health check failed: $_" -ForegroundColor Red
    $testResults += "Health Check: FAILED"
}

# Test 2: Sign In with Admin
Write-Host "`nTest 2: Admin Login..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@coe.com"
        password = "Test@123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/signin" -ContentType "application/json" -Body $loginBody
    $token = $loginResponse.access_token
    Write-Host "✓ Admin login successful" -ForegroundColor Green
    Write-Host "  Token: $($token.Substring(0, 50))..." -ForegroundColor Gray
    $testResults += "Admin Login: PASSED"
} catch {
    Write-Host "✗ Admin login failed: $_" -ForegroundColor Red
    $testResults += "Admin Login: FAILED"
    exit 1
}

# Headers for authenticated requests
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test 3: Get User Profile
Write-Host "`nTest 3: Get User Profile..." -ForegroundColor Yellow
try {
    $profile = Invoke-RestMethod -Method GET -Uri "$baseUrl/auth/user" -Headers $headers
    Write-Host "✓ Profile retrieved: $($profile.email)" -ForegroundColor Green
    Write-Host "  Admin: $($profile.is_admin), CEO: $($profile.is_ceo)" -ForegroundColor Gray
    $testResults += "Get Profile: PASSED"
} catch {
    Write-Host "✗ Get profile failed: $_" -ForegroundColor Red
    $testResults += "Get Profile: FAILED"
}

# Test 4: Get Departments
Write-Host "`nTest 4: Get Departments..." -ForegroundColor Yellow
try {
    $departments = Invoke-RestMethod -Method GET -Uri "$baseUrl/departments" -Headers $headers
    Write-Host "✓ Retrieved $($departments.Count) departments" -ForegroundColor Green
    $departments | ForEach-Object { 
        Write-Host "  - $($_.department_name) ($($_.department_code))" -ForegroundColor Gray 
    }
    $testResults += "Get Departments: PASSED"
    $testDeptId = $departments[0].id
} catch {
    Write-Host "✗ Get departments failed: $_" -ForegroundColor Red
    $testResults += "Get Departments: FAILED"
}

# Test 5: Create Department
Write-Host "`nTest 5: Create Department..." -ForegroundColor Yellow
try {
    $newDept = @{
        degree = "BTech"
        department_code = "IT"
        department_name = "Information Technology"
    } | ConvertTo-Json

    $createdDept = Invoke-RestMethod -Method POST -Uri "$baseUrl/departments" -Headers $headers -Body $newDept
    Write-Host "✓ Department created: $($createdDept.department_name)" -ForegroundColor Green
    $testResults += "Create Department: PASSED"
    $newDeptId = $createdDept.id
} catch {
    Write-Host "✗ Create department failed: $_" -ForegroundColor Red
    $testResults += "Create Department: FAILED"
}

# Test 6: Update Department
Write-Host "`nTest 6: Update Department..." -ForegroundColor Yellow
try {
    $updateDept = @{
        degree = "BTech"
        department_code = "IT"
        department_name = "Information Technology (Updated)"
    } | ConvertTo-Json

    $updatedDept = Invoke-RestMethod -Method PUT -Uri "$baseUrl/departments/$newDeptId" -Headers $headers -Body $updateDept
    Write-Host "✓ Department updated: $($updatedDept.department_name)" -ForegroundColor Green
    $testResults += "Update Department: PASSED"
} catch {
    Write-Host "✗ Update department failed: $_" -ForegroundColor Red
    $testResults += "Update Department: FAILED"
}

# Test 7: Get Subjects
Write-Host "`nTest 7: Get Subjects..." -ForegroundColor Yellow
try {
    $subjects = Invoke-RestMethod -Method GET -Uri "$baseUrl/subjects" -Headers $headers
    Write-Host "✓ Retrieved $($subjects.Count) subjects" -ForegroundColor Green
    $subjects | Select-Object -First 5 | ForEach-Object { 
        Write-Host "  - $($_.subject_name) ($($_.subject_code))" -ForegroundColor Gray 
    }
    $testResults += "Get Subjects: PASSED"
} catch {
    Write-Host "✗ Get subjects failed: $_" -ForegroundColor Red
    $testResults += "Get Subjects: FAILED"
}

# Test 8: Create Subject
Write-Host "`nTest 8: Create Subject..." -ForegroundColor Yellow
try {
    $newSubject = @{
        subject_code = "IT101"
        subject_name = "Introduction to IT"
        department_id = $testDeptId
    } | ConvertTo-Json

    $createdSubject = Invoke-RestMethod -Method POST -Uri "$baseUrl/subjects" -Headers $headers -Body $newSubject
    Write-Host "✓ Subject created: $($createdSubject.subject_name)" -ForegroundColor Green
    $testResults += "Create Subject: PASSED"
    $newSubjectId = $createdSubject.id
} catch {
    Write-Host "✗ Create subject failed: $_" -ForegroundColor Red
    $testResults += "Create Subject: FAILED"
}

# Test 9: Get Sheets
Write-Host "`nTest 9: Get Sheets..." -ForegroundColor Yellow
try {
    $sheets = Invoke-RestMethod -Method GET -Uri "$baseUrl/sheets" -Headers $headers
    Write-Host "✓ Retrieved $($sheets.Count) sheets" -ForegroundColor Green
    $sheets | ForEach-Object { 
        Write-Host "  - $($_.sheet_name)" -ForegroundColor Gray 
    }
    $testResults += "Get Sheets: PASSED"
} catch {
    Write-Host "✗ Get sheets failed: $_" -ForegroundColor Red
    $testResults += "Get Sheets: FAILED"
}

# Test 10: Delete Subject
Write-Host "`nTest 10: Delete Subject..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method DELETE -Uri "$baseUrl/subjects/$newSubjectId" -Headers $headers
    Write-Host "✓ Subject deleted successfully" -ForegroundColor Green
    $testResults += "Delete Subject: PASSED"
} catch {
    Write-Host "✗ Delete subject failed: $_" -ForegroundColor Red
    $testResults += "Delete Subject: FAILED"
}

# Test 11: Delete Department
Write-Host "`nTest 11: Delete Department..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method DELETE -Uri "$baseUrl/departments/$newDeptId" -Headers $headers
    Write-Host "✓ Department deleted successfully" -ForegroundColor Green
    $testResults += "Delete Department: PASSED"
} catch {
    Write-Host "✗ Delete department failed: $_" -ForegroundColor Red
    $testResults += "Delete Department: FAILED"
}

# Test 12: Logout
Write-Host "`nTest 12: Logout..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/signout" -Headers $headers
    Write-Host "✓ Logout successful" -ForegroundColor Green
    $testResults += "Logout: PASSED"
} catch {
    Write-Host "✗ Logout failed: $_" -ForegroundColor Red
    $testResults += "Logout: FAILED"
}

# Summary
Write-Host "`n`n=== Test Summary ===" -ForegroundColor Cyan
$passed = ($testResults | Where-Object { $_ -match "PASSED" }).Count
$failed = ($testResults | Where-Object { $_ -match "FAILED" }).Count
$total = $testResults.Count

Write-Host "`nTotal Tests: $total" -ForegroundColor White
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

Write-Host "`nDetailed Results:" -ForegroundColor Yellow
$testResults | ForEach-Object {
    $color = if ($_ -match "PASSED") { "Green" } else { "Red" }
    Write-Host "  $_" -ForegroundColor $color
}

if ($failed -eq 0) {
    Write-Host "`n" -NoNewline
    Write-Host "All tests passed! Backend is fully functional." -ForegroundColor Green
} else {
    Write-Host "`n" -NoNewline
    Write-Host "Some tests failed. Please check the errors above." -ForegroundColor Red
}

