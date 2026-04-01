# PNHS Enrollment System - Refactored Scope & Implementation Guide

## 🎯 New System Scope

### System Purpose
Admin/Registrar-only **document management and enrollment system** for PNHS. NO student online access.

### Key Features
1. ✅ Admin/Registrar login (username/password only)
2. ✅ Create/manage student enrollment manually
3. ✅ Document upload & verification tracking
4. ✅ Automatic subject assignment by grade level/strand
5. ✅ Section capacity management
6. ✅ Generate enrollment reports (SF1)
7. ✅ Enrollment audit trail
8. ❌ NO student login
9. ❌ NO online enrollment form
10. ❌ NO student portal

---

## 📊 Schema Changes Summary

### NEW Tables
- `document_types` - Define required documents by grade level
- `enrollment_documents` - Track uploaded documents & verification status
- `enrollment_audit_logs` - Track all enrollment changes
- `user_activity_logs` - Security/audit trail

### MODIFIED Tables
- `students` - Added `created_by` (which admin/registrar created record), `date_of_birth`, `gender`, `contact_number`, `address`
- `enrollments` - New status values, track `enrolled_by` & `verified_by` users
- `users` - Added `email` and `last_login_at` for tracking

### DROPPED Tables
- ❌ `student_accounts` - NO student login needed

---

## 🗑️ Files to DELETE

### Backend
```
backend/src/controllers/studentAuthController.js
backend/src/controllers/studentPortalController.js
backend/src/routes/studentAuthRoutes.js
backend/src/routes/studentRoutes.js (or heavily modify)
```

### Frontend
```
frontend/src/pages/StudentLoginPage.jsx
frontend/src/pages/StudentDashboardPage.jsx
frontend/src/pages/StudentEnrollmentPage.jsx
frontend/src/components/StudentEnrollmentForm.jsx
frontend/src/styles/StudentLoginPage.css
frontend/src/styles/StudentDashboardPage.css
frontend/src/styles/StudentEnrollmentPage.css
frontend/src/components/ProtectedRoute.jsx (simplify)
```

---

## 🔧 Files to MODIFY

### Backend - app.js
Remove:
- `const studentAuthRoutes = require('./routes/studentAuthRoutes');`
- `const studentRoutes = require('./routes/studentRoutes');`
- `app.use('/api/student-auth', loginLimiter, studentAuthRoutes);`
- `app.use('/api/student', studentRoutes);`

### Backend - enrollmentController.js
New endpoints needed:
```javascript
POST /api/enroll/students                    // Create new student record
POST /api/enroll/:enrollmentId/documents     // Upload document
GET  /api/enroll/:enrollmentId/documents     // View enrollment documents
PATCH /api/enroll/:enrollmentId/verify       // Verify enrollment (registrar)
GET  /api/enroll/reports/document-status     // Document verification report
```

### Backend - New: documentController.js
```javascript
// Handle document uploads and verification
GET    /api/documents/:id                    // Get document
POST   /api/documents/:docId/verify          // Verify document
PATCH  /api/documents/:docId/reject          // Reject document
DELETE /api/documents/:docId                 // Delete document
```

### Backend - authMiddleware.js
Check that:
- Only 'admin' and 'registrar' roles are allowed
- No 'student' role allowed anymore

### Frontend - App.jsx
Simplify to only routes:
- `/` → LoginPage (for admin/registrar)
- `/dashboard` → EnrollmentPage (admin/registrar)
- `/reports` → ReportsPage
- `/admin` → AdminUsersPage (only admin)
- `/workflow` → WorkflowPage

### Frontend - LoginPage.jsx
Change from:
```
- Option 1: Student Login (LRN + Password)
- Option 2: Staff Login (Username + Password)
```

To:
```
- Staff Login (Username + Password only)
- Role shown after login: Admin or Registrar
```

### Frontend - EnrollmentPage.jsx
Add new interface:
- **Search Student** by LRN or Name
- **Create New Student** button
- **Add Enrollment** form
- **Upload Documents** section
- **View Enrollments** table with filters

---

## 📋 New Database Status Values

### enrollment.status
```
'pending'                 → Just created, waiting for documents
'documents_pending'       → Some documents missing
'verified'                → All documents verified, ready to enroll
'enrolled'                → Officially enrolled
'cancelled'               → Enrollment cancelled
```

### enrollment_documents.status
```
'uploaded'                → Doc uploaded, pending verification
'verified'                → Doc verified by registrar
'rejected'                → Doc rejected (needs reupload)
```

---

## 🔄 New Enrollment Workflow

### Step 1: Create Student Record
Admin/Registrar creates student manually:
- LRN
- Name (First, Middle, Last, Suffix)
- Date of Birth
- Gender
- Contact Number
- Address

### Step 2: Create Enrollment
Admin/Registrar creates enrollment:
- Select student
- Select grade level (7-12)
- Select track (if SHS)
- Select strand (if SHS)
- Select section (auto-checks capacity)
- Enter school year

### Step 3: Upload Documents
Admin/Registrar uploads required documents:
- Form 137-A (Report Card)
- Form 138 (Certificate of Eligibility)
- Certificate of Good Moral
- Medical Certificate
- Birth Certificate
- Transfer Certificate (if applicable)
- PSA Credentials (for SHS)

### Step 4: Verify Documents
Registrar verifies each document:
- ✅ Approve (mark as 'verified')
- ❌ Reject with reason (mark as 'rejected')

### Step 5: Finalize Enrollment
Once all documents verified:
- Registrar clicks "Finalize Enrollment"
- System updates status to 'enrolled'
- Subjects auto-assigned
- Section capacity decremented
- Audit log recorded

### Step 6: Generate Report
Admin/Registrar generates:
- SF1 form for all enrollments
- Document status report
- Enrollment summary by grade/section
- Audit trail

---

## 💾 Migration Steps

### 1. Backup current database
```sql
mysqldump -u root -p pnhs_enrollment > backup_before_refactor.sql
```

### 2. Apply new schema
```sql
SOURCE backend/sql/schema_refactored.sql;
```

### 3. Migrate existing student data (if any)
```sql
-- Only if you have existing data to preserve
INSERT INTO students (lrn, first_name, last_name, created_by)
SELECT lrn, first_name, last_name, 1 FROM old_students_table;
```

### 4. Remove student_accounts table
```sql
DROP TABLE IF EXISTS student_accounts CASCADE;
```

---

## 🚀 Implementation Checklist

- [ ] Apply new schema to database
- [ ] Delete student-facing backend files
- [ ] Delete student-facing frontend files
- [ ] Update app.js (remove student routes)
- [ ] Create documentController.js
- [ ] Update enrollmentController.js
- [ ] Modify authMiddleware.js
- [ ] Update LoginPage.jsx for admin/registrar only
- [ ] Simplify EnrollmentPage.jsx
- [ ] Update App.jsx routing
- [ ] Test admin login
- [ ] Test enrollment creation
- [ ] Test document upload
- [ ] Test document verification
- [ ] Test report generation
- [ ] Update PROJECT_STRUCTURE.md documentation

---

## 📁 New Project Structure

```
enrollment/
├── backend/
│   ├── sql/
│   │   ├── schema_refactored.sql (NEW)
│   │   └── schema.sql (DEPRECATED - use refactored)
│   └── src/
│       ├── controllers/
│       │   ├── authController.js ✅
│       │   ├── enrollmentController.js ✅ (MODIFIED)
│       │   ├── documentController.js ✨ NEW
│       │   ├── reportController.js ✅
│       │   ├── adminController.js ✅
│       │   ├── workflowController.js ✅
│       │   ├── studentAuthController.js ❌ DELETE
│       │   └── studentPortalController.js ❌ DELETE
│       └── routes/
│           ├── documentRoutes.js ✨ NEW
│           ├── authRoutes.js ✅
│           ├── enrollmentRoutes.js ✅ (MODIFIED)
│           ├── studentAuthRoutes.js ❌ DELETE
│           └── studentRoutes.js ❌ DELETE
└── frontend/
    └── src/
        ├── pages/
        │   ├── LoginPage.jsx ✅ (MODIFIED)
        │   ├── EnrollmentPage.jsx ✅ (MODIFIED)
        │   ├── AdminUsersPage.jsx ✅
        │   ├── ReportsPage.jsx ✅
        │   ├── StudentLoginPage.jsx ❌ DELETE
        │   ├── StudentDashboardPage.jsx ❌ DELETE
        │   └── StudentEnrollmentPage.jsx ❌ DELETE
        └── components/
            ├── StudentEnrollmentForm.jsx ❌ DELETE
            └── ProtectedRoute.jsx ✅ (SIMPLIFY)
```

---

## 🔐 Security Notes

1. **Authentication**: Only admin/registrar can login (whitelist roles)
2. **Activity Logging**: All admin/registrar actions logged in `user_activity_logs`
3. **Audit Trail**: All enrollment changes tracked in `enrollment_audit_logs`
4. **Document Verification**: Requires 'registrar' or 'admin' role
5. **No Public API**: No public endpoints for student data
6. **Rate Limiting**: Keep rate limits on `/api/auth` endpoint

---

## 📞 Support

For questions, refer to:
- Database: [backend/sql/schema_refactored.sql](../sql/schema_refactored.sql)
- Backend: [backend/src/controllers/](../src/controllers/)
- Frontend: [frontend/src/pages/](../../frontend/src/pages/)
