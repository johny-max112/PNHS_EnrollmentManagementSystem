const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { isValidUsername } = require('../utils/securityUtils');

function buildToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function login(req, res) {
  const { username, password } = req.body;

  // Input validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required.' });
  }

  // Prevent injection attacks: validate username format
  if (!isValidUsername(username)) {
    return res.status(400).json({ message: 'Invalid username format.' });
  }

  if (typeof password !== 'string' || password.length === 0 || password.length > 128) {
    return res.status(400).json({ message: 'Invalid password format.' });
  }

  try {
    // Use parameterized query to prevent SQL injection
    const [rows] = await pool.query(
      `SELECT id, username, password_hash, role, full_name, is_active
       FROM users
       WHERE username = ?
       LIMIT 1`,
      [username]
    );

    if (rows.length === 0) {
      // Generic message to prevent user enumeration attacks
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({ message: 'Account is inactive.' });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      // Generic message to prevent user enumeration attacks
      return res.status(401).json({ message: 'Invalid login credentials.' });
    }

    const token = buildToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Login failed.' });
  }
}

function getCurrentUser(req, res) {
  return res.json({
    user: {
      id: req.user.userId,
      username: req.user.username,
      fullName: req.user.fullName,
      role: req.user.role,
    },
  });
}

module.exports = {
  login,
  getCurrentUser,
};
