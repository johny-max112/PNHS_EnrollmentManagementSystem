const pool = require('../config/db');
const { isValidGradeLevel, isValidSchoolYear } = require('../utils/securityUtils');

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'string' && ['null', 'none'].includes(value.toLowerCase())) {
    return 'NULL';
  }

  const num = Number(value);
  if (Number.isNaN(num)) {
    return null;
  }

  return num;
}

function parseTrackFilter(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'regular') {
      return 'NULL';
    }
    if (normalized === 'ste') {
      return 'NOT_NULL';
    }
  }

  return parseOptionalNumber(value);
}

async function getQueue(req, res) {
  const gradeLevel = Number(req.query.gradeLevel);
  const schoolYear = req.query.schoolYear;
  const trackId = parseTrackFilter(req.query.trackId || req.query.program);
  const strandId = parseOptionalNumber(req.query.strandId);
  const status = req.query.status || 'verified';

  if (!isValidGradeLevel(gradeLevel)) {
    return res.status(400).json({ message: 'Grade level must be between 7 and 12.' });
  }

  if (!isValidSchoolYear(schoolYear)) {
    return res.status(400).json({ message: 'School year must use the YYYY-YYYY format.' });
  }

  const params = [status, gradeLevel, schoolYear];
  let whereSql = 'WHERE e.status = ? AND e.grade_level = ? AND e.school_year = ?';

  if (trackId === 'NULL') {
    whereSql += ' AND e.track_id IS NULL';
  } else if (trackId === 'NOT_NULL') {
    whereSql += ' AND e.track_id IS NOT NULL';
  } else if (typeof trackId === 'number') {
    whereSql += ' AND e.track_id = ?';
    params.push(trackId);
  }

  if (strandId === 'NULL') {
    whereSql += ' AND e.strand_id IS NULL';
  } else if (typeof strandId === 'number') {
    whereSql += ' AND e.strand_id = ?';
    params.push(strandId);
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         e.id AS enrollment_id,
         e.student_id,
         s.lrn,
         s.first_name,
         s.last_name,
         s.middle_name,
         s.suffix,
         s.gender,
         e.grade_level,
         e.track_id,
         e.strand_id,
         e.school_year,
         e.section_id,
         sec.section_name,
         sec.capacity,
         sec.current_enrolled
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       LEFT JOIN sections sec ON sec.id = e.section_id
       ${whereSql}
         AND EXISTS (
           SELECT 1 FROM enrollment_subjects es WHERE es.enrollment_id = e.id
         )
       ORDER BY e.grade_level ASC, e.track_id ASC, e.strand_id ASC, s.last_name ASC, s.first_name ASC`,
      params
    );

    return res.json({ queue: rows || [] });
  } catch (error) {
    console.error('Failed to load assignment queue:', error);
    return res.status(500).json({ message: 'Failed to load assignment queue.' });
  }
}

async function listSections(req, res) {
  const gradeLevel = parseOptionalNumber(req.query.gradeLevel);
  const trackId = parseTrackFilter(req.query.trackId || req.query.program);
  const strandId = parseOptionalNumber(req.query.strandId);

  const params = [];
  let whereSql = 'WHERE sec.is_active = 1';

  if (typeof gradeLevel === 'number') {
    whereSql += ' AND sec.grade_level = ?';
    params.push(gradeLevel);
  }

  if (trackId === 'NULL') {
    whereSql += ' AND st.track_id IS NULL';
  } else if (trackId === 'NOT_NULL') {
    whereSql += ' AND st.track_id IS NOT NULL';
  } else if (typeof trackId === 'number') {
    whereSql += ' AND st.track_id = ?';
    params.push(trackId);
  }

  if (strandId === 'NULL') {
    whereSql += ' AND sec.strand_id IS NULL';
  } else if (typeof strandId === 'number') {
    whereSql += ' AND sec.strand_id = ?';
    params.push(strandId);
  }

  try {
    const [rows] = await pool.query(
      `SELECT
         sec.id,
         sec.section_name,
         sec.grade_level,
         sec.strand_id,
         sec.capacity,
         sec.current_enrolled,
         (sec.capacity - sec.current_enrolled) AS remaining,
         (sec.current_enrolled >= sec.capacity) AS is_full
       FROM sections sec
       LEFT JOIN strands st ON st.id = sec.strand_id
       ${whereSql}
       ORDER BY sec.grade_level, sec.section_name`,
      params
    );

    return res.json({ sections: rows || [] });
  } catch (error) {
    console.error('Failed to load sections:', error);
    return res.status(500).json({ message: 'Failed to load sections.' });
  }
}

async function assignSection(req, res) {
  const enrollmentId = Number(req.body.enrollmentId);
  const studentId = Number(req.body.studentId);
  const sectionId = Number(req.body.sectionId);

  if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) {
    return res.status(400).json({ message: 'Invalid enrollment ID.' });
  }

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ message: 'Invalid student ID.' });
  }

  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    return res.status(400).json({ message: 'Invalid section ID.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [enrollmentRows] = await connection.query(
      `SELECT id, student_id, section_id, status
       FROM enrollments
       WHERE id = ?
       FOR UPDATE`,
      [enrollmentId]
    );

    if (enrollmentRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Enrollment record not found.' });
    }

    const enrollment = enrollmentRows[0];
    if (Number(enrollment.student_id) !== studentId) {
      await connection.rollback();
      return res.status(400).json({ message: 'Student does not match enrollment record.' });
    }

    if (enrollment.status !== 'verified') {
      await connection.rollback();
      return res.status(400).json({ message: 'Only verified enrollments can be assigned to a section.' });
    }

    const [sectionRows] = await connection.query(
      `SELECT id, capacity, current_enrolled
       FROM sections
       WHERE id = ? AND is_active = 1
       FOR UPDATE`,
      [sectionId]
    );

    if (sectionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Section not found.' });
    }

    const section = sectionRows[0];
    if (Number(section.current_enrolled) >= Number(section.capacity)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Selected section is already full.' });
    }

    const oldSectionId = enrollment.section_id ? Number(enrollment.section_id) : null;

    if (oldSectionId && oldSectionId !== sectionId) {
      await connection.query(
        `UPDATE sections
         SET current_enrolled = GREATEST(current_enrolled - 1, 0)
         WHERE id = ?`,
        [oldSectionId]
      );
    }

    if (!oldSectionId || oldSectionId !== sectionId) {
      await connection.query(
        'UPDATE sections SET current_enrolled = current_enrolled + 1 WHERE id = ?',
        [sectionId]
      );
    }

    await connection.query(
      `UPDATE enrollments
       SET section_id = ?, status = 'enrolled', verified_by = ?
       WHERE id = ?`,
      [sectionId, req.user.userId, enrollmentId]
    );

    await connection.query(
      `UPDATE students
       SET section_id = ?
       WHERE id = ?`,
      [sectionId, studentId]
    );

    await connection.query(
      `INSERT INTO enrollment_audit_logs (enrollment_id, action, old_value, new_value, changed_by, notes)
       VALUES (?, 'Section assigned', ?, ?, ?, ?)`,
      [enrollmentId, oldSectionId, sectionId, req.user.userId, 'Assigned in Section Assignment module']
    );

    await connection.commit();

    return res.json({
      message: 'Student assigned to section successfully.',
      enrollmentId,
      studentId,
      sectionId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Section assignment failed:', error);
    return res.status(500).json({ message: 'Section assignment failed.' });
  } finally {
    connection.release();
  }
}

async function getSectionReport(req, res) {
  const sectionId = Number(req.query.sectionId);
  const schoolYear = req.query.schoolYear;

  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    return res.status(400).json({ message: 'Invalid section ID.' });
  }

  if (!isValidSchoolYear(schoolYear)) {
    return res.status(400).json({ message: 'School year must use the YYYY-YYYY format.' });
  }

  try {
    const [sectionRows] = await pool.query(
      `SELECT id, section_name, grade_level
       FROM sections
       WHERE id = ?
       LIMIT 1`,
      [sectionId]
    );

    if (sectionRows.length === 0) {
      return res.status(404).json({ message: 'Section not found.' });
    }

    const [rows] = await pool.query(
      `SELECT
         s.id AS student_id,
         s.lrn,
         s.first_name,
         s.last_name,
         s.gender,
         e.grade_level,
         e.school_year
       FROM enrollments e
       JOIN students s ON s.id = e.student_id
       WHERE e.section_id = ? AND e.school_year = ? AND e.status = 'enrolled'
       ORDER BY CASE
         WHEN s.gender = 'female' THEN 1
         WHEN s.gender = 'male' THEN 2
         ELSE 3
       END, s.last_name, s.first_name`,
      [sectionId, schoolYear]
    );

    return res.json({
      section: sectionRows[0],
      students: rows || [],
    });
  } catch (error) {
    console.error('Failed to load section report:', error);
    return res.status(500).json({ message: 'Failed to load section report.' });
  }
}

module.exports = {
  getQueue,
  listSections,
  assignSection,
  getSectionReport,
};
