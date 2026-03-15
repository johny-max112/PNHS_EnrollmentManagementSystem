const express = require('express');
const { createEnrollment, getMetadata } = require('../controllers/enrollmentController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/meta', allowRoles('admin', 'registrar'), getMetadata);
router.post('/', allowRoles('admin', 'registrar'), createEnrollment);

module.exports = router;
