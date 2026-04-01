# PNHS Enrollment System - Architecture & Tech Stack

## 🏗️ System Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  LOGIN PAGE              ADMIN DASHBOARD                      │
│  └─ Username/Pass   ──→  ├─ Enrollments                       │
│                          ├─ Documents                         │
│                          ├─ Reports                           │
│                          ├─ Users (Admin)                     │
│                          └─ Workflow                          │
│                                                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    JWT Token + Request
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                   BACKEND (Node.js + Express)                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  API Routes                    Middleware                      │
│  ├─ /api/auth                 ├─ Authentication              │
│  ├─ /api/enrollments          ├─ Authorization               │
│  ├─ /api/documents            ├─ Rate Limiting                │
│  ├─ /api/reports              ├─ Security Headers             │
│  ├─ /api/admin                ├─ Audit Logging                │
│  └─ /api/workflow             └─ Error Handling               │
│                                                                │
│  Controllers                   Utilities                       │
│  ├─ authController            ├─ enrollmentRules              │
│  ├─ enrollmentController       ├─ pdfReports (SF1)            │
│  ├─ documentController ✨NEW   ├─ securityUtils               │
│  ├─ reportController           └─ Validation                  │
│  └─ adminController                                           │
│                                                                │
└────────────────────────────┬─────────────────────────────────┘
                             │
                    SQL Queries + Transactions
                             │
┌────────────────────────────▼─────────────────────────────────┐
│              DATABASE (MySQL/MariaDB)                         │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  Users & Auth               Enrollment Core                    │
│  ├─ users                   ├─ students                       │
│  ├─ user_activity_logs      ├─ enrollments                    │
│  │                          ├─ enrollment_subjects            │
│  Document Management        ├─ tracks                         │
│  ├─ document_types          ├─ strands                        │
│  ├─ enrollment_documents    ├─ sections                       │
│  │                          └─ subjects                       │
│  Audit & Reports                                              │
│  ├─ enrollment_audit_logs   Views                             │
│  ├─ v_enrollment_with_details                                │
│  └─ v_document_status                                         │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagram

### Enrollment Creation Flow
```
┌─────────────────┐
│  Admin/Registrar│
│   Starts  Flow  │
└────────┬────────┘
         │
         ▼
    ┌─────────────────────┐
    │ 1. CREATE STUDENT   │
    │ (if new)            │
    │ LRN, Name, DOB, etc │
    └─────────┬───────────┘
              │
              ▼
    ┌─────────────────────┐
    │ 2. CREATE ENROLLMENT│
    │ Grade, Track,       │
    │ Strand, Section     │
    └─────────┬───────────┘
              │
    ┌─────────▼──────────────┐
    │ System Auto-Assigns    │
    │ Subjects based on      │
    │ Grade & Strand         │
    └─────────┬──────────────┘
              │
              ▼
    ┌─────────────────────┐
    │ 3. UPLOAD DOCUMENTS │
    │ Form 137, Cert of   │
    │ Good Moral, Medical,│
    │ Birth Cert, etc     │
    └─────────┬───────────┘
              │
              ▼
    ┌─────────────────────┐
    │ 4. REGISTRAR VERIFIES│
    │ Each Document       │
    │ ✅ APPROVE or       │
    │ ❌ REJECT          │
    └─────────┬───────────┘
              │
        ┌─────┴─────┐
        │           │
        ▼           ▼
    All Verified? REJECTED
    │             │
    ▼             ▼
  YES       ADMIN RE-UPLOAD
    │             │
    ▼             └──→ (Back to Verify)
    ┌──────────────────────┐
    │ 5. FINALIZE ENROLLMENT
    │ Status → "enrolled" ✅
    │ Decrement section cap │
    │ Log audit trail      │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ 6. GENERATE REPORTS  │
    │ SF1, Document Status │
    │ Ready for Academic Yr│
    └──────────────────────┘
```

---

## 📱 Frontend Component Structure

```
App.jsx
├─ ProtectedRoute (Authenticated users)
│  ├─ LoginPage
│  │  └─ Staff login (Admin/Registrar)
│  │
│  ├─ Dashboard
│  │  ├─ EnrollmentPage (Main)
│  │  │  ├─ EnrollmentSearch
│  │  │  ├─ EnrollmentForm (Create/Edit)
│  │  │  ├─ EnrollmentList
│  │  │  └─ EnrollmentDetails
│  │  │
│  │  ├─ DocumentPage (NEW)
│  │  │  ├─ DocumentUpload
│  │  │  ├─ DocumentList
│  │  │  └─ DocumentVerification
│  │  │
│  │  ├─ ReportsPage
│  │  │  ├─ SF1 Generator
│  │  │  ├─ Document Status Report
│  │  │  └─ Enrollment Summary
│  │  │
│  │  ├─ AdminUsersPage
│  │  │  ├─ UserList
│  │  │  ├─ UserForm (Add/Edit)
│  │  │  └─ ActivityLogs
│  │  │
│  │  └─ WorkflowPage
│  │     └─ Real-time processing status
│  │
│  └─ /api/client.js (API communication)
│     ├─ Authentication endpoints
│     ├─ Enrollment endpoints
│     ├─ Document endpoints
│     └─ Report endpoints
│
└─ Styles (CSS)
   ├─ base.css (Global)
   ├─ LoginPage.css
   ├─ EnrollmentPage.css
   ├─ DocumentPage.css (NEW)
   ├─ ReportsPage.css
   └─ AdminUsersPage.css
```

---

## 🔌 Backend API Endpoints

### Authentication
```javascript
POST   /api/auth/login          // Admin/Registrar login
POST   /api/auth/logout         // Logout
GET    /api/auth/me             // Get current user
POST   /api/auth/refresh        // Refresh JWT token
```

### Students
```javascript
POST   /api/enrollments/students         // Create new student
GET    /api/enrollments/students         // List students (search)
GET    /api/enrollments/students/:id     // Get student details
PUT    /api/enrollments/students/:id     // Update student
DELETE /api/enrollments/students/:id     // Delete student
```

### Enrollments
```javascript
POST   /api/enrollments                  // Create enrollment
GET    /api/enrollments                  // List enrollments (with filters)
GET    /api/enrollments/:id              // Get enrollment details
PUT    /api/enrollments/:id              // Update enrollment
PATCH  /api/enrollments/:id/finalize     // Finalize enrollment
DELETE /api/enrollments/:id              // Cancel enrollment
GET    /api/enrollments/:id/subjects     // Get assigned subjects
```

### Documents
```javascript
POST   /api/documents                    // Upload document
GET    /api/documents                    // List documents
GET    /api/documents/:id                // Download document
PATCH  /api/documents/:id/verify         // Verify document (Registrar)
PATCH  /api/documents/:id/reject         // Reject document (Registrar)
DELETE /api/documents/:id                // Delete document
GET    /api/documents/enrollment/:enrollmentId  // Get enrollment docs
```

### Reports
```javascript
GET    /api/reports/sf1                  // Generate SF1 form
GET    /api/reports/sf1/pdf              // SF1 as PDF download
GET    /api/reports/document-status      // Document verification status
GET    /api/reports/enrollment-summary   // Enrollment by grade/section
GET    /api/reports/audit-trail          // Enrollment audit log
GET    /api/reports/activity-log         // User activity log
```

### Admin (Admin role only)
```javascript
POST   /api/admin/users                  // Create user account
GET    /api/admin/users                  // List users
GET    /api/admin/users/:id              // Get user details
PUT    /api/admin/users/:id              // Update user
DELETE /api/admin/users/:id              // Delete user
PATCH  /api/admin/users/:id/status       // Activate/Deactivate
GET    /api/admin/audit-logs             // View all audit logs
GET    /api/admin/activity-logs          // View user activity logs
```

### Configuration (Admin only)
```javascript
GET    /api/admin/config/tracks          // Get available tracks
GET    /api/admin/config/strands         // Get strands by track
GET    /api/admin/config/sections        // Get sections with capacity
GET    /api/admin/config/subjects        // Get subjects by grade/strand
GET    /api/admin/config/document-types  // Get required document types
```

---

## 💾 Database Tables & Relationships

### Core Tables
```
users (Admin/Registrar accounts)
├─ id (PK)
├─ username
├─ password_hash
├─ full_name
├─ role (admin|registrar)
├─ email
├─ is_active
└─ last_login_at

students (Student master data)
├─ id (PK)
├─ lrn (UNIQUE)
├─ first_name
├─ last_name
├─ middle_name
├─ suffix
├─ date_of_birth
├─ gender
├─ contact_number
├─ address
├─ created_by (FK → users.id)
└─ timestamps

tracks (JHS, ACAD, TVL)
├─ id (PK)
├─ track_code
├─ track_name
└─ is_active

strands (STEM, ABM, HUMSS, ICT)
├─ id (PK)
├─ track_id (FK)
├─ strand_code
├─ strand_name
└─ is_active

sections (Classroom sections)
├─ id (PK)
├─ section_name
├─ grade_level
├─ strand_id (FK, nullable)
├─ capacity
├─ current_enrolled
└─ is_active

subjects (Course subjects)
├─ id (PK)
├─ subject_code
├─ subject_name
├─ grade_level
├─ strand_id (FK, nullable)
├─ units
└─ is_active
```

### Enrollment Tables
```
enrollments (Main enrollment record)
├─ id (PK)
├─ student_id (FK)
├─ grade_level
├─ track_id (FK)
├─ strand_id (FK)
├─ section_id (FK)
├─ school_year
├─ status (pending|documents_pending|verified|enrolled|cancelled)
├─ enrolled_by (FK → users.id)
├─ verified_by (FK → users.id)
├─ notes
└─ timestamps

enrollment_subjects (Many-to-many)
├─ enrollment_id (FK, PK)
├─ subject_id (FK, PK)

document_types (Form 137, 138, etc.)
├─ id (PK)
├─ code
├─ name
├─ description
├─ required_for_grades
└─ is_active

enrollment_documents (Uploaded documents)
├─ id (PK)
├─ enrollment_id (FK)
├─ document_type_id (FK)
├─ file_name
├─ file_path
├─ file_size
├─ mime_type
├─ status (uploaded|verified|rejected)
├─ rejection_reason
├─ uploaded_by (FK → users.id)
├─ verified_by (FK → users.id)
├─ verified_at
└─ uploaded_at
```

### Audit Tables
```
enrollment_audit_logs
├─ id (PK)
├─ enrollment_id (FK)
├─ action
├─ old_value
├─ new_value
├─ changed_by (FK → users.id)
├─ notes
└─ changed_at

user_activity_logs
├─ id (PK)
├─ user_id (FK)
├─ action
├─ resource_type
├─ resource_id
├─ ip_address
└─ logged_at
```

---

## 🔐 Security Features

### Authentication & Authorization
- ✅ JWT token-based authentication
- ✅ Role-based access control (admin/registrar)
- ✅ Password hashing with bcryptjs
- ✅ Token expiration (8 hours)
- ✅ Rate limiting on login endpoint

### Data Protection
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (sanitized inputs)
- ✅ CORS restriction (localhost:5173 only)
- ✅ Helmet security headers
- ✅ HTTPS recommended (in production)

### Audit & Compliance
- ✅ Complete audit trail (who→what→when)
- ✅ User activity logging
- ✅ Enrollment change tracking
- ✅ Document verification history
- ✅ IP address logging

---

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL 8.0
- **Authentication**: JWT + bcryptjs
- **Security**: Helmet, CORS, express-rate-limit
- **PDF Generation**: PDFKit
- **Input Validation**: Custom middleware
- **Logging**: Console + Database

### Frontend
- **Framework**: React 18+
- **Build Tool**: Vite
- **HTTP Client**: Axios
- **Styling**: CSS3
- **State Management**: React Hooks
- **Routing**: React Router

### Development
- **Node Version Manager**: nvm (recommended)
- **Package Manager**: npm
- **Dev Tools**: Nodemon, eslint

---

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Production Environment           │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐  │
│  │     Nginx / Apache Reverse Proxy │  │
│  │     (SSL/TLS Termination)        │  │
│  └──────────────┬───────────────────┘  │
│                 │                       │
│    ┌────────────┴──────────┐           │
│    │                       │            │
│    ▼                       ▼            │
│ ┌─────────────┐      ┌──────────────┐ │
│ │ Frontend    │      │   Backend    │ │
│ │ (React App) │      │  (Node.js)   │ │
│ │ Static Files│      │   API Server │ │
│ │ CDN Ready   │      │   Port 3000  │ │
│ └─────────────┘      └──────┬───────┘ │
│                              │         │
│                              ▼         │
│                     ┌─────────────────┐│
│                     │  MySQL Database ││
│                     │  Persistent Vol ││
│                     │  Backups Daily  ││
│                     └─────────────────┘│
│                                        │
└────────────────────────────────────────┘
```

---

## 📋 Environment Configuration

### Backend .env
```
# Database
DB_HOST=localhost
DB_USER=pnhs_user
DB_PASSWORD=secure_password
DB_NAME=pnhs_enrollment
DB_PORT=3306

# Server
PORT=3000
NODE_ENV=production

# JWT
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=8h

# Frontend
FRONTEND_URL=https://enrollment.pnhs.edu.ph

# File Upload
UPLOAD_DIR=/var/uploads/documents
MAX_FILE_SIZE=5242880  # 5MB

# Email (Optional)
SMTP_HOST=mail.pnhs.edu.ph
SMTP_PORT=587
SMTP_USER=noreply@pnhs.edu.ph
SMTP_PASS=email_password
```

### Frontend .env
```
VITE_API_URL=https://api.enrollment.pnhs.edu.ph
VITE_APP_NAME=PNHS Enrollment System
```

---

## 📊 System Characteristics

| Aspect | Specification |
|--------|--------------|
| **Users** | Admin + Registrar staff only |
| **Databases** | 1 (MySQL/MariaDB) |
| **Tables** | 15+ (core + audit) |
| **Views** | 2 (enrollment details, document status) |
| **API Endpoints** | 40+ |
| **Frontend Pages** | 6-8 |
| **Concurrent Users** | 50-100 (typical school) |
| **Data Retention** | Indefinite (official records) |
| **Backup Strategy** | Daily incremental, weekly full |
| **Disaster Recovery** | Via backups + master-slave replication |

---

## ✅ Key Improvements Over Student System

| Feature | Before | After |
|---------|--------|-------|
| **Student Login** | ✅ Enabled | ✅ Disabled |
| **Data Entry** | Student self-service | Admin/Registrar managed |
| **Security** | Public API endpoints | Internal staff only |
| **Audit** | Basic logging | Complete audit trail |
| **Document Mgmt** | Email attachments | Organized database |
| **Verification** | Manual review | Formal workflow |
| **Scope** | Online enrollment | Document management |
| **Complexity** | High | Lower (staff-only) |
| **Compliance** | Basic | Enhanced (audit logs) |

---

## 🎯 Next Implementation Steps

With this architecture in place:

1. ✅ Apply schema_refactored.sql to database
2. ✅ Delete student-facing files (backend + frontend)
3. ✅ Create documentController.js
4. ✅ Update enrollmentController.js
5. ✅ Modify app.js (remove student routes)
6. ✅ Update LoginPage.jsx
7. ✅ Update EnrollmentPage.jsx
8. ✅ Create DocumentPage.jsx
9. ✅ Test all workflows
10. ✅ Deploy to production

Would you like me to start implementing these changes?
