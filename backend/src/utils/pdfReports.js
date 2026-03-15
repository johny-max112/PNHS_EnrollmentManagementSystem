const PDFDocument = require('pdfkit');

function pipePdf(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

function drawTitle(doc, title, subtitle) {
  doc.font('Helvetica-Bold').fontSize(18).text('Pateros National High School', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(12).text(title, { align: 'center' });
  if (subtitle) {
    doc.moveDown(0.2);
    doc.fontSize(10).fillColor('#475569').text(subtitle, { align: 'center' }).fillColor('#000000');
  }
  doc.moveDown(1.2);
}

function drawCoePdf(res, record) {
  const doc = pipePdf(res, `coe-${record.id}.pdf`);
  drawTitle(doc, 'Certificate of Enrollment', `Enrollment ID ${record.id}`);

  doc.font('Helvetica').fontSize(12);
  doc.text(`This certifies that ${record.first_name} ${record.last_name} with LRN ${record.lrn}`);
  doc.moveDown(0.8);
  doc.text(`is officially enrolled in Grade ${record.grade_level}, Section ${record.section_name}`);
  doc.moveDown(0.8);
  doc.text(`for School Year ${record.school_year}.`);
  doc.moveDown(0.8);
  doc.text(`Current Enrollment Status: ${record.status}`);
  doc.moveDown(2);

  doc.text('__________________________', 60, doc.y + 40);
  doc.text('Registrar', 100, doc.y + 2);
  doc.text('__________________________', 320, doc.y - 15);
  doc.text('Principal', 370, doc.y + 2);

  doc.end();
}

function drawTable(doc, headers, rows, startY) {
  const widths = [35, 100, 200, 90, 50];
  let y = startY;
  let x = doc.page.margins.left;

  headers.forEach((header, index) => {
    doc.font('Helvetica-Bold').fontSize(10).text(header, x, y, { width: widths[index] });
    x += widths[index];
  });

  y += 20;
  rows.forEach((row) => {
    x = doc.page.margins.left;
    if (y > 720) {
      doc.addPage();
      y = 60;
    }

    row.forEach((value, index) => {
      doc.font('Helvetica').fontSize(9).text(String(value), x, y, { width: widths[index] });
      x += widths[index];
    });

    y += 18;
  });

  return y;
}

function drawSf1Pdf(res, meta, rows) {
  const doc = pipePdf(res, `sf1-${meta.sectionName}-${meta.schoolYear}.pdf`);
  drawTitle(doc, 'School Form 1 (Student Register)', `${meta.sectionName} | SY ${meta.schoolYear}`);

  const tableRows = rows.map((row, index) => [
    index + 1,
    row.lrn,
    `${row.last_name}, ${row.first_name}`,
    row.status,
    row.grade_level,
  ]);

  const endY = drawTable(doc, ['#', 'LRN', 'Student Name', 'Status', 'Grade'], tableRows, doc.y);
  doc.moveTo(doc.page.margins.left, endY + 12).lineTo(260, endY + 12).stroke();
  doc.moveTo(320, endY + 12).lineTo(520, endY + 12).stroke();
  doc.font('Helvetica').fontSize(10).text('Adviser', 120, endY + 16);
  doc.text('Registrar', 395, endY + 16);
  doc.end();
}

module.exports = {
  drawCoePdf,
  drawSf1Pdf,
};
