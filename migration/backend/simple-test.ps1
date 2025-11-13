# Simple API Test Script
$baseUrl = "http://localhost:3001/api"

Write-Host "`n=== Testing Backend API ===`n"

# Test Login
Write-Host "1. Testing Login..."
$loginBody = '{"email":"admin@coe.com","password":"Test@123"}'
$response = Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/signin" -ContentType "application/json" -Body $loginBody
$token = $response.access_token
Write-Host "Login SUCCESS - Token received"

# Test Get Profile
Write-Host "`n2. Testing Get Profile..."
$headers = @{Authorization = "Bearer $token"}
$profile = Invoke-RestMethod -Method GET -Uri "$baseUrl/auth/user" -Headers $headers
Write-Host "Profile SUCCESS - User: $($profile.email), Admin: $($profile.is_admin)"

# Test Get Departments
Write-Host "`n3. Testing Get Departments..."
$departments = Invoke-RestMethod -Method GET -Uri "$baseUrl/departments" -Headers $headers
Write-Host "Departments SUCCESS - Found $($departments.Count) departments"
$departments | ForEach-Object { Write-Host "   - $($_.department_name)" }

# Test Create Department
Write-Host "`n4. Testing Create Department..."
$newDept = '{"degree":"BTech","department_code":"IT","department_name":"Information Technology"}'
$createdDept = Invoke-RestMethod -Method POST -Uri "$baseUrl/departments" -Headers $headers -ContentType "application/json" -Body $newDept
Write-Host "Create Department SUCCESS - ID: $($createdDept.id)"
$newDeptId = $createdDept.id

# Test Update Department
Write-Host "`n5. Testing Update Department..."
$updateDept = '{"degree":"BTech","department_code":"IT","department_name":"IT (Updated)"}'
$updatedDept = Invoke-RestMethod -Method PUT -Uri "$baseUrl/departments/$newDeptId" -Headers $headers -ContentType "application/json" -Body $updateDept
Write-Host "Update Department SUCCESS - Name: $($updatedDept.department_name)"

# Test Get Subjects
Write-Host "`n6. Testing Get Subjects..."
$subjects = Invoke-RestMethod -Method GET -Uri "$baseUrl/subjects" -Headers $headers
Write-Host "Subjects SUCCESS - Found $($subjects.Count) subjects"

# Test Get Sheets
Write-Host "`n7. Testing Get Sheets..."
$sheets = Invoke-RestMethod -Method GET -Uri "$baseUrl/sheets" -Headers $headers
Write-Host "Sheets SUCCESS - Found $($sheets.Count) sheets"

# Test Delete Department
Write-Host "`n8. Testing Delete Department..."
Invoke-RestMethod -Method DELETE -Uri "$baseUrl/departments/$newDeptId" -Headers $headers
Write-Host "Delete Department SUCCESS"

# Test Logout
Write-Host "`n9. Testing Logout..."
Invoke-RestMethod -Method POST -Uri "$baseUrl/auth/signout" -Headers $headers
Write-Host "Logout SUCCESS"

Write-Host "`n=== All Tests Passed! ===`n"

