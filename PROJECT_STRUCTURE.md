# Recommended Enrollment Management Structure

```text
enrollment/
  PROJECT_STRUCTURE.md
  backend/
    .env.example
    package.json
    package-lock.json
    README.md
    sql/
      schema.sql
    src/
      app.js
      server.js
      config/
        db.js
      controllers/
        enrollmentController.js
      routes/
        enrollmentRoutes.js
      utils/
        enrollmentRules.js
  frontend/
    .env.example
    package.json
    src/
      api/
        client.js
      components/
        EnrollmentForm.jsx
      pages/
        EnrollmentPage.jsx
      App.jsx
      App.css
      index.css
      main.jsx
```

## Notes

- `backend/sql/schema.sql` contains the base PNHS schema and seed data.
- `GET /api/enroll/meta` handles branching data load (JHS/SHS + strand + sections + subjects).
- `POST /api/enroll` creates an enrollment with section capacity control and subject assignment.
- Frontend route `/enroll` contains the initial enrollment transaction form.
