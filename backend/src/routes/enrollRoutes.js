const express = require('express');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');
const { getEnrollMeta, createEnrollment, lookupStudent, searchStudents } = require('../controllers/enrollController');

const router = express.Router();

router.use(authenticate);
router.use(allowRoles('admin', 'registrar'));

router.get('/meta', getEnrollMeta);
router.get('/lookup', lookupStudent);
router.get('/search', searchStudents);
router.post('/', createEnrollment);

module.exports = router;