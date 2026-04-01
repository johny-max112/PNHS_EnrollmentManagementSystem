const express = require('express');
const {
	getEnrollmentApplication,
	listSections,
	listEnrollments,
	updateEnrollmentStatus,
} = require('../controllers/dashboardController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/sections', allowRoles('admin', 'registrar'), listSections);
router.get('/', allowRoles('admin', 'registrar'), listEnrollments);
router.get('/:id/application', allowRoles('admin', 'registrar'), getEnrollmentApplication);
router.patch('/:id/status', allowRoles('admin', 'registrar'), updateEnrollmentStatus);

module.exports = router;
