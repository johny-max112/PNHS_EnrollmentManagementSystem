const express = require('express');
const multer = require('multer');
const { authenticate, allowRoles } = require('../middleware/authMiddleware');
const {
  getEnrollmentDocuments,
  checkDocumentStatus,
  uploadDocument,
  verifyDocument,
  setRequirementStatus,
  deleteDocument,
} = require('../controllers/documentController');

const router = express.Router();

// Configure multer for file uploads (memory storage for simplicity)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// All document routes require authentication with admin or registrar role
router.use(authenticate);
router.use(allowRoles('admin', 'registrar'));

/**
 * GET /api/documents/enrollment/:enrollmentId
 * Get all documents for an enrollment
 */
router.get('/enrollment/:enrollmentId', getEnrollmentDocuments);

/**
 * GET /api/documents/check/:enrollmentId
 * Check document status and requirements for an enrollment
 */
router.get('/check/:enrollmentId', checkDocumentStatus);

/**
 * POST /api/documents/enrollment/:enrollmentId/upload
 * Upload a document for an enrollment
 */
router.post('/enrollment/:enrollmentId/upload', upload.single('file'), uploadDocument);

/**
 * PATCH /api/documents/:documentId/verify
 * Verify or reject a document (registrar/admin)
 */
router.patch('/:documentId/verify', verifyDocument);

/**
 * PATCH /api/documents/enrollment/:enrollmentId/requirements/:documentTypeId
 * Manually check/uncheck requirement completion for office-submitted documents.
 */
router.patch('/enrollment/:enrollmentId/requirements/:documentTypeId', setRequirementStatus);

/**
 * DELETE /api/documents/:documentId
 * Delete a document
 */
router.delete('/:documentId', deleteDocument);

module.exports = router;
