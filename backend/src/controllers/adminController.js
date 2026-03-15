const bcrypt = require('bcryptjs');
const pool = require('../config/db');

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

  if (!['admin', 'registrar'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, role)
       VALUES (?, ?, ?, ?)`,
      [username, passwordHash, fullName, role]
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

  if (!targetUserId) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  if (role && !['admin', 'registrar'].includes(role)) {
    return res.status(400).json({ message: 'Invalid user role.' });
  }

  if (req.user.userId === targetUserId && isActive === false) {
    return res.status(400).json({ message: 'You cannot deactivate your own account.' });
  }

  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updates = [];
    const params = [];

    if (typeof fullName === 'string' && fullName.trim()) {
      updates.push('full_name = ?');
      params.push(fullName.trim());
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

module.exports = {
  listUsers,
  createUser,
  updateUser,
};
