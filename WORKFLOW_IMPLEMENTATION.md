# COE Project - Complete Workflow Implementation

## Overview
This document describes the complete implementation of the multi-role workflow for sheet processing in the COE Management System.

## Workflow Stages

### 1. **Admin → Sub-Admin (Attendance Marking)**
- **When**: Admin uploads a new sheet
- **Who**: Sub-Admin users
- **What**: Mark attendance for students
- **Columns Visible**: Register Number, Attendance only
- **Restrictions**: 
  - Can only edit if `attendance_marked = false`
  - Once saved, attendance cannot be modified by Sub-Admin
  - Only Admin can modify attendance after marking

### 2. **Sub-Admin → CEO (Duplicate Number Generation)**
- **When**: Attendance is marked (`attendance_marked = true`)
- **Who**: CEO users
- **What**: Generate duplicate numbers and bundle assignments
- **Restrictions**:
  - Only sees sheets where `attendance_marked = true` AND `duplicates_generated = false`
  - Cannot regenerate duplicate numbers once generated (permanent)
  - Even Admin cannot regenerate duplicate numbers

### 3. **CEO → Staff (Internal Marks Entry)**
- **When**: Duplicate numbers are generated (`duplicates_generated = true`)
- **Who**: Staff users
- **What**: Enter internal marks (columns 1-15) for assigned bundles
- **Columns Visible**: Duplicate Number, Columns 1-15
- **Mark Validation**:
  - Columns 1-10: Range 0-2
  - Columns 11-15: Range 0-16
- **Bundle Assignment**:
  - Staff selects an available bundle
  - Once examiner details are submitted, bundle is locked to that staff member
  - Other staff members cannot see or select locked bundles
  - Staff can only see their own assigned bundles after submission

### 4. **Staff → Download PDF**
- **When**: Marks entered and examiner details provided
- **What**: Generate PDF report with all data
- **PDF Column Order**:
  1. Register Number
  2. Roll Number
  3. Subject Code
  4. Attendance
  5. Duplicate Number
  6. Columns 1-15 (Internal Marks)
  7. Total
  8. Result

---

## Database Changes

### New Migration: `add_staff_id_to_bundle_examiners.sql`
```sql
ALTER TABLE bundle_examiners 
ADD COLUMN staff_id CHAR(36) NULL AFTER bundle_number;

ALTER TABLE bundle_examiners
ADD CONSTRAINT fk_bundle_examiners_staff
  FOREIGN KEY (staff_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

ALTER TABLE bundle_examiners
ADD INDEX idx_staff_id (staff_id);

ALTER TABLE bundle_examiners
ADD INDEX idx_staff_bundle (staff_id, bundle_number);
```

---

## Code Changes Summary

### 1. **SubAdminSheets.tsx**
- **Filter**: Only show sheets where `attendance_marked = false`
- **Purpose**: Sub-admins only see sheets that need attendance marking
- **Change**: Added `.eq('attendance_marked', false)` to query

### 2. **CoeSheets.tsx**
- **Filter**: Only show sheets where `attendance_marked = true` AND `duplicates_generated = false`
- **Purpose**: CEOs only see sheets ready for duplicate number generation
- **Change**: Added `.eq('duplicates_generated', false)` to query

### 3. **SheetViewerDialog.tsx**
- **Restriction**: Cannot regenerate duplicate numbers once generated
- **Change**: Removed `forceGenerate` override - `canGenerate` is now always `false` after generation
- **Comment**: `// Cannot regenerate once generated`

### 4. **StaffSheetViewerDialog.tsx**
- **Major Changes**:
  1. Changed table to show all 15 internal mark columns (instead of just external mark)
  2. Added mark validation with different ranges:
     - Columns 1-10: 0-2
     - Columns 11-15: 0-16
  3. Updated `handleMarkChange` to accept column key, column index, and validate accordingly
  4. Updated `handleSaveChanges` to merge all edited columns (not just external mark)
  5. Added horizontal scroll with sticky first column for better UX
  6. Updated table headers to show column number and range: "1 (0-2)", "11 (0-16)", etc.

### 5. **PDF Download**
- **Column Order Enforced**: Register, Roll, Subject Code, Attendance, Duplicate, 1-15, Total, Result
- **Layout**: Landscape orientation for more columns
- **Styling**: Smaller font (8pt) and reduced padding for better fit

---

## Implementation Status

### ✅ Completed
1. Database migration for `staff_id` in `bundle_examiners`
2. SubAdminSheets filtering (attendance_marked = false)
3. CoeSheets filtering (attendance_marked = true, duplicates_generated = false)
4. SheetViewerDialog - prevent regeneration
5. StaffSheetViewerDialog - internal marks columns 1-15 with validation
6. PDF download with correct column order

### 🔄 Remaining (To be implemented)
1. Backend server.js - add staff_id support to bundle_examiners API
2. ExaminerDetailsDialog - save staff_id when submitting
3. StaffSheets page - filter bundles to show only available or user's own bundles
4. Bundle visibility logic - hide bundles assigned to other staff

---

## Testing Checklist

### Sub-Admin Flow
- [ ] Login as Sub-Admin
- [ ] Verify only sheets with `attendance_marked = false` are visible
- [ ] Mark attendance for a sheet
- [ ] Verify sheet disappears from list after saving
- [ ] Verify cannot re-edit attendance (button disabled)

### CEO Flow
- [ ] Login as CEO
- [ ] Verify only sheets with attendance marked but no duplicates are visible
- [ ] Generate duplicate numbers
- [ ] Verify cannot regenerate (button shows "Generated")
- [ ] Verify bundle numbers are assigned correctly (20 students per bundle)

### Staff Flow
- [ ] Login as Staff
- [ ] Select a sheet with duplicates generated
- [ ] Select an available bundle
- [ ] Enter marks for columns 1-15
  - [ ] Verify columns 1-10 reject values > 2
  - [ ] Verify columns 11-15 reject values > 16
- [ ] Save and provide examiner details
- [ ] Verify bundle is locked to this staff member
- [ ] Login as different staff member
- [ ] Verify locked bundle is not visible in dropdown
- [ ] Download PDF and verify column order

### Admin Override
- [ ] Login as Admin
- [ ] Verify can edit attendance after marking
- [ ] Verify CANNOT regenerate duplicate numbers (permanent)
- [ ] Verify can force-edit staff marks

---

## Database Schema Reference

### `sheets` table flags
```sql
attendance_marked BOOLEAN DEFAULT FALSE
duplicates_generated BOOLEAN DEFAULT FALSE
external_marks_added BOOLEAN DEFAULT FALSE
```

### `bundle_examiners` table
```sql
id CHAR(36) PRIMARY KEY
sheet_id CHAR(36) NOT NULL
bundle_number VARCHAR(50) NOT NULL
staff_id CHAR(36) NULL  -- NEW: tracks which staff owns this bundle
internal_examiner_name VARCHAR(255) NOT NULL
internal_examiner_designation VARCHAR(255) NOT NULL
internal_examiner_department VARCHAR(255) NOT NULL
internal_examiner_college VARCHAR(255) NOT NULL
chief_name VARCHAR(255) NULL
chief_designation VARCHAR(255) NULL
chief_department VARCHAR(255) NULL
chief_college VARCHAR(255) NULL
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

UNIQUE KEY uk_sheet_bundle (sheet_id, bundle_number)
FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE SET NULL
```

---

## API Endpoints (To Be Updated)

### `POST /api/bundle_examiners`
**New field**: `staff_id` (required)
**Validation**: Ensure bundle not already assigned to another staff member

### `GET /api/bundle_examiners`
**New filter**: `staff_id` query parameter
**Purpose**: Filter bundles by staff member

---

## Security & Validation Rules

1. **Attendance Marking**: Once `attendance_marked = true`, only Admin can modify
2. **Duplicate Numbers**: Once `duplicates_generated = true`, CANNOT be regenerated (even by Admin)
3. **Bundle Assignment**: Once `bundle_examiners` record exists, bundle is locked to that staff_id
4. **Mark Ranges**: 
   - Internal marks 1-10: Must be 0-2
   - Internal marks 11-15: Must be 0-16
5. **Bundle Visibility**: Staff can only see:
   - Unassigned bundles (no entry in bundle_examiners)
   - Bundles assigned to them (staff_id matches current user)

---

## Notes for Developers

1. Run migration script `add_staff_id_to_bundle_examiners.sql` on MySQL database before deploying
2. Update backend `server.js` to handle staff_id in bundle_examiners API
3. Update ExaminerDetailsDialog to get current user ID and pass as staff_id
4. Update StaffSheets page to filter bundles based on staff_id
5. Test all role transitions thoroughly before production deployment

---

**Last Updated**: 2025-11-12  
**Status**: Workflow implementation in progress (5/8 tasks complete)

