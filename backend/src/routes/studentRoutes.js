const express = require('express');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');
const {
  getCurrentEnrollment,
  getStudentCoe,
  getStudentCoePdf,
  getStudentMetadata,
  submitStudentEnrollment,
} = require('../controllers/studentPortalController');

const router = express.Router();

router.use(authenticate);
router.use(allowRoles('student'));
router.get('/enrollment/meta', getStudentMetadata);
router.post('/enrollment', submitStudentEnrollment);
router.get('/enrollment/current', getCurrentEnrollment);
router.get('/reports/coe', getStudentCoe);
router.get('/reports/coe/pdf', getStudentCoePdf);

module.exports = router;
