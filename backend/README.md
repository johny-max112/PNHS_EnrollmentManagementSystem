# PNHS Enrollment Backend

## Recommended backend structure

```text
backend/
  .env.example
  package.json
  sql/
    schema.sql
    sample_students.sql
    student_portal_schema.sql
  src/
    app.js
    server.js
    config/
      db.js
    controllers/
      authController.js
      enrollmentController.js
      workflowController.js
      reportController.js
    middleware/
      authMiddleware.js
    routes/
      authRoutes.js
      enrollmentRoutes.js
      workflowRoutes.js
      reportRoutes.js
    utils/
      enrollmentRules.js
      reportTemplates.js
```

## Setup

1. Copy `.env.example` to `.env` and update values.
2. Run the SQL script in `sql/schema.sql`.
3. If your database already exists, run `sql/student_portal_schema.sql` to add student login support.
4. Optional: run `sql/sample_students.sql` if you need additional sample enrollment records.
5. Install dependencies: `npm install`.
6. Start API in dev mode: `npm run dev`.

## Default seeded users

- admin / Admin123!
- registrar / Registrar123!
- student sample accounts / Student123!
  Use any seeded student LRN from `students` as the login ID.

## API Endpoints

- `GET /health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/student-auth/login`
- `GET /api/student-auth/me`
- `GET /api/student/enrollment/meta?gradeLevel=11&trackId=1&strandId=1`
- `POST /api/student/enrollment`
- `GET /api/student/enrollment/current`
- `GET /api/student/reports/coe`
- `GET /api/student/reports/coe/pdf`
- `GET /api/enroll/meta?gradeLevel=11&trackId=1&strandId=1`
- `POST /api/enroll`
- `GET /api/workflow`
- `GET /api/workflow/sections`
- `PATCH /api/workflow/:id/status`
- `GET /api/reports/coe/:enrollmentId`
- `GET /api/reports/coe/:enrollmentId/pdf`
- `GET /api/reports/sf1?sectionId=1&schoolYear=2026-2027`
- `GET /api/reports/sf1/pdf?sectionId=1&schoolYear=2026-2027`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`

## Access rules

- Student: own enrollment submission, own status, own subjects, own section, own COE
- Registrar: enrollment, workflow, reports
- Admin: enrollment, workflow, reports, user management

### Example enrollment payload

```json
{
  "lrn": "123456789012",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "gradeLevel": 11,
  "trackId": 1,
  "strandId": 1,
  "sectionId": 5,
  "schoolYear": "2026-2027"
}
```
