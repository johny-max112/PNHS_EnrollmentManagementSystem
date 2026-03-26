const pool = require('../config/db');
const { buildCoeTemplate } = require('../utils/reportTemplates');
const { drawCoePdf } = require('../utils/pdfReports');
const { isSHS, isValidGradeLevel } = require('../utils/enrollmentRules');

async function getStudentMetadata(req, res) {
  const gradeLevel = Number(req.query.gradeLevel);
  const strandId = req.query.strandId ? Number(req.query.strandId) : null;

  if (!isValidGradeLevel(gradeLevel)) {
    return res.status(400).json({ message: 'Invalid grade level. Allowed: 7-12.' });
  }

  try {
    let tracks = [];
    let strands = [];

    if (isSHS(gradeLevel)) {
      [tracks] = await pool.query(
        'SELECT id, track_code, track_name FROM tracks WHERE is_active = 1 ORDER BY track_name'
      );

      if (req.query.trackId) {
        [strands] = await pool.query(
          `SELECT id, strand_code, strand_name, track_id
           FROM strands
           WHERE track_id = ? AND is_active = 1
           ORDER BY strand_name`,
          [Number(req.query.trackId)]
        );
      }
    }

    const subjectParams = [gradeLevel];
    let subjectSql =
      'SELECT id, subject_code, subject_name, grade_level FROM subjects WHERE grade_level = ?';

    if (isSHS(gradeLevel) && strandId) {
      subjectSql += ' AND (strand_id IS NULL OR strand_id = ?)';
      subjectParams.push(strandId);
    } else {
      subjectSql += ' AND strand_id IS NULL';
    }

    subjectSql += ' AND is_active = 1 ORDER BY subject_code';

    const [subjects] = await pool.query(subjectSql, subjectParams);

    return res.json({
      gradeLevel,
      isSHS: isSHS(gradeLevel),
      tracks,
      strands,
      subjects,
    });
  } catch (error) {
    console.error('Student metadata fetch failed:', error);
    return res.status(500).json({ message: 'Failed to load enrollment metadata.' });
  }
}

async function pickSection(connection, gradeLevel, strandId) {
  const [rows] = await connection.query(
    `SELECT id, section_name, capacity, current_enrolled
     FROM sections
     WHERE grade_level = ?
       AND is_active = 1
       AND ((? < 11 AND strand_id IS NULL) OR (? >= 11 AND strand_id = ?))
       AND current_enrolled < capacity
     ORDER BY current_enrolled ASC, section_name ASC
     LIMIT 1
     FOR UPDATE`,
    [gradeLevel, gradeLevel, gradeLevel, strandId]
  );

  return rows[0] || null;
}

async function submitStudentEnrollment(req, res) {
  const {
    firstName,
    lastName,
    middleName = null,
    suffix = null,
    gradeLevel,
    trackId = null,
    strandId = null,
    schoolYear,
  } = req.body;

  const normalizedGradeLevel = Number(gradeLevel);
  const normalizedTrackId = trackId ? Number(trackId) : null;
  const normalizedStrandId = strandId ? Number(strandId) : null;

  if (!firstName || !lastName || !normalizedGradeLevel || !schoolYear) {
    return res.status(400).json({ message: 'Missing required enrollment fields.' });
  }

  if (!isValidGradeLevel(normalizedGradeLevel)) {
    return res.status(400).json({ message: 'Invalid grade level. Allowed: 7-12.' });
  }

  if (isSHS(normalizedGradeLevel) && (!normalizedTrackId || !normalizedStrandId)) {
    return res.status(400).json({ message: 'Track and strand are required for Grades 11 and 12.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `UPDATE students
       SET first_name = ?, last_name = ?, middle_name = ?, suffix = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [firstName, lastName, middleName, suffix, req.user.studentId]
    );

    const [existingEnrollment] = await connection.query(
      `SELECT id FROM enrollments
       WHERE student_id = ? AND school_year = ? AND status IN ('pending', 'approved', 'enrolled', 'completed')`,
      [req.user.studentId, schoolYear]
    );

    if (existingEnrollment.length > 0) {
      throw new Error('You already have an active enrollment for this school year.');
    }

    const assignedSection = await pickSection(
      connection,
      normalizedGradeLevel,
      normalizedStrandId
    );

    if (!assignedSection) {
      throw new Error('No available section found for the selected grade level or strand.');
    }

    const [enrollmentInsert] = await connection.query(
      `INSERT INTO enrollments (
        student_id, grade_level, track_id, strand_id, section_id, school_year, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.user.studentId,
        normalizedGradeLevel,
        normalizedTrackId,
        normalizedStrandId,
        assignedSection.id,
        schoolYear,
      ]
    );

    const enrollmentId = enrollmentInsert.insertId;

    await connection.query(
      `INSERT INTO enrollment_status_logs (enrollment_id, old_status, new_status, changed_by, notes)
       VALUES (?, NULL, 'pending', NULL, 'Student enrollment submission')`,
      [enrollmentId]
    );

    const subjectParams = [normalizedGradeLevel];
    let subjectSql = 'SELECT id FROM subjects WHERE grade_level = ? AND is_active = 1';

    if (isSHS(normalizedGradeLevel)) {
      subjectSql += ' AND (strand_id IS NULL OR strand_id = ?)';
      subjectParams.push(normalizedStrandId);
    } else {
      subjectSql += ' AND strand_id IS NULL';
    }

    const [subjectRows] = await connection.query(subjectSql, subjectParams);

    if (subjectRows.length === 0) {
      throw new Error('No subjects configured for the selected grade level or strand.');
    }

    const values = subjectRows.map((subject) => [enrollmentId, subject.id]);
    await connection.query(
      'INSERT INTO enrollment_subjects (enrollment_id, subject_id) VALUES ?',
      [values]
    );

    await connection.query(
      'UPDATE sections SET current_enrolled = current_enrolled + 1 WHERE id = ?',
      [assignedSection.id]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Enrollment submitted successfully.',
      enrollmentId,
      status: 'pending',
      assignedSection: assignedSection.section_name,
      assignedSubjectCount: subjectRows.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Student enrollment failed:', error);
    return res.status(400).json({ message: error.message || 'Enrollment failed.' });
  } finally {
    connection.release();
  }
}

async function getCurrentEnrollment(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.school_year, e.grade_level, e.status,
              s.lrn, s.first_name, s.last_name, s.middle_name, s.suffix,
              sec.section_name,
              t.track_name,
              st.strand_name
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       JOIN sections sec ON sec.id = e.section_id
       LEFT JOIN tracks t ON t.id = e.track_id
       LEFT JOIN strands st ON st.id = e.strand_id
       WHERE e.student_id = ?
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [req.user.studentId]
    );

    if (rows.length === 0) {
      return res.json({ enrollment: null, subjects: [] });
    }

    const enrollment = rows[0];
    const [subjects] = await pool.query(
      `SELECT sub.id, sub.subject_code, sub.subject_name
       FROM enrollment_subjects es
       JOIN subjects sub ON sub.id = es.subject_id
       WHERE es.enrollment_id = ?
       ORDER BY sub.subject_code`,
      [enrollment.id]
    );

    return res.json({ enrollment, subjects });
  } catch (error) {
    console.error('Failed to load student enrollment:', error);
    return res.status(500).json({ message: 'Failed to load student enrollment.' });
  }
}

async function fetchStudentCoeRecord(studentId) {
  const [rows] = await pool.query(
    `SELECT e.id, e.school_year, e.grade_level, e.status,
            s.lrn, s.first_name, s.last_name,
            sec.section_name
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN sections sec ON sec.id = e.section_id
     WHERE e.student_id = ?
     ORDER BY e.created_at DESC
     LIMIT 1`,
    [studentId]
  );

  return rows[0] || null;
}

async function getStudentCoe(req, res) {
  try {
    const record = await fetchStudentCoeRecord(req.user.studentId);

    if (!record) {
      return res.status(404).json({ message: 'No enrollment found for this student.' });
    }

    if (!['enrolled', 'completed'].includes(record.status)) {
      return res.status(400).json({ message: 'COE is available only for confirmed enrollments.' });
    }

    const html = buildCoeTemplate(record);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (error) {
    console.error('Failed to generate student COE:', error);
    return res.status(500).json({ message: 'Failed to generate COE.' });
  }
}

async function getStudentCoePdf(req, res) {
  try {
    const record = await fetchStudentCoeRecord(req.user.studentId);

    if (!record) {
      return res.status(404).json({ message: 'No enrollment found for this student.' });
    }

    if (!['enrolled', 'completed'].includes(record.status)) {
      return res.status(400).json({ message: 'COE is available only for confirmed enrollments.' });
    }

    return drawCoePdf(res, record);
  } catch (error) {
    console.error('Failed to generate student COE PDF:', error);
    return res.status(500).json({ message: 'Failed to generate COE PDF.' });
  }
}

module.exports = {
  getCurrentEnrollment,
  getStudentCoe,
  getStudentCoePdf,
  getStudentMetadata,
  submitStudentEnrollment,
};
