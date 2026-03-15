const pool = require('../config/db');

const ALLOWED_STATUS = ['pending', 'enrolled', 'completed', 'cancelled'];

async function listEnrollments(req, res) {
  const status = req.query.status;
  const schoolYear = req.query.schoolYear;

  const params = [];
  let whereSql = 'WHERE 1=1';

  if (status && ALLOWED_STATUS.includes(status)) {
    whereSql += ' AND e.status = ?';
    params.push(status);
  }

  if (schoolYear) {
    whereSql += ' AND e.school_year = ?';
    params.push(schoolYear);
  }

  try {
    const [rows] = await pool.query(
      `SELECT
        e.id,
        e.school_year,
        e.grade_level,
        e.status,
        e.created_at,
        s.lrn,
        s.first_name,
        s.last_name,
        sec.section_name,
        t.track_name,
        st.strand_name
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN sections sec ON sec.id = e.section_id
      LEFT JOIN tracks t ON t.id = e.track_id
      LEFT JOIN strands st ON st.id = e.strand_id
      ${whereSql}
      ORDER BY e.created_at DESC`,
      params
    );

    return res.json({ enrollments: rows });
  } catch (error) {
    console.error('Failed to list enrollments:', error);
    return res.status(500).json({ message: 'Failed to load enrollments.' });
  }
}

async function listSections(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, section_name, grade_level, capacity, current_enrolled
       FROM sections
       WHERE is_active = 1
       ORDER BY grade_level, section_name`
    );

    return res.json({ sections: rows });
  } catch (error) {
    console.error('Failed to list sections:', error);
    return res.status(500).json({ message: 'Failed to load sections.' });
  }
}

async function updateEnrollmentStatus(req, res) {
  const enrollmentId = Number(req.params.id);
  const { status, notes = null } = req.body;

  if (!ALLOWED_STATUS.includes(status)) {
    return res.status(400).json({ message: 'Invalid enrollment status value.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT id, section_id, status
       FROM enrollments
       WHERE id = ?
       FOR UPDATE`,
      [enrollmentId]
    );

    if (rows.length === 0) {
      throw new Error('Enrollment not found.');
    }

    const enrollment = rows[0];

    if (enrollment.status === status) {
      await connection.rollback();
      return res.json({ message: 'Enrollment status unchanged.', enrollmentId });
    }

    if (enrollment.status !== 'cancelled' && status === 'cancelled') {
      await connection.query(
        `UPDATE sections
         SET current_enrolled = GREATEST(current_enrolled - 1, 0)
         WHERE id = ?`,
        [enrollment.section_id]
      );
    }

    if (enrollment.status === 'cancelled' && status !== 'cancelled') {
      const [sections] = await connection.query(
        `SELECT id, capacity, current_enrolled
         FROM sections
         WHERE id = ?
         FOR UPDATE`,
        [enrollment.section_id]
      );

      const section = sections[0];
      if (!section || section.current_enrolled >= section.capacity) {
        throw new Error('Section is full. Cannot restore enrollment from cancelled status.');
      }

      await connection.query(
        'UPDATE sections SET current_enrolled = current_enrolled + 1 WHERE id = ?',
        [enrollment.section_id]
      );
    }

    await connection.query('UPDATE enrollments SET status = ? WHERE id = ?', [status, enrollmentId]);

    await connection.query(
      `INSERT INTO enrollment_status_logs (enrollment_id, old_status, new_status, changed_by, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [enrollmentId, enrollment.status, status, req.user.userId, notes]
    );

    await connection.commit();
    return res.json({ message: 'Enrollment status updated.', enrollmentId, status });
  } catch (error) {
    await connection.rollback();
    console.error('Status update failed:', error);
    return res.status(400).json({ message: error.message || 'Status update failed.' });
  } finally {
    connection.release();
  }
}

module.exports = {
  listSections,
  listEnrollments,
  updateEnrollmentStatus,
};
