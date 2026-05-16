const express = require('express');
const {
  getQueue,
  listSections,
  assignSection,
  getSectionReport,
} = require('../controllers/sectionAssignmentController');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(allowRoles('admin', 'registrar'));

router.get('/queue', getQueue);
router.get('/sections', listSections);
router.get('/report', getSectionReport);
router.post('/assign', assignSection);

module.exports = router;
