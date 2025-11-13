# Sidebar Navigation - Role Comparison

## Visual Sidebar Layout for Each Role

### 👤 Admin User (`admin@coe.com`)
```
┌─────────────────────────────┐
│  👤 Admin User              │
│  admin@coe.com              │
│  [Sign Out]                 │
├─────────────────────────────┤
│                             │
│  📊 Dashboard               │  ← Active for all
│  📄 Manage Sheets           │  ← Admin only
│  📚 Manage Subjects         │  ← Admin only
│  🏢 Manage Departments      │  ← Admin only
│                             │
└─────────────────────────────┘
```
**Total Items:** 4 sections  
**Access Level:** Full System Access

---

### 👤 CEO User (`ceo@coe.com`)
```
┌─────────────────────────────┐
│  👤 CEO User                │
│  ceo@coe.com                │
│  [Sign Out]                 │
├─────────────────────────────┤
│                             │
│  📊 Dashboard               │  ← Active for all
│  📄 COE Sheets              │  ← CEO only
│                             │
│                             │
│                             │
└─────────────────────────────┘
```
**Total Items:** 2 sections  
**Access Level:** COE-Level Access (Attendance-marked sheets)

---

### 👤 Sub-Admin User (`subadmin@coe.com`)
```
┌─────────────────────────────┐
│  👤 Sub Admin User          │
│  subadmin@coe.com           │
│  [Sign Out]                 │
├─────────────────────────────┤
│                             │
│  📊 Dashboard               │  ← Active for all
│  📄 Sub-Admin Sheets        │  ← Sub-Admin only
│                             │
│                             │
│                             │
└─────────────────────────────┘
```
**Total Items:** 2 sections  
**Access Level:** Attendance Management

---

### 👤 Staff User (`staff@coe.com`)
```
┌─────────────────────────────┐
│  👤 Staff User              │
│  staff@coe.com              │
│  [Sign Out]                 │
├─────────────────────────────┤
│                             │
│  📊 Dashboard               │  ← Active for all
│  📄 Staff Sheets            │  ← Staff only
│                             │
│                             │
│                             │
└─────────────────────────────┘
```
**Total Items:** 2 sections  
**Access Level:** Marks Entry (Duplicate-generated sheets)

---

## Feature Comparison Matrix

| Feature | Admin | CEO | Sub-Admin | Staff |
|---------|-------|-----|-----------|-------|
| **Dashboard Access** | ✅ | ✅ | ✅ | ✅ |
| **View All Sheets** | ✅ | ❌ | ✅ | ❌ |
| **View Attendance-Marked** | ✅ | ✅ | ✅ | ❌ |
| **View Duplicate-Generated** | ✅ | ✅ | ✅ | ✅ |
| **Create Sheets** | ✅ | ❌ | ❌ | ❌ |
| **Edit Sheets** | ✅ | ❌ | ✅ | ✅ |
| **Delete Sheets** | ✅ | ❌ | ❌ | ❌ |
| **Mark Attendance** | ✅ | ❌ | ✅ | ❌ |
| **Generate Duplicates** | ✅ | ✅ | ❌ | ❌ |
| **Add External Marks** | ✅ | ❌ | ❌ | ✅ |
| **Manage Subjects** | ✅ | ❌ | ❌ | ❌ |
| **Manage Departments** | ✅ | ❌ | ❌ | ❌ |

---

## Navigation Routes

| User Role | Routes Available |
|-----------|------------------|
| **Admin** | `/dashboard`<br>`/sheets`<br>`/subjects`<br>`/departments` |
| **CEO** | `/dashboard`<br>`/coe-sheets` |
| **Sub-Admin** | `/dashboard`<br>`/subadmin-sheets` |
| **Staff** | `/dashboard`<br>`/staff-sheets` |

---

## Sheet Filtering Logic

### Dashboard View (All Users)
- **Admin:** Sees ALL sheets regardless of status
- **CEO:** Sees only sheets with `attendance_marked = true`
- **Sub-Admin:** Sees ALL sheets (to mark attendance)
- **Staff:** Sees only sheets with `duplicates_generated = true`

### Dedicated Sheet Pages
- **Admin (`/sheets`):** Full CRUD operations
- **CEO (`/coe-sheets`):** View + Generate Duplicates
- **Sub-Admin (`/subadmin-sheets`):** View + Mark Attendance
- **Staff (`/staff-sheets`):** View + Add External Marks

---

## Sidebar Visibility Rules (from `Sidebar.tsx`)

```typescript
// Dashboard - Always visible to all authenticated users
✅ All Roles

// Admin sections - Only visible to Admin role
✅ if (profile.is_admin)
  → Manage Sheets
  → Manage Subjects
  → Manage Departments

// CEO section - Only visible to CEO (not Admin)
✅ if (profile.is_ceo && !profile.is_admin)
  → COE Sheets

// Sub-Admin section - Only visible to Sub-Admin (not Admin/CEO)
✅ if (profile.is_sub_admin && !profile.is_admin && !profile.is_ceo)
  → Sub-Admin Sheets

// Staff section - Only visible to Staff (not Admin/CEO/Sub-Admin)
✅ if (profile.is_staff && !profile.is_admin && !profile.is_ceo && !profile.is_sub_admin)
  → Staff Sheets
```

---

## Testing Checklist

### ✅ Admin User Test
- [ ] Login with `admin@coe.com` / `Test@123`
- [ ] Verify 4 sidebar items appear (Dashboard, Manage Sheets, Manage Subjects, Manage Departments)
- [ ] Navigate to each page successfully
- [ ] Verify full CRUD operations work
- [ ] Sign out successfully

### ✅ CEO User Test
- [ ] Login with `ceo@coe.com` / `Test@123`
- [ ] Verify 2 sidebar items appear (Dashboard, COE Sheets)
- [ ] Confirm no Manage sections visible
- [ ] Verify only attendance-marked sheets appear
- [ ] Test duplicate generation
- [ ] Sign out successfully

### ✅ Sub-Admin User Test
- [ ] Login with `subadmin@coe.com` / `Test@123`
- [ ] Verify 2 sidebar items appear (Dashboard, Sub-Admin Sheets)
- [ ] Confirm no Manage sections visible
- [ ] Verify all sheets appear for attendance marking
- [ ] Test attendance marking feature
- [ ] Sign out successfully

### ✅ Staff User Test
- [ ] Login with `staff@coe.com` / `Test@123`
- [ ] Verify 2 sidebar items appear (Dashboard, Staff Sheets)
- [ ] Confirm no Manage sections visible
- [ ] Verify only duplicate-generated sheets appear
- [ ] Test external marks entry
- [ ] Sign out successfully

---

## Common Issues & Solutions

### Issue: Sidebar items not appearing
**Solution:** Check profile data is loaded correctly in DashboardLayout

### Issue: Wrong pages visible
**Solution:** Verify role flags in database profiles table

### Issue: Route protection not working
**Solution:** Check protected route components match user roles

### Issue: User can access unauthorized routes
**Solution:** Protected routes in App.tsx should wrap role-specific pages

---

**Last Updated:** January 2025  
**Sidebar Component:** `/src/components/Sidebar.tsx`  
**Layout Component:** `/src/components/DashboardLayout.tsx`

