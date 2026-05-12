# PNHS Enrollment Backend

Backend for the internal PNHS enrollment system where only staff users can operate the platform.

## Scope

- Admin and registrar users only
- No student login and no public self-enrollment
- Document-driven enrollment lifecycle with audit trails

## Setup

1. Copy `.env.example` to `.env` and configure DB credentials.
2. Fresh install: run `sql/schema.sql`.
3. Existing install from legacy schema: run `sql/migrate_admin_registrar.sql`.
4. Optional sample records: run `sql/sample_students.sql`.
5. Install dependencies: `npm install`.
6. Start in dev mode: `npm run dev`.

## Default seeded users

- admin / Admin123!
- registrar / Registrar123!

## API Endpoints

- `GET /health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/documents/enrollment/:enrollmentId`
- `GET /api/documents/check/:enrollmentId`
- `POST /api/documents/enrollment/:enrollmentId/upload`
- `PATCH /api/documents/:documentId/verify`
- `DELETE /api/documents/:documentId`
- `GET /api/workflow`
- `GET /api/workflow/sections`
- `GET /api/workflow/:id/application`
- `PATCH /api/workflow/:id/status`
- `GET /api/reports/coe/:enrollmentId`
- `GET /api/reports/coe/:enrollmentId/pdf`
- `GET /api/reports/sf1?sectionId=1&schoolYear=2026-2027`
- `GET /api/reports/sf1/pdf?sectionId=1&schoolYear=2026-2027`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`

## Access Rules

- Registrar: enrollments, documents, workflow, reports
- Admin: registrar access plus user management

## Example Enrollment Payload

```json
{
  "lrn": "123456789012",
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "gradeLevel": 11,
  "trackId": 2,
  "strandId": 1,
  "sectionId": 5,
  "schoolYear": "2026-2027",
  "notes": "Transferee with complete requirements"
}
```
