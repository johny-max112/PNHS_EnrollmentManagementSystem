const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const {
  isValidUsername,
  isStrongPassword,
  sanitizeName,
} = require('../utils/securityUtils');

async function listUsers(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, full_name, role, is_active, created_at, updated_at
       FROM users
       ORDER BY created_at DESC`
    );

    return res.json({ users: rows });
  } catch (error) {
    console.error('Failed to load users:', error);
    return res.status(500).json({ message: 'Failed to load users.' });
  }
}

async function createUser(req, res) {
  const { username, password, fullName, role } = req.body;

  if (!username || !password || !fullName || !role) {
    return res.status(400).json({ message: 'Username, password, full name, and role are required.' });
  }

  // Validate username format
  if (!isValidUsername(username)) {
    return res
      .status(400)
      .json({ message: 'Username must be 3-50 alphanumeric characters (underscores allowed).' });
  }

  // Validate password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    });
  }

  // Sanitize name to prevent XSS
  const sanitizedName = sanitizeName(fullName);
  if (!sanitizedName || sanitizedName.length < 2) {
    return res.status(400).json({ message: 'Full name must be at least 2 characters.' });
  }

  if (!['admin', 'registrar'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?)`,
      [username, passwordHash, sanitizedName, role]
    );

    return res.status(201).json({ message: 'User created successfully.', userId: result.insertId });
  } catch (error) {
    console.error('Failed to create user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Username already exists.' });
    }
    return res.status(500).json({ message: 'Failed to create user.' });
  }
}

async function updateUser(req, res) {
  const targetUserId = Number(req.params.id);
  const { fullName, role, isActive, password } = req.body;

  if (!targetUserId || isNaN(targetUserId)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  if (role && !['admin', 'registrar'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role.' });
  }

  // Prevent users from deactivating themselves
  if (req.user.userId === targetUserId && isActive === false) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ? LIMIT 1', [targetUserId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates = [];
    const params = [];

    if (typeof fullName === 'string' && fullName.trim()) {
      const sanitizedName = sanitizeName(fullName);
      if (sanitizedName && sanitizedName.length >= 2) {
        updates.push('full_name = ?');
        params.push(sanitizedName);
      } else {
        return res.status(400).json({ message: 'Full name must be at least 2 characters.' });
      }
    }

    if (role) {
      updates.push('role = ?');
      params.push(role);
    }

    if (typeof isActive === 'boolean') {
      updates.push('is_active = ?');
      params.push(isActive ? 1 : 0);
    }

    if (typeof password === 'string' && password.trim()) {
      // Validate password strength
      if (!isStrongPassword(password)) {
        return res.status(400).json({
          message:
            'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
        });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No user changes were provided.' });
    }

    params.push(targetUserId);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    return res.json({ message: 'User updated successfully.' });
  } catch (error) {
    console.error('Failed to update user:', error);
    return res.status(500).json({ message: 'Failed to update user.' });
  }
}

// ============ Student Account Management ============

async function listStudentAccounts(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.lrn, s.first_name, s.last_name, s.middle_name, s.suffix,
              sa.id AS account_id, sa.is_active, sa.last_login_at, sa.created_at
       FROM students s
       LEFT JOIN student_accounts sa ON sa.student_id = s.id
       ORDER BY s.last_name, s.first_name`
    );

    return res.json({ students: rows });
  } catch (error) {
    console.error('Failed to load student accounts:', error);
    return res.status(500).json({ message: 'Failed to load student accounts.' });
  }
}

async function createStudentAccount(req, res) {
  const { lrn, firstName, lastName, middleName = null, suffix = null, password } = req.body;

  // Validate required fields
  if (!lrn || !firstName || !lastName || !password) {
    return res
      .status(400)
      .json({ message: 'LRN, first name, last name, and password are required.' });
  }

  // Validate LRN format
  if (!(/^\d{12}$/.test(String(lrn)))) {
    return res.status(400).json({ message: 'LRN must be exactly 12 digits.' });
  }

  // Sanitize names
  const sanitizedFirstName = sanitizeName(firstName);
  const sanitizedLastName = sanitizeName(lastName);
  const sanitizedMiddleName = middleName ? sanitizeName(middleName) : null;

  if (!sanitizedFirstName || !sanitizedLastName) {
    return res.status(400).json({ message: 'Names must contain valid characters.' });
  }

  // Validate password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if student with this LRN already exists
    const [existingStudents] = await connection.query(
      'SELECT id FROM students WHERE lrn = ? LIMIT 1',
      [lrn]
    );

    let studentId;

    if (existingStudents.length > 0) {
      studentId = existingStudents[0].id;
      // Update existing student record
      await connection.query(
        `UPDATE students 
         SET first_name = ?, last_name = ?, middle_name = ?, suffix = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [sanitizedFirstName, sanitizedLastName, sanitizedMiddleName, suffix, studentId]
      );
    } else {
      // Create new student
      const [studentInsert] = await connection.query(
        `INSERT INTO students (lrn, first_name, last_name, middle_name, suffix)
         VALUES (?, ?, ?, ?, ?)`,
        [lrn, sanitizedFirstName, sanitizedLastName, sanitizedMiddleName, suffix]
      );
      studentId = studentInsert.insertId;
    }

    // Check if account already exists
    const [existingAccounts] = await connection.query(
      'SELECT id FROM student_accounts WHERE student_id = ? LIMIT 1',
      [studentId]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    if (existingAccounts.length > 0) {
      // Update existing account
      await connection.query(
        `UPDATE student_accounts 
         SET password_hash = ?, is_active = 1, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = ?`,
        [passwordHash, studentId]
      );
    } else {
      // Create new account
      await connection.query(
        `INSERT INTO student_accounts (student_id, lrn, password_hash, is_active)
         VALUES (?, ?, ?, 1)`,
        [studentId, lrn, passwordHash]
      );
    }

    await connection.commit();

    return res.status(201).json({
      message: 'Student account created/updated successfully.',
      student: {
        id: studentId,
        lrn,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to create student account:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Student with this LRN already exists.' });
    }

    return res.status(500).json({ message: 'Failed to create student account.' });
  } finally {
    connection.release();
  }
}

async function resetStudentPassword(req, res) {
  const studentId = Number(req.params.id);
  const { password } = req.body;

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ message: 'Invalid student ID.' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Password is required.' });
  }

  // Validate password strength
  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
    });
  }

  try {
    // Check if student account exists
    const [rows] = await pool.query(
      'SELECT id FROM student_accounts WHERE student_id = ? LIMIT 1',
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student account not found.' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password
    await pool.query('UPDATE student_accounts SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?', [
      passwordHash,
      studentId,
    ]);

    return res.json({ message: 'Student password reset successfully.' });
  } catch (error) {
    console.error('Failed to reset student password:', error);
    return res.status(500).json({ message: 'Failed to reset student password.' });
  }
}

async function deactivateStudentAccount(req, res) {
  const studentId = Number(req.params.id);
  const { isActive } = req.body;

  if (!studentId || isNaN(studentId)) {
    return res.status(400).json({ message: 'Invalid student ID.' });
  }

  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ message: 'isActive must be a boolean.' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT id FROM student_accounts WHERE student_id = ? LIMIT 1',
      [studentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Student account not found.' });
    }

    await pool.query(
      'UPDATE student_accounts SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
      [isActive ? 1 : 0, studentId]
    );

    return res.json({
      message: `Student account ${isActive ? 'activated' : 'deactivated'} successfully.`,
    });
  } catch (error) {
    console.error('Failed to update student account:', error);
    return res.status(500).json({ message: 'Failed to update student account.' });
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  listStudentAccounts,
  createStudentAccount,
  resetStudentPassword,
  deactivateStudentAccount,
};
