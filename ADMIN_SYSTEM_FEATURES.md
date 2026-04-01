# PNHS Enrollment System - Admin/Registrar Features & Design

## 🏛️ System Overview

### What This System Does
This is a **document-driven enrollment management system** for PNHS where only authorized admin/registrar staff can manage student enrollments. Students **cannot** access or input data themselves.

### Key Principle
**Admin/Registrar controls everything** - all student data entry, document verification, and enrollment processing is done by staff only.

---

## 🎯 Core Features

### 1. **Authentication & Access Control**
- **Login**: Username + Password only (no student login)
- **Roles**: 
  - `admin` - Full system access, manage users
  - `registrar` - Enrollment & document verification
- **Activity Tracking**: Every admin/registrar action logged
- **Security**: Rate limiting, password hashing, JWT tokens

### 2. **Student Management** (Admin/Registrar)
- **Create Student Records**: Manually add student with:
  - LRN (Learner Reference Number) - unique
  - First, Middle, Last Name + Suffix
  - Date of Birth
  - Gender
  - Contact Number
  - Address
  - **Created by**: Logged who entered the record

- **Search/View Students**: Find by LRN or Name
- **Edit Student Info**: Update personal details
- **No Student Login**: Students cannot log in or access system

### 3. **Enrollment Management** (Core Feature)
Admin/Registrar creates enrollments with workflow:

#### Step 1: Create Enrollment
```
Select Student (by LRN or Name)
    ↓
Select Grade Level (7, 8, 9, 10, 11, 12)
    ↓
Auto-determine Track (JHS for 7-10, ACAD/TVL for 11-12)
    ↓
Select Strand (only for SHS: STEM, ABM, HUMSS, ICT)
    ↓
Select Section (auto-checks capacity)
    ↓
Enter School Year (e.g., 2025-2026)
    ↓
System auto-assigns subjects based on grade/strand
```

#### Step 2: Upload & Verify Documents
Required documents vary by grade level:

**For All Grades (7-12)**:
- Form 137-A (Permanent Record/Report Card)
- Certificate of Good Moral
- Medical Certificate
- Birth Certificate (NSO)

**For Grades 8-10** (if transferring):
- Transfer Certificate

**For Senior High (11-12)**:
- Form 138 (Certificate of Eligibility)
- PSA Credentials

Status Flow:
```
Document Upload (Status: "uploaded")
    ↓
Registrar Reviews (Status: "uploaded" or "rejected")
    ↓
If Approved (Status: "verified")
    ↓
If Rejected (Status: "rejected" + reason)
    ↓
Admin re-uploads corrected version
```

#### Step 3: Finalize Enrollment
Once all documents verified:
- Enrollment status → "enrolled"
- Subjects assigned
- Section capacity decremented
- Audit log recorded
- Can generate SF1 report

### 4. **Document Management**
- **Upload**: Attach PDFs, images for verification
- **Verification**: Registrar approves/rejects each doc
- **Audit Trail**: Record who verified, when, rejection reasons
- **Status Tracking**: View upload/verification timeline

### 5. **Automated Workflows**
- **Section Capacity Management**: Cannot exceed 45 students per section
- **Subject Assignment**: Automatic based on:
  - Junior High: Standard curriculum (7 subjects per grade)
  - Senior High: Strand-specific subjects
- **Status Transitions**: Automated tracking (pending → documents_pending → verified → enrolled)

### 6. **Reporting & Audit**
- **SF1 Generation**: Official enrollment form
- **Document Status Report**: Which students missing documents
- **Enrollment Summary**: By grade, section, strand
- **Audit Trail**: Track all enrollment changes with timestamps
- **Activity Log**: Who did what and when

### 7. **Admin Controls**
- **Manage Users**: Add/edit admin and registrar accounts
- **System Configuration**: 
  - Manage tracks, strands, sections
  - Configure required documents per grade
  - Set section capacity limits
- **View Logs**: User activity and enrollment changes

---

## 🏗️ System Architecture

### Database Structure
```
┌─────────────────────────────────────────┐
│           Core Tables                   │
├─────────────────────────────────────────┤
│ users (admin/registrar)                 │
│ students (created by admin staff)       │
│ tracks (JHS, ACAD, TVL)                 │
│ strands (STEM, ABM, HUMSS, ICT)         │
│ subjects (grade/strand specific)        │
│ sections (grade/strand sections)        │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│    Enrollment & Document Tables         │
├─────────────────────────────────────────┤
│ enrollments (student enrollment record) │
│ enrollment_subjects (assigned subjects) │
│ enrollment_documents (uploaded docs)    │
│ document_types (Form 137, 138, etc.)    │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│      Tracking & Audit Tables            │
├─────────────────────────────────────────┤
│ enrollment_audit_logs (changes)         │
│ user_activity_logs (who did what)       │
└─────────────────────────────────────────┘
```

### Status Values

**Enrollment Status** (status field):
| Status | Meaning | Next Step |
|--------|---------|-----------|
| `pending` | Just created | Upload documents |
| `documents_pending` | Some docs missing | Upload remaining |
| `verified` | All docs verified | Finalize enrollment |
| `enrolled` | Enrollment complete | Generate reports |
| `cancelled` | Cancelled | N/A |

**Document Status** (document status field):
| Status | Meaning |
|--------|---------|
| `uploaded` | Needs registrar review |
| `verified` | Approved by registrar |
| `rejected` | Rejected (needs reupload) |

---

## 📱 Frontend Pages for Admin/Registrar

### 1. **Login Page** 
```
┌─────────────────────────────────┐
│   PNHS Enrollment System         │
│                                  │
│   Username: [_______________]    │
│   Password: [_______________]    │
│                                  │
│   [         LOGIN        ]       │
│                                  │
│   Note: Admin/Registrar Only     │
└─────────────────────────────────┘
```
- Single login form (no student option)
- Shows role after successful login: "Admin" or "Registrar"

---

### 2. **Dashboard / Enrollment Page** (Main Interface)
```
┌──────────────────────────────────────────────────────────┐
│  PNHS Enrollment Management System                    [👤] │
├──────────────────────────────────────────────────────────┤
│ [Dashboard] [Enrollments] [Documents] [Reports] [Users]   │
├──────────────────────────────────────────────────────────┤
│                                                            │
│  📊 QUICK STATS                                           │
│  ├─ Total Enrollments: 245                               │
│  ├─ Pending Documents: 12                                │
│  ├─ Verified Enrollments: 233                            │
│  └─ Grade 7-10 Enrollments: 120 | Grade 11-12: 125     │
│                                                            │
│  [+ Create New Enrollment]                               │
│                                                            │
│  🔍 SEARCH ENROLLMENTS                                    │
│  Search by: [LRN/Name________] [Grade: 7▼] [Status: All▼]│
│  [Search]                                                 │
│                                                            │
│  📋 RECENT ENROLLMENTS                                    │
│  ┌──────┬──────────┬──────────┬────────┬──────────────┐  │
│  │ LRN  │ Student  │ Grade    │ Status │ Documents    │  │
│  ├──────┼──────────┼──────────┼────────┼──────────────┤  │
│  │12345 │Juan Dela │7 (Rizal)│ 3/4✓  │ 1 Rejected   │  │
│  │      │ Cruz     │         │pending │              │  │
│  ├──────┼──────────┼──────────┼────────┼──────────────┤  │
│  │54321 │Maria     │11 (STEM)│ 4/4✓  │ Ready for    │  │
│  │      │Santos    │         │verified│ Finalization │  │
│  └──────┴──────────┴──────────┴────────┴──────────────┘  │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

**Features**:
- Quick stats dashboard
- Search by LRN, name, grade, status
- View recent enrollments
- Click to view details or edit

---

### 3. **Create/Edit Enrollment Modal**
```
┌─────────────────────────────────────────┐
│  ➕ NEW ENROLLMENT                    [✕] │
├─────────────────────────────────────────┤
│                                          │
│ STEP 1: SELECT STUDENT                  │
│ 📌 Search Student:                       │
│    [  Type LRN or Name... ]              │
│    Results:                              │
│    ○ 123456789012 - Juan Dela Cruz      │
│    ○ 234567890123 - Maria Santos        │
│    [Or CREATE NEW STUDENT ➕]            │
│                                          │
│ STEP 2: ENROLLMENT DETAILS               │
│ Grade Level: [7▼]                       │
│ Track: [Junior High School (auto)]      │
│ Strand: [N/A]                           │
│ Section: [Rizal (45 capacity) ▼]        │
│ School Year: [2025-2026]                │
│                                          │
│ Notes: [_____________________]          │
│                                          │
│       [Cancel]  [Create Enrollment]     │
└─────────────────────────────────────────┘
```

**Features**:
- Step-by-step form
- Auto-determines track based on grade
- Shows section availability
- Creates enrollment record with "pending" status

---

### 4. **Document Upload & Verification Page**
```
┌────────────────────────────────────────────────┐
│  📄 DOCUMENT MANAGEMENT                     [👤]│
├────────────────────────────────────────────────┤
│ [Dashboard] [Enrollments] [Documents] ...      │
├────────────────────────────────────────────────┤
│                                                 │
│ Student: Juan Dela Cruz (LRN: 123456789012)    │
│ Grade: 7 | Section: Rizal | Enrollment ID: 42 │
│ Status: documents_pending (3/4 uploaded)       │
│                                                 │
│ REQUIRED DOCUMENTS FOR GRADE 7:                │
│ ┌────────────────────────────────────────────┐ │
│ │ ✅ Form 137-A (Report Card)               │ │
│ │    Status: VERIFIED by Registrar          │ │
│ │    Uploaded: 2025-03-20 | Verified: 03-21│ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ [📥 Download] [🗑️ Delete]           │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                           │ │
│ │ ⏳ Certificate of Good Moral             │ │
│ │    Status: UPLOADED (pending review)      │ │
│ │    Uploaded: 2025-03-21                   │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ [👁️ Review] [✅ Approve] [❌ Reject]│ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                           │ │
│ │ ❌ Medical Certificate                    │ │
│ │    Status: MISSING                        │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ [📤 Upload Document]                 │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ │                                           │ │
│ │ ❌ Birth Certificate (NSO)                │ │
│ │    Status: MISSING                        │ │
│ │ ┌──────────────────────────────────────┐ │ │
│ │ │ [📤 Upload Document]                 │ │ │
│ │ └──────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────┘ │
│                                                 │
│ [Reject Document]  [Finalize Enrollment] ✅   │
│                                                 │
└────────────────────────────────────────────────┘
```

**Features**:
- View all required docs for grade level
- Upload missing documents
- Registrar approval/rejection workflow
- Rejection reasons tracking
- Document download
- Finalize when all verified

---

### 5. **Enrollment Details/View Page**
```
┌────────────────────────────────────────────────────┐
│  📋 ENROLLMENT DETAILS                          [👤]│
├────────────────────────────────────────────────────┤
│ [Dashboard] [Enrollments] [Documents] ...          │
├────────────────────────────────────────────────────┤
│                                                     │
│ 🎓 STUDENT INFORMATION                             │
│ ├─ LRN: 123456789012                              │
│ ├─ Name: Juan Dela Cruz (Suffix: Jr.)             │
│ ├─ Date of Birth: 2011-05-15                      │
│ ├─ Gender: Male                                    │
│ ├─ Contact: 09123456789                           │
│ └─ Address: Sitio Maganda, Pateros, Metro Manila  │
│                                                     │
│ 📚 ENROLLMENT INFORMATION                          │
│ ├─ Enrollment ID: 42                              │
│ ├─ Grade Level: 7                                 │
│ ├─ Track: Junior High School                      │
│ ├─ Strand: N/A                                    │
│ ├─ Section: Rizal (Section A-1)                   │
│ ├─ School Year: 2025-2026                         │
│ ├─ Status: ENROLLED ✅                            │
│ ├─ Enrolled By: registrar admin (2025-03-21)      │
│ ├─ Verified By: registrar admin (2025-03-21)      │
│ └─ Notes: Grade 7 transfer from...(truncated)    │
│                                                     │
│ 📖 ASSIGNED SUBJECTS (7 subjects)                  │
│ ┌─────────┬──────────────────────────┬───────┐    │
│ │ Code    │ Subject Name             │ Units │    │
│ ├─────────┼──────────────────────────┼───────┤    │
│ │ ENG7    │ English 7                │ 3     │    │
│ │ MATH7   │ Mathematics 7            │ 3     │    │
│ │ SCI7    │ Science 7                │ 3     │    │
│ │ AP7     │ Araling Panlipunan 7     │ 3     │    │
│ │ MAPEH7  │ MAPEH 7                  │ 2     │    │
│ │ TLE7    │ TLE 7                    │ 3     │    │
│ │ TECH7   │ Teknolohiya 7            │ 3     │    │
│ └─────────┴──────────────────────────┴───────┘    │
│                                                     │
│ 📄 DOCUMENT STATUS (4/4 Verified ✅)              │
│ ├─ Form 137-A: ✅ Verified (03-21)                │
│ ├─ Certificate of Good Moral: ✅ Verified (03-21) │
│ ├─ Medical Certificate: ✅ Verified (03-20)       │
│ └─ Birth Certificate: ✅ Verified (03-20)         │
│                                                     │
│ 📝 AUDIT HISTORY                                   │
│ ├─ 03-21 15:45 - Enrollment Finalized by Admin    │
│ ├─ 03-21 15:30 - All Documents Verified           │
│ ├─ 03-21 14:00 - Enrollment Created by Admin      │
│ └─ 03-20 10:30 - Documents Uploaded               │
│                                                     │
│  [Edit] [Cancel Enrollment] [Generate SF1] [Back] │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

### 6. **Reports Page**
```
┌────────────────────────────────────────────────────┐
│  📊 REPORTS                                     [👤]│
├────────────────────────────────────────────────────┤
│ [Dashboard] [Enrollments] [Documents] [Reports]    │
├────────────────────────────────────────────────────┤
│                                                     │
│ 🎯 REPORT TYPES                                    │
│                                                     │
│ ┌──────────────────────────────────────────────┐  │
│ │ 📄 GENERATE SF1 (Official Enrollment Form)  │  │
│ ├──────────────────────────────────────────────┤  │
│ │ Filter By:                                   │  │
│ │ Grade Level: [7▼]                           │  │
│ │ Section: [All▼]                             │  │
│ │ School Year: [2025-2026▼]                   │  │
│ │ Status: [Enrolled▼]                         │  │
│ │                                              │  │
│ │ [Download PDF] [Print] [Email]              │  │
│ └──────────────────────────────────────────────┘  │
│                                                     │
│ ┌──────────────────────────────────────────────┐  │
│ │ 📋 DOCUMENT STATUS REPORT                    │  │
│ ├──────────────────────────────────────────────┤  │
│ │ ┌────┬──────────┬──────────────────────────┐ │  │
│ │ │LRN │ Student  │ Status Summary           │ │  │
│ │ ├────┼──────────┼──────────────────────────┤ │  │
│ │ │111 │Juan Cruz │ ✅ 4/4 All Verified      │ │  │
│ │ ├────┼──────────┼──────────────────────────┤ │  │
│ │ │222 │Maria     │ ⏳ 3/4 Pending: Form 138 │ │  │
│ │ │    │Santos    │                          │ │  │
│ │ └────┴──────────┴──────────────────────────┘ │  │
│ │ [Export to Excel] [Print]                    │  │
│ └──────────────────────────────────────────────┘  │
│                                                     │
│ ┌──────────────────────────────────────────────┐  │
│ │ 📈 ENROLLMENT SUMMARY BY GRADE               │  │
│ ├──────────────────────────────────────────────┤  │
│ │ Grade 7: 45 (Rizal) + 42 (Others) = 87      │  │
│ │ Grade 8: 38 (Bonifacio) + 40 = 78           │  │
│ │ Grade 9: 43 (Mabini) + 41 = 84              │  │
│ │ Grade 10: 40 (Del Pilar) + 39 = 79          │  │
│ │ ─────────────────────────────────────────    │  │
│ │ JHS Total: 328                               │  │
│ │                                              │  │
│ │ Grade 11: 89 (SHS Track A) = 89              │  │
│ │ Grade 12: 85 (SHS Track B) = 85              │  │
│ │ ─────────────────────────────────────────    │  │
│ │ SHS Total: 174                               │  │
│ └──────────────────────────────────────────────┘  │
│                                                     │
└────────────────────────────────────────────────────┘
```

---

### 7. **Admin Users Management Page**
```
┌────────────────────────────────────────────────┐
│  👥 MANAGE USERS                            [👤]│
├────────────────────────────────────────────────┤
│ [Dashboard] [Enrollments] [Documents] [Users]   │
├────────────────────────────────────────────────┤
│                                                 │
│ [+ ADD NEW USER]                               │
│                                                 │
│ 🔍 SEARCH: [Username/Name__________] [Search] │
│                                                 │
│ ┌──────────┬──────────┬────────┬─────────────┐ │
│ │ Username │ Full Name│ Role   │ Status      │ │
│ ├──────────┼──────────┼────────┼─────────────┤ │
│ │ admin    │ Adm Admin│ Admin  │ Active ✅   │ │
│ │ edit ✎   │ registrar│ Edit   │ Delete ✕   │ │
│ ├──────────┼──────────┼────────┼─────────────┤ │
│ │ registrar│ Reg User │Registr │ Active ✅   │ │
│ │ edit ✎   │          │ ar     │ Delete ✕   │ │
│ ├──────────┼──────────┼────────┼─────────────┤ │
│ │ reg_user │ Mary Jane│Registr │ Inactive ❌ │ │
│ │ edit ✎   │          │ ar     │ Delete ✕   │ │
│ └──────────┴──────────┴────────┴─────────────┘ │
│                                                 │
└────────────────────────────────────────────────┘
```

**Admin Only Features**:
- Add new admin or registrar accounts
- Edit user details
- Deactivate/reactivate users
- Delete users
- View activity logs

---

### 8. **Workflow/Processing Page** (Optional)
Shows real-time enrollment processing status.

---

## 🔄 Typical Admin Workflows

### Workflow 1: New Student Enrollment (Fresh Intake)
```
1. Admin clicks [+ Create New Enrollment]
2. Creates new student record:
   - Enter LRN
   - Enter name details
   - Enter contact info
   - Enter address
3. Creates enrollment:
   - Selects grade 7
   - Auto-selects Junior High School track
   - Selects Rizal section
   - Enters SY 2025-2026
4. System auto-assigns 7 subjects
5. Enrollment created with "pending" status
6. Admin uploads 4 required documents
7. Registrar reviews and verifies docs
8. Registrar clicks [Finalize Enrollment]
9. Status → "enrolled" ✅
10. System generates SF1 report
11. Ready for academic year
```

### Workflow 2: Senior High School Enrollment (SHS)
```
1. Admin selects existing student (transferring from JHS)
2. Creates new enrollment:
   - Selects grade 11
   - Auto-selects "ACAD" or "TVL" track
   - Selects strand (STEM, ABM, HUMSS, ICT)
   - System shows strand-specific subjects
   - Selects appropriate section
3. Uploads 5 documents (Form 138, PSA, etc.)
4. Registrar verifies
5. Finalized
```

### Workflow 3: Rejected Document Fix
```
1. Registrar sees uploaded document is invalid
2. Clicks [Reject] and adds reason: "Document too blurry"
3. Admin sees document status: "rejected"
4. Admin uploads corrected document
5. Registrar re-reviews and approves
6. Document status → "verified"
```

---

## 🛡️ Security & Tracking

### What Gets Logged
- **Who** created/verified enrollment
- **When** each action occurred
- **What** changed (old value → new value)
- **IP address** of admin/registrar
- **Document verification** decisions and reasons

### Audit Trail Example
```
Enrollment #42 (Juan Dela Cruz):
- 2025-03-20 10:30 - Created by: Admin User
- 2025-03-20 14:00 - Documents Uploaded by: Admin User
- 2025-03-21 15:00 - Form 137 Verified by: Registrar User
- 2025-03-21 15:15 - Medical Cert Rejected by: Registrar User
                      Reason: "Expired medical exams"
- 2025-03-21 15:30 - Medical Cert Re-verified by: Registrar User
- 2025-03-21 15:45 - Enrollment Finalized by: Admin User
```

---

## 📊 Key Differences from Student System

| Feature | Old (Student Online) | New (Admin/Registrar) |
|---------|----------------------|----------------------|
| Login | Student LRN + Password | Admin/Registrar Username + Password |
| Student Data Entry | Student enters their own | Admin/Registrar enters manually |
| Document Upload | Student uploads | Admin/Registrar uploads |
| Verification | Registrar reviews | Registrar reviews |
| Enrollment | Student requests | Admin/Registrar creates |
| Access Control | Student can only see own data | Admin/Registrar see all data |
| Portal | Student dashboard | Admin dashboard only |
| Scope | Online enrollment | Document management system |

---

## ✅ Summary

### What Admins Can Do:
1. ✅ Create/edit student records
2. ✅ Create enrollments
3. ✅ Upload documents
4. ✅ (Optional: Admin only) Verify documents
5. ✅ View all enrollments
6. ✅ Generate reports (SF1, summaries)
7. ✅ Manage other admin/registrar accounts (Admin only)
8. ✅ View audit trails

### What Registrars Can Do:
1. ✅ Create/edit student records (with admin approval ideally)
2. ✅ Create enrollments
3. ✅ Upload documents
4. ✅ **Verify/reject documents**
5. ✅ Finalize enrollments
6. ✅ View all enrollments
7. ✅ Generate reports
8. ❌ Cannot manage user accounts

### What NO ONE Can Do:
1. ❌ Student cannot login
2. ❌ Student cannot access portal
3. ❌ Student cannot self-enroll
4. ❌ Student cannot upload documents
5. ❌ Public cannot access any part

This is a **completely internal admin/registrar system** - 100% staff-controlled.
