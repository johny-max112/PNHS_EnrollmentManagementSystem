const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

function buildStudentToken(account) {
  return jwt.sign(
    {
      userId: account.account_id,
      studentId: account.student_id,
      lrn: account.lrn,
      role: 'student',
      fullName: `${account.first_name} ${account.last_name}`,
      firstName: account.first_name,
      lastName: account.last_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function loginStudent(req, res) {
  const { lrn, password } = req.body;

  if (!lrn || !password) {
    return res.status(400).json({ message: 'LRN and password are required.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT sa.id AS account_id, sa.student_id, sa.password_hash, sa.is_active,
              s.lrn, s.first_name, s.last_name
       FROM student_accounts sa
       JOIN students s ON s.id = sa.student_id
       WHERE sa.lrn = ?`,
      [lrn]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid student login credentials.' });
    }

    const account = rows[0];
    if (!account.is_active) {
      return res.status(403).json({ message: 'Student account is inactive.' });
    }

    const validPassword = await bcrypt.compare(password, account.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid student login credentials.' });
    }

    await pool.query('UPDATE student_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [
      account.account_id,
    ]);

    const token = buildStudentToken(account);

    return res.json({
      token,
      user: {
        id: account.account_id,
        studentId: account.student_id,
        role: 'student',
        lrn: account.lrn,
        firstName: account.first_name,
        lastName: account.last_name,
        fullName: `${account.first_name} ${account.last_name}`,
      },
    });
  } catch (error) {
    console.error('Student login failed:', error);
    return res.status(500).json({ message: 'Student login failed.' });
  }
}

async function getCurrentStudent(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.lrn, s.first_name, s.last_name, s.middle_name, s.suffix
       FROM students s
       WHERE s.id = ?`,
      [req.user.studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    return res.json({ student: rows[0] });
  } catch (error) {
    console.error('Failed to load student profile:', error);
    return res.status(500).json({ message: 'Failed to load student profile.' });
  }
}

module.exports = {
  loginStudent,
  getCurrentStudent,
};
