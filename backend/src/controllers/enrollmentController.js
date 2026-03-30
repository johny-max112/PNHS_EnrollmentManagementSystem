const pool = require('../config/db');
const { isSHS, isValidGradeLevel } = require('../utils/enrollmentRules');

async function getMetadata(req, res) {
  const gradeLevel = Number(req.query.gradeLevel);
  const strandId = req.query.strandId ? Number(req.query.strandId) : null;

  if (!isValidGradeLevel(gradeLevel)) {
    return res.status(400).json({ message: 'Invalid grade level. Allowed: 7-12.' });
  }

  try {
    const [sections] = await pool.query(
      `SELECT id, section_name, capacity, current_enrolled
       FROM sections
       WHERE grade_level = ?
         AND is_active = 1
         AND ((? < 11 AND strand_id IS NULL) OR (? >= 11 AND strand_id = ?))
       ORDER BY section_name`,
      [gradeLevel, gradeLevel, gradeLevel, strandId]
    );

    let tracks = [];
    let strands = [];

    if (isSHS(gradeLevel)) {
      [tracks] = await pool.query(
        'SELECT id, track_code, track_name FROM tracks WHERE is_active = 1 ORDER BY track_name'
      );

      if (req.query.trackId) {
        const [strandRows] = await pool.query(
          `SELECT id, strand_code, strand_name, track_id
           FROM strands
           WHERE track_id = ? AND is_active = 1
           ORDER BY strand_name`,
          [Number(req.query.trackId)]
        );
        strands = strandRows;
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
      sections,
      subjects,
    });
  } catch (error) {
    console.error('Metadata fetch failed:', error);
    return res.status(500).json({ message: 'Failed to load enrollment metadata.' });
  }
}

async function createEnrollment(req, res) {
  const {
    lrn,
    firstName,
    lastName,
    middleName = null,
    suffix = null,
    gradeLevel,
    trackId = null,
    strandId = null,
    sectionId,
    schoolYear,
  } = req.body;

  if (!lrn || !firstName || !lastName || !gradeLevel || !sectionId || !schoolYear) {
    return res.status(400).json({ message: 'Missing required enrollment fields.' });
  }

  const normalizedGradeLevel = Number(gradeLevel);
  const normalizedSectionId = Number(sectionId);
  const normalizedTrackId = trackId ? Number(trackId) : null;
  const normalizedStrandId = strandId ? Number(strandId) : null;

  if (!isValidGradeLevel(normalizedGradeLevel)) {
    return res.status(400).json({ message: 'Invalid grade level. Allowed: 7-12.' });
  }

  if (isSHS(normalizedGradeLevel) && (!normalizedTrackId || !normalizedStrandId)) {
    return res
      .status(400)
      .json({ message: 'Track and strand are required for Grades 11 and 12.' });
  }

  if (!/^\d{12}$/.test(String(lrn))) {
    return res.status(400).json({ message: 'LRN must be exactly 12 digits.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sectionRows] = await connection.query(
      `SELECT id, grade_level, strand_id, capacity, current_enrolled
       FROM sections
       WHERE id = ? AND is_active = 1
       FOR UPDATE`,
      [normalizedSectionId]
    );

    if (sectionRows.length === 0) {
      throw new Error('Selected section is not available.');
    }

    const selectedSection = sectionRows[0];

    if (selectedSection.grade_level !== normalizedGradeLevel) {
      throw new Error('Section does not match selected grade level.');
    }

    if (selectedSection.current_enrolled >= selectedSection.capacity) {
      throw new Error('Section is already full.');
    }

    if (isSHS(normalizedGradeLevel) && selectedSection.strand_id !== normalizedStrandId) {
      throw new Error('Section does not match selected strand.');
    }

    const [existingStudents] = await connection.query('SELECT id FROM students WHERE lrn = ?', [lrn]);

    let studentId;

    if (existingStudents.length > 0) {
      studentId = existingStudents[0].id;
      await connection.query(
        `UPDATE students
         SET first_name = ?, last_name = ?, middle_name = ?, suffix = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [firstName, lastName, middleName, suffix, studentId]
      );
    } else {
      const [studentInsert] = await connection.query(
        `INSERT INTO students (lrn, first_name, last_name, middle_name, suffix, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [lrn, firstName, lastName, middleName, suffix, req.user.userId]
      );
      studentId = studentInsert.insertId;
    }

    const [existingEnrollment] = await connection.query(
      `SELECT id FROM enrollments
       WHERE student_id = ? AND school_year = ? AND status IN ('pending', 'documents_pending', 'verified', 'enrolled')`,
      [studentId, schoolYear]
    );

    if (existingEnrollment.length > 0) {
      throw new Error('Student already has an active enrollment for this school year.');
    }

    const [enrollmentInsert] = await connection.query(
      `INSERT INTO enrollments (
        student_id, grade_level, track_id, strand_id, section_id, school_year, status, enrolled_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        studentId,
        normalizedGradeLevel,
        normalizedTrackId,
        normalizedStrandId,
        normalizedSectionId,
        schoolYear,
        req.user.userId,
      ]
    );

    const enrollmentId = enrollmentInsert.insertId;

    await connection.query(
      `INSERT INTO enrollment_audit_logs (enrollment_id, action, old_value, new_value, changed_by, notes)
       VALUES (?, 'Enrollment created', NULL, 'pending', ?, 'Initial enrollment submission')`,
      [enrollmentId, req.user.userId]
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
      throw new Error('No subjects configured for the selected grade or strand.');
    }

    const values = subjectRows.map((subject) => [enrollmentId, subject.id]);
    await connection.query(
      'INSERT INTO enrollment_subjects (enrollment_id, subject_id) VALUES ?',
      [values]
    );

    await connection.query(
      `UPDATE sections
       SET current_enrolled = current_enrolled + 1
       WHERE id = ?`,
      [normalizedSectionId]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Enrollment submitted successfully.',
      enrollmentId,
      status: 'pending',
      assignedSubjectCount: subjectRows.length,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Enrollment creation failed:', error);
    return res.status(400).json({ message: error.message || 'Enrollment failed.' });
  } finally {
    connection.release();
  }
}

module.exports = {
  getMetadata,
  createEnrollment,
};
