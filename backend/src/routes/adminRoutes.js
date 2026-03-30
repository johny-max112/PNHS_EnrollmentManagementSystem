const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
} = require('../controllers/adminController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(allowRoles('admin'));

// User management
router.get('/users', listUsers);
router.post('/users', createUser);
router.patch('/users/:id', updateUser);

module.exports = router;
