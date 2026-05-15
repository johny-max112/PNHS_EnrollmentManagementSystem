const pool = require('../config/db');
const { isValidLRN, isValidGradeLevel, isValidSchoolYear, sanitizeName } = require('../utils/securityUtils');

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

async function getEnrollMeta(_req, res) {
  try {
    const [sections] = await pool.query(
      `SELECT id, section_name, grade_level, strand_id, capacity, current_enrolled
       FROM sections
       WHERE is_active = 1
       ORDER BY grade_level, section_name`
    );

    const [subjects] = await pool.query(
      `SELECT id, subject_code, subject_name, grade_level, strand_id, units
       FROM subjects
       WHERE is_active = 1
       ORDER BY grade_level, subject_code`
    );

    return res.json({ sections, subjects });
  } catch (error) {
    console.error('Failed to load enrollment meta:', error);
    return res.status(500).json({ message: 'Failed to load enrollment options.' });
  }
}

async function createEnrollment(req, res) {
  const {
    lrn,
    firstName,
    lastName,
    middleName = '',
    suffix = '',
    dateOfBirth = null,
    gender = null,
    contactNumber = null,
    address = null,
    gradeLevel,
    sectionId,
    schoolYear,
  } = req.body;

  if (!isValidLRN(lrn)) {
    return res.status(400).json({ message: 'LRN must be exactly 12 digits.' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ message: 'First name and last name are required.' });
  }

  if (!isValidGradeLevel(gradeLevel)) {
    return res.status(400).json({ message: 'Grade level must be between 7 and 12.' });
  }

  if (!sectionId || Number.isNaN(Number(sectionId))) {
    return res.status(400).json({ message: 'Valid section is required.' });
  }

  if (!isValidSchoolYear(schoolYear)) {
    return res.status(400).json({ message: 'School year must use the YYYY-YYYY format.' });
  }

  const sanitizedFirstName = sanitizeName(firstName);
  const sanitizedLastName = sanitizeName(lastName);
  const sanitizedMiddleName = sanitizeName(middleName);
  const sanitizedSuffix = normalizeText(suffix);
  const normalizedGender = normalizeText(gender).toLowerCase() || null;
  const normalizedContactNumber = normalizeText(contactNumber) || null;
  const normalizedAddress = normalizeText(address) || null;

  if (sanitizedFirstName.length < 2 || sanitizedLastName.length < 2) {
    return res.status(400).json({ message: 'First and last names must be at least 2 characters.' });
  }

  if (normalizedGender && !['male', 'female', 'other'].includes(normalizedGender)) {
    return res.status(400).json({ message: 'Invalid gender value.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [sectionRows] = await connection.query(
      `SELECT id, grade_level, strand_id, capacity, current_enrolled
       FROM sections
       WHERE id = ? AND is_active = 1
       LIMIT 1`,
      [sectionId]
    );

    if (sectionRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Section not found.' });
    }

    const section = sectionRows[0];
    const [strandRows] = await connection.query(
      `SELECT track_id FROM strands WHERE id = ? LIMIT 1`,
      [section.strand_id]
    );
    const trackId = strandRows.length > 0 ? strandRows[0].track_id : null;

    if (Number(section.grade_level) !== Number(gradeLevel)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Selected section does not match the chosen grade level.' });
    }

    if (Number(section.current_enrolled) >= Number(section.capacity)) {
      await connection.rollback();
      return res.status(400).json({ message: 'Selected section is already full.' });
    }

    const [existingStudents] = await connection.query(
      `SELECT id FROM students WHERE lrn = ? LIMIT 1`,
      [lrn]
    );

    let studentId = null;

    if (existingStudents.length > 0) {
      studentId = existingStudents[0].id;
      await connection.query(
        `UPDATE students
         SET first_name = ?, last_name = ?, middle_name = ?, suffix = ?, date_of_birth = ?, gender = ?, contact_number = ?, address = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          sanitizedFirstName,
          sanitizedLastName,
          sanitizedMiddleName || null,
          sanitizedSuffix || null,
          dateOfBirth || null,
          normalizedGender,
          normalizedContactNumber,
          normalizedAddress,
          studentId,
        ]
      );
    } else {
      const [studentInsert] = await connection.query(
        `INSERT INTO students (
          lrn,
          first_name,
          last_name,
          middle_name,
          suffix,
          date_of_birth,
          gender,
          contact_number,
          address,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lrn,
          sanitizedFirstName,
          sanitizedLastName,
          sanitizedMiddleName || null,
          sanitizedSuffix || null,
          dateOfBirth || null,
          normalizedGender,
          normalizedContactNumber,
          normalizedAddress,
          req.user.userId,
        ]
      );

      studentId = studentInsert.insertId;
    }

    const [existingEnrollment] = await connection.query(
      `SELECT id FROM enrollments WHERE student_id = ? AND school_year = ? LIMIT 1`,
      [studentId, schoolYear]
    );

    if (existingEnrollment.length > 0) {
      await connection.rollback();
      return res.status(409).json({ message: 'This student is already enrolled for the selected school year.' });
    }

    const [enrollmentInsert] = await connection.query(
      `INSERT INTO enrollments (
        student_id,
        grade_level,
        track_id,
        strand_id,
        section_id,
        school_year,
        status,
        enrolled_by
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)` ,
      [studentId, gradeLevel, trackId, section.strand_id || null, sectionId, schoolYear, req.user.userId]
    );

    const subjectParams = [Number(gradeLevel)];
    let subjectSql =
      `SELECT id
       FROM subjects
       WHERE is_active = 1
         AND grade_level = ?`;

    if (section.strand_id) {
      subjectSql += ' AND (strand_id IS NULL OR strand_id = ?)';
      subjectParams.push(section.strand_id);
    } else {
      subjectSql += ' AND strand_id IS NULL';
    }

    const [subjectRows] = await connection.query(subjectSql, subjectParams);

    if (subjectRows.length > 0) {
      const subjectValues = subjectRows.map((subject) => [enrollmentInsert.insertId, subject.id]);
      await connection.query(
        'INSERT INTO enrollment_subjects (enrollment_id, subject_id) VALUES ?',
        [subjectValues]
      );
    }

    await connection.query(
      'UPDATE sections SET current_enrolled = current_enrolled + 1 WHERE id = ?',
      [sectionId]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Student enrollment saved successfully.',
      studentId,
      enrollmentId: enrollmentInsert.insertId,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to create enrollment:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'LRN already exists.' });
    }

    return res.status(500).json({ message: 'Failed to save enrollment.' });
  } finally {
    connection.release();
  }
}

async function lookupStudent(req, res) {
  try {
    const q = (req.query.query || '').trim();
    if (!q) return res.json({ student: null, subjects: [] });

    // try exact LRN match first
    const [lrnRows] = await pool.query('SELECT * FROM students WHERE lrn = ? LIMIT 1', [q]);
    let student = lrnRows.length > 0 ? lrnRows[0] : null;

    if (!student) {
      const like = `%${q}%`;
      const [nameRows] = await pool.query(
        `SELECT * FROM students WHERE CONCAT(first_name, ' ', last_name) LIKE ? OR CONCAT(last_name, ' ', first_name) LIKE ? LIMIT 1`,
        [like, like]
      );
      student = nameRows.length > 0 ? nameRows[0] : null;
    }

    let subjects = [];
    if (student) {
      const grade = student.grade_level || null;
      if (grade) {
        const [subs] = await pool.query(
          `SELECT id, subject_code, subject_name, grade_level, strand_id, units
           FROM subjects
           WHERE is_active = 1 AND grade_level = ?
           ORDER BY subject_code`,
          [grade]
        );
        subjects = subs || [];
      }
    }

    return res.json({ student, subjects });
  } catch (err) {
    console.error('lookupStudent failed', err);
    return res.status(500).json({ message: 'Lookup failed' });
  }
}

async function searchStudents(req, res) {
  try {
    const q = (req.query.query || '').trim();
    if (!q) return res.json({ students: [] });

    const like = `%${q}%`;
    // search by lrn, first name, last name, or full name
    const [rows] = await pool.query(
      `SELECT id, lrn, first_name, last_name, middle_name
       FROM students
       WHERE lrn LIKE ?
         OR first_name LIKE ?
         OR last_name LIKE ?
         OR CONCAT(first_name, ' ', last_name) LIKE ?
       ORDER BY last_name, first_name
       LIMIT 10`,
      [like, like, like, like]
    );

    return res.json({ students: rows || [] });
  } catch (err) {
    console.error('searchStudents failed', err);
    return res.status(500).json({ message: 'Search failed' });
  }
}

module.exports = {
  getEnrollMeta,
  createEnrollment,
  lookupStudent,
};

