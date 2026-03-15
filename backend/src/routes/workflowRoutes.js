const express = require('express');
const {
	listSections,
	listEnrollments,
	updateEnrollmentStatus,
} = require('../controllers/workflowController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/sections', allowRoles('admin', 'registrar'), listSections);
router.get('/', allowRoles('admin', 'registrar'), listEnrollments);
router.patch('/:id/status', allowRoles('admin', 'registrar'), updateEnrollmentStatus);

module.exports = router;
