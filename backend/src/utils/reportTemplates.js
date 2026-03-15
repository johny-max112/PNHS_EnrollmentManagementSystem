function htmlShell(title, body) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
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
  <button onclick="window.print()">Print</button>
  ${body}
</body>
</html>`;
}

function buildCoeTemplate(record) {
  const name = `${record.first_name} ${record.last_name}`;
  const body = `
    <div class="header">
      <h1>Pateros National High School</h1>
      <p class="muted">Certificate of Enrollment (COE)</p>
    </div>
    <p>This certifies that <strong>${name}</strong> with LRN <strong>${record.lrn}</strong></p>
    <p>is officially enrolled in Grade <strong>${record.grade_level}</strong>, Section <strong>${record.section_name}</strong></p>
    <p>for School Year <strong>${record.school_year}</strong>.</p>
    <p>Status: <strong>${record.status}</strong></p>
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
  const tableRows = rows
    .map(
      (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${row.lrn}</td>
          <td>${row.last_name}, ${row.first_name}</td>
          <td>${row.status}</td>
          <td>${row.grade_level}</td>
        </tr>
      `
    )
    .join('');

  const body = `
    <div class="header">
      <h1>Pateros National High School</h1>
      <p class="muted">School Form 1 (Student Register)</p>
    </div>
    <h3>Section: ${meta.sectionName}</h3>
    <p>School Year: ${meta.schoolYear}</p>
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
