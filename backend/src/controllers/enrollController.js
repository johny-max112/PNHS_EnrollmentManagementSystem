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
    age = null,
    gender = null,
    contactNumber = null,
    religion = null,
    placeOfBirth = null,
    houseStreet = null,
    barangay = null,
    municipality = null,
    address = null,
    gradeLevel,
    sectionId,
    schoolYear,
    fatherLastName = null,
    fatherFirstName = null,
    fatherMiddleName = null,
    fatherSuffix = null,
    fatherContact = null,
    guardianLastName = null,
    guardianFirstName = null,
    guardianMiddleName = null,
    guardianSuffix = null,
    guardianContact = null,
    specialNeeds = false,
    specialNeedsOption = null,
    diagnosisA = null,
    diagnosisB = null,
    pwdId = false,
    returningLearner = false,
    lastGradeLevelCompleted = null,
    lastSchoolYearCompleted = null,
    lastSchoolAttended = null,
    lastSchoolId = null,
    distance_blended = false,
    distance_etv = false,
    distance_other = false,
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
  const normalizedAge = Number.isFinite(Number(age)) ? Number(age) : null;
  const normalizedGender = normalizeText(gender).toLowerCase() || null;
  const normalizedContactNumber = normalizeText(contactNumber) || null;
  const normalizedReligion = normalizeText(religion) || null;
  const normalizedPlaceOfBirth = normalizeText(placeOfBirth) || null;
  const normalizedHouseStreet = normalizeText(houseStreet) || null;
  const normalizedBarangay = normalizeText(barangay) || null;
  const normalizedMunicipality = normalizeText(municipality) || null;
  const normalizedAddress = [normalizedHouseStreet, normalizedBarangay, normalizedMunicipality]
    .filter(Boolean)
    .join(', ') || normalizeText(address) || null;
  const normalizedFatherLastName = normalizeText(fatherLastName) || null;
  const normalizedFatherFirstName = normalizeText(fatherFirstName) || null;
  const normalizedFatherMiddleName = normalizeText(fatherMiddleName) || null;
  const normalizedFatherSuffix = normalizeText(fatherSuffix) || null;
  const normalizedFatherContact = normalizeText(fatherContact) || null;
  const normalizedGuardianLastName = normalizeText(guardianLastName) || null;
  const normalizedGuardianFirstName = normalizeText(guardianFirstName) || null;
  const normalizedGuardianMiddleName = normalizeText(guardianMiddleName) || null;
  const normalizedGuardianSuffix = normalizeText(guardianSuffix) || null;
  const normalizedGuardianContact = normalizeText(guardianContact) || null;
  const normalizedSpecialNeedsOption = normalizeText(specialNeedsOption).toLowerCase() || null;
  const normalizedDiagnosisA = normalizeText(diagnosisA) || null;
  const normalizedDiagnosisB = normalizeText(diagnosisB) || null;
  const normalizedLastGradeLevelCompleted = Number.isFinite(Number(lastGradeLevelCompleted))
    ? Number(lastGradeLevelCompleted)
    : null;
  const normalizedLastSchoolYearCompleted = normalizeText(lastSchoolYearCompleted) || null;
  const normalizedLastSchoolAttended = normalizeText(lastSchoolAttended) || null;
  const normalizedLastSchoolId = normalizeText(lastSchoolId) || null;
  const normalizedSpecialNeeds = Boolean(specialNeeds);
  const normalizedPwdId = Boolean(pwdId);
  const normalizedReturningLearner = Boolean(returningLearner);
  const normalizedDistanceBlended = Boolean(distance_blended);
  const normalizedDistanceEtv = Boolean(distance_etv);
  const normalizedDistanceOther = Boolean(distance_other);

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
         SET first_name = ?,
             last_name = ?,
             middle_name = ?,
             suffix = ?,
             date_of_birth = ?,
             age = ?,
             gender = ?,
             contact_number = ?,
             religion = ?,
             place_of_birth = ?,
             house_street = ?,
             barangay = ?,
             municipality = ?,
             address = ?,
             father_last_name = ?,
             father_first_name = ?,
             father_middle_name = ?,
             father_suffix = ?,
             father_contact = ?,
             guardian_last_name = ?,
             guardian_first_name = ?,
             guardian_middle_name = ?,
             guardian_suffix = ?,
             guardian_contact = ?,
             special_needs_program = ?,
             special_needs_option = ?,
             diagnosis_a = ?,
             diagnosis_b = ?,
             pwd_id = ?,
             returning_learner = ?,
             last_grade_level_completed = ?,
             last_school_year_completed = ?,
             last_school_attended = ?,
             last_school_id = ?,
             distance_blended = ?,
             distance_etv = ?,
             distance_other = ?,
             school_year = ?,
             grade_level = ?,
             section_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          sanitizedFirstName,
          sanitizedLastName,
          sanitizedMiddleName || null,
          sanitizedSuffix || null,
          dateOfBirth || null,
          normalizedAge,
          normalizedGender,
          normalizedContactNumber,
          normalizedReligion,
          normalizedPlaceOfBirth,
          normalizedHouseStreet,
          normalizedBarangay,
          normalizedMunicipality,
          normalizedAddress,
          normalizedFatherLastName,
          normalizedFatherFirstName,
          normalizedFatherMiddleName,
          normalizedFatherSuffix,
          normalizedFatherContact,
          normalizedGuardianLastName,
          normalizedGuardianFirstName,
          normalizedGuardianMiddleName,
          normalizedGuardianSuffix,
          normalizedGuardianContact,
          normalizedSpecialNeeds ? 1 : 0,
          normalizedSpecialNeedsOption,
          normalizedDiagnosisA,
          normalizedDiagnosisB,
          normalizedPwdId ? 1 : 0,
          normalizedReturningLearner ? 1 : 0,
          normalizedLastGradeLevelCompleted,
          normalizedLastSchoolYearCompleted,
          normalizedLastSchoolAttended,
          normalizedLastSchoolId,
          normalizedDistanceBlended ? 1 : 0,
          normalizedDistanceEtv ? 1 : 0,
          normalizedDistanceOther ? 1 : 0,
          schoolYear,
          gradeLevel,
          sectionId,
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
          age,
          gender,
          contact_number,
          religion,
          place_of_birth,
          house_street,
          barangay,
          municipality,
          address,
          father_last_name,
          father_first_name,
          father_middle_name,
          father_suffix,
          father_contact,
          guardian_last_name,
          guardian_first_name,
          guardian_middle_name,
          guardian_suffix,
          guardian_contact,
          special_needs_program,
          special_needs_option,
          diagnosis_a,
          diagnosis_b,
          pwd_id,
          returning_learner,
          last_grade_level_completed,
          last_school_year_completed,
          last_school_attended,
          last_school_id,
          distance_blended,
          distance_etv,
          distance_other,
          school_year,
          grade_level,
          section_id,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        [
          lrn,
          sanitizedFirstName,
          sanitizedLastName,
          sanitizedMiddleName || null,
          sanitizedSuffix || null,
          dateOfBirth || null,
          normalizedAge,
          normalizedGender,
          normalizedContactNumber,
          normalizedReligion,
          normalizedPlaceOfBirth,
          normalizedHouseStreet,
          normalizedBarangay,
          normalizedMunicipality,
          normalizedAddress,
          normalizedFatherLastName,
          normalizedFatherFirstName,
          normalizedFatherMiddleName,
          normalizedFatherSuffix,
          normalizedFatherContact,
          normalizedGuardianLastName,
          normalizedGuardianFirstName,
          normalizedGuardianMiddleName,
          normalizedGuardianSuffix,
          normalizedGuardianContact,
          normalizedSpecialNeeds ? 1 : 0,
          normalizedSpecialNeedsOption,
          normalizedDiagnosisA,
          normalizedDiagnosisB,
          normalizedPwdId ? 1 : 0,
          normalizedReturningLearner ? 1 : 0,
          normalizedLastGradeLevelCompleted,
          normalizedLastSchoolYearCompleted,
          normalizedLastSchoolAttended,
          normalizedLastSchoolId,
          normalizedDistanceBlended ? 1 : 0,
          normalizedDistanceEtv ? 1 : 0,
          normalizedDistanceOther ? 1 : 0,
          schoolYear,
          gradeLevel,
          sectionId,
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
        `SELECT * FROM students
         WHERE CONCAT(first_name, ' ', last_name) LIKE ?
            OR CONCAT(last_name, ' ', first_name) LIKE ?
            OR CONCAT_WS(' ', first_name, middle_name, last_name) LIKE ?
            OR CONCAT_WS(' ', last_name, first_name, middle_name) LIKE ?
         LIMIT 1`,
        [like, like, like, like]
      );
      student = nameRows.length > 0 ? nameRows[0] : null;
    }

    let subjects = [];
    if (student) {
      const [enrollmentRows] = await pool.query(
        `SELECT e.grade_level, e.section_id, sec.strand_id
         FROM enrollments e
         LEFT JOIN sections sec ON sec.id = e.section_id
         WHERE e.student_id = ?
         ORDER BY e.id DESC
         LIMIT 1`,
        [student.id]
      );

      const latestEnrollment = enrollmentRows.length > 0 ? enrollmentRows[0] : null;
      const grade = latestEnrollment?.grade_level || null;
      student = {
        ...student,
        grade_level: latestEnrollment?.grade_level || null,
        section_id: latestEnrollment?.section_id || null,
      };

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
    // search by lrn, first name, middle name, last name, and common full-name permutations
    const [rows] = await pool.query(
      `SELECT
         s.id,
         s.lrn,
         s.first_name,
         s.last_name,
         s.middle_name,
         latest_enrollment.grade_level,
         latest_enrollment.section_id
       FROM students s
       LEFT JOIN (
         SELECT e1.student_id, e1.grade_level, e1.section_id
         FROM enrollments e1
         INNER JOIN (
           SELECT student_id, MAX(id) AS max_id
           FROM enrollments
           GROUP BY student_id
         ) latest ON latest.student_id = e1.student_id AND latest.max_id = e1.id
       ) latest_enrollment ON latest_enrollment.student_id = s.id
       WHERE s.lrn LIKE ?
          OR s.first_name LIKE ?
          OR s.middle_name LIKE ?
          OR s.last_name LIKE ?
          OR CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name) LIKE ?
          OR CONCAT_WS(' ', s.last_name, s.first_name, s.middle_name) LIKE ?
          OR CONCAT_WS(', ', s.last_name, s.first_name, s.middle_name) LIKE ?
       ORDER BY s.last_name, s.first_name
       LIMIT 10`,
      [like, like, like, like, like, like, like]
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
  searchStudents,
};

