const pool = require('../config/db');
const { buildCoeTemplate, buildSf1Template } = require('../utils/reportTemplates');
const { drawCoePdf, drawSf1Pdf } = require('../utils/pdfReports');
const { isValidSchoolYear } = require('../utils/securityUtils');

async function fetchCoeRecord(enrollmentId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.school_year, e.grade_level, e.status,
            s.lrn, s.first_name, s.last_name,
            sec.section_name
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN sections sec ON sec.id = e.section_id
     WHERE e.id = ?
     LIMIT 1`,
    [enrollmentId]
  );

  return rows[0] || null;
}

async function fetchSf1Data(sectionId, schoolYear) {
  // Validate schoolYear format to prevent injection
  if (!isValidSchoolYear(schoolYear)) {
    throw new Error('Invalid school year format.');
  }

  const [sectionRows] = await pool.query('SELECT section_name FROM sections WHERE id = ? LIMIT 1', [
    sectionId,
  ]);
  if (sectionRows.length === 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT s.lrn, s.first_name, s.last_name, e.status, e.grade_level
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     WHERE e.section_id = ? AND e.school_year = ?
     ORDER BY s.last_name, s.first_name`,
    [sectionId, schoolYear]
  );

  return {
    meta: {
      sectionName: sectionRows[0].section_name,
      schoolYear,
    },
    rows,
  };
}

async function getCoeReport(req, res) {
  const enrollmentId = Number(req.params.enrollmentId);

  if (!enrollmentId || isNaN(enrollmentId)) {
    return res.status(400).json({ message: 'Invalid enrollment ID.' });
  }

  try {
    const record = await fetchCoeRecord(enrollmentId);

    if (!record) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    const html = buildCoeTemplate(record);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(html);
  } catch (error) {
    console.error('Failed to generate COE:', error);
    return res.status(500).json({ message: 'Failed to generate COE report.' });
  }
}

async function getCoePdfReport(req, res) {
  const enrollmentId = Number(req.params.enrollmentId);

  if (!enrollmentId || isNaN(enrollmentId)) {
    return res.status(400).json({ message: 'Invalid enrollment ID.' });
  }

  try {
    const record = await fetchCoeRecord(enrollmentId);

    if (!record) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    return drawCoePdf(res, record);
  } catch (error) {
    console.error('Failed to generate COE PDF:', error);
    return res.status(500).json({ message: 'Failed to generate COE PDF.' });
  }
}

async function getSf1Report(req, res) {
  const sectionId = Number(req.query.sectionId);
  const schoolYear = req.query.schoolYear;

  if (!sectionId || !schoolYear) {
    return res.status(400).json({ message: 'sectionId and schoolYear are required.' });
  }

  if (isNaN(sectionId)) {
    return res.status(400).json({ message: 'Invalid section ID.' });
  }

  try {
    const data = await fetchSf1Data(sectionId, schoolYear);
    if (!data) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const html = buildSf1Template(data.meta, data.rows);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.send(html);
  } catch (error) {
    console.error('Failed to generate SF1:', error);
    return res.status(500).json({ message: 'Failed to generate SF1 report.' });
  }
}

async function getSf1PdfReport(req, res) {
  const sectionId = Number(req.query.sectionId);
  const schoolYear = req.query.schoolYear;

  if (!sectionId || !schoolYear) {
    return res.status(400).json({ message: 'sectionId and schoolYear are required.' });
  }

  if (isNaN(sectionId)) {
    return res.status(400).json({ message: 'Invalid section ID.' });
  }

  try {
    const data = await fetchSf1Data(sectionId, schoolYear);
    if (!data) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    return drawSf1Pdf(res, data.meta, data.rows);
  } catch (error) {
    console.error('Failed to generate SF1 PDF:', error);
    return res.status(500).json({ message: 'Failed to generate SF1 PDF.' });
  }
}

module.exports = {
  getCoePdfReport,
  getCoeReport,
  getSf1PdfReport,
  getSf1Report,
};
