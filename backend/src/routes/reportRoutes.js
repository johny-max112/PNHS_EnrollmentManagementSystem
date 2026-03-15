const express = require('express');
const {
	getCoePdfReport,
	getCoeReport,
	getSf1PdfReport,
	getSf1Report,
} = require('../controllers/reportController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.get('/coe/:enrollmentId', allowRoles('admin', 'registrar'), getCoeReport);
router.get('/coe/:enrollmentId/pdf', allowRoles('admin', 'registrar'), getCoePdfReport);
router.get('/sf1', allowRoles('admin', 'registrar'), getSf1Report);
router.get('/sf1/pdf', allowRoles('admin', 'registrar'), getSf1PdfReport);

module.exports = router;
