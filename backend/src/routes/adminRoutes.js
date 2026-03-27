const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
  listStudentAccounts,
  createStudentAccount,
  resetStudentPassword,
  deactivateStudentAccount,
} = require('../controllers/adminController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(allowRoles('admin'));

// User management
router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);

// Student account management
router.get('/students', listStudentAccounts);
router.post('/students', createStudentAccount);
router.patch('/students/:id/password', resetStudentPassword);
router.patch('/students/:id/status', deactivateStudentAccount);

module.exports = router;
