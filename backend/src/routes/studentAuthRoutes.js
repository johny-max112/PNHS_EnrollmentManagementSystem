const express = require('express');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');
const { loginStudent, getCurrentStudent } = require('../controllers/studentAuthController');

const router = express.Router();

router.post('/login', loginStudent);
router.get('/me', authenticate, allowRoles('student'), getCurrentStudent);

module.exports = router;
