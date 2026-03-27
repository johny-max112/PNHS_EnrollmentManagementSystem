const { escapeHtml } = require('./securityUtils');

function htmlShell(title, body) {
  // Escape title to prevent HTML/JS injection
  const escapedTitle = escapeHtml(title);
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="ie=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapedTitle}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
    h1, h2, h3, p { margin: 0 0 8px; }
    .header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 16px; }
    .muted { color: #475569; font-size: 0.9rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #f1f5f9; }
    .signature { margin-top: 40px; display: flex; justify-content: space-between; }
    @media print { button { display: none; } body { margin: 10mm; } }
  </style>
</head>
<body>
  <button type="button" onclick="window.print()">Print</button>
  ${body}
</body>
</html>`;
}

function buildCoeTemplate(record) {
  // Escape all user-controlled data to prevent XSS
  const firstName = escapeHtml(record.first_name);
  const lastName = escapeHtml(record.last_name);
  const name = `${firstName} ${lastName}`;
  const lrn = escapeHtml(record.lrn);
  const gradeLevel = escapeHtml(record.grade_level);
  const sectionName = escapeHtml(record.section_name);
  const schoolYear = escapeHtml(record.school_year);
  const status = escapeHtml(record.status);

  const body = `
    <div class="header">
      <h1>Pateros National High School</h1>
      <p class="muted">Certificate of Enrollment (COE)</p>
    </div>
    <p>This certifies that <strong>${name}</strong> with LRN <strong>${lrn}</strong></p>
    <p>is officially enrolled in Grade <strong>${gradeLevel}</strong>, Section <strong>${sectionName}</strong></p>
    <p>for School Year <strong>${schoolYear}</strong>.</p>
    <p>Status: <strong>${status}</strong></p>
    <div class="signature">
      <div>
        <p>__________________________</p>
        <p class="muted">Registrar</p>
      </div>
      <div>
        <p>__________________________</p>
        <p class="muted">Principal</p>
      </div>
    </div>
  `;

  return htmlShell('COE', body);
}

function buildSf1Template(meta, rows) {
  // Escape all user-controlled data in table rows
  const tableRows = rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.lrn)}</td>
          <td>${escapeHtml(row.last_name)}, ${escapeHtml(row.first_name)}</td>
          <td>${escapeHtml(row.status)}</td>
          <td>${escapeHtml(row.grade_level)}</td>
        </tr>
      `
    )
    .join('');

  const sectionName = escapeHtml(meta.sectionName);
  const schoolYear = escapeHtml(meta.schoolYear);

  const body = `
    <div class="header">
      <h1>Pateros National High School</h1>
      <p class="muted">School Form 1 (Student Register)</p>
    </div>
    <h3>Section: ${sectionName}</h3>
    <p>School Year: ${schoolYear}</p>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>LRN</th>
          <th>Student Name</th>
          <th>Status</th>
          <th>Grade</th>
        </tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="signature">
      <div>
        <p>__________________________</p>
        <p class="muted">Adviser</p>
      </div>
      <div>
        <p>__________________________</p>
        <p class="muted">Registrar</p>
      </div>
    </div>
  `;

  return htmlShell('SF1', body);
}

module.exports = {
  buildCoeTemplate,
  buildSf1Template,
};
