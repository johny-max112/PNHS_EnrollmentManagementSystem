const pool = require('../config/db');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Get documents for an enrollment
 * GET /api/documents/enrollment/:enrollmentId
 */
async function getEnrollmentDocuments(req, res) {
  const { enrollmentId } = req.params;

  try {
    const [documents] = await pool.query(
      `SELECT 
        ed.id,
        ed.enrollment_id,
        ed.document_type_id,
        dt.code,
        dt.name,
        ed.file_name,
        ed.file_size,
        ed.status,
        ed.rejection_reason,
        ed.uploaded_by,
        u1.full_name AS uploaded_by_name,
        ed.verified_by,
        u2.full_name AS verified_by_name,
        ed.uploaded_at,
        ed.verified_at
      FROM enrollment_documents ed
      JOIN document_types dt ON dt.id = ed.document_type_id
      JOIN users u1 ON u1.id = ed.uploaded_by
      LEFT JOIN users u2 ON u2.id = ed.verified_by
      WHERE ed.enrollment_id = ?
      ORDER BY dt.code`,
      [enrollmentId]
    );

    return res.json({ documents });
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    return res.status(500).json({ message: 'Failed to fetch documents.' });
  }
}

/**
 * Get document verification status by grade level
 * GET /api/documents/check/:enrollmentId
 */
async function checkDocumentStatus(req, res) {
  const { enrollmentId } = req.params;

  try {
    const [enrollment] = await pool.query(
      `SELECT e.grade_level FROM enrollments e WHERE e.id = ?`,
      [enrollmentId]
    );

    if (enrollment.length === 0) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    const gradeLevel = enrollment[0].grade_level;

    // Get required documents for grade level
    const [requiredDocs] = await pool.query(
      `SELECT id, code, name FROM document_types 
       WHERE FIND_IN_SET(?, required_for_grades) > 0 
       AND is_active = 1`,
      [gradeLevel]
    );

    // Get uploaded documents
    const [uploadedDocs] = await pool.query(
      `SELECT 
        dt.id as doc_type_id,
        dt.code,
        dt.name,
        ed.status,
        ed.uploaded_at
      FROM enrollment_documents ed
      JOIN document_types dt ON dt.id = ed.document_type_id
      WHERE ed.enrollment_id = ?`,
      [enrollmentId]
    );

    // Check which documents are verified
    const uploadedMap = {};
    uploadedDocs.forEach(doc => {
      uploadedMap[doc.code] = doc.status;
    });

    const verifiedCount = uploadedDocs.filter(d => d.status === 'verified').length;
    const rejectedCount = uploadedDocs.filter(d => d.status === 'rejected').length;
    const pendingCount = uploadedDocs.filter(d => d.status === 'uploaded').length;

    return res.json({
      gradeLevel,
      requiredDocuments: requiredDocs,
      uploadedDocuments: uploadedDocs,
      summary: {
        required: requiredDocs.length,
        uploaded: uploadedDocs.length,
        verified: verifiedCount,
        rejected: rejectedCount,
        pending: pendingCount,
        allVerified: verifiedCount === requiredDocs.length,
      },
    });
  } catch (error) {
    console.error('Failed to check document status:', error);
    return res.status(500).json({ message: 'Failed to check document status.' });
  }
}

/**
 * Upload document
 * POST /api/documents/enrollment/:enrollmentId/upload
 */
async function uploadDocument(req, res) {
  const { enrollmentId } = req.params;
  const { documentTypeId } = req.body;
  const file = req.file;

  if (!file || !documentTypeId) {
    return res.status(400).json({ message: 'File and document type are required.' });
  }

  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ message: 'Only PDF, images, and Word documents are allowed.' });
  }

  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ message: 'File size must be less than 5MB.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verify enrollment exists
    const [enrollmentCheck] = await connection.query(
      'SELECT id FROM enrollments WHERE id = ?',
      [enrollmentId]
    );

    if (enrollmentCheck.length === 0) {
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    // Verify document type exists and is active
    const [docTypeCheck] = await connection.query(
      'SELECT id FROM document_types WHERE id = ? AND is_active = 1',
      [documentTypeId]
    );

    if (docTypeCheck.length === 0) {
      return res.status(400).json({ message: 'Invalid document type.' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${enrollmentId}-${documentTypeId}-${timestamp}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    fs.writeFileSync(filepath, file.buffer);

    // Check if document already exists for this enrollment and type
    const [existingDoc] = await connection.query(
      `SELECT id FROM enrollment_documents 
       WHERE enrollment_id = ? AND document_type_id = ?`,
      [enrollmentId, documentTypeId]
    );

    if (existingDoc.length > 0) {
      // Delete old file
      const [oldDoc] = await connection.query(
        `SELECT file_path FROM enrollment_documents WHERE id = ?`,
        [existingDoc[0].id]
      );
      if (oldDoc[0]?.file_path && fs.existsSync(oldDoc[0].file_path)) {
        fs.unlinkSync(oldDoc[0].file_path);
      }

      // Update existing document
      await connection.query(
        `UPDATE enrollment_documents 
         SET file_name = ?, file_path = ?, file_size = ?, mime_type = ?, 
             status = 'uploaded', uploaded_by = ?, verified_by = NULL, 
             verified_at = NULL, uploaded_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [file.originalname, filepath, file.size, file.mimetype, req.user.userId, existingDoc[0].id]
      );
    } else {
      // Insert new document
      await connection.query(
        `INSERT INTO enrollment_documents 
         (enrollment_id, document_type_id, file_name, file_path, file_size, mime_type, status, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, 'uploaded', ?)`,
        [enrollmentId, documentTypeId, file.originalname, filepath, file.size, file.mimetype, req.user.userId]
      );
    }

    await connection.commit();

    return res.json({
      message: 'Document uploaded successfully.',
      file: {
        filename,
        size: file.size,
        type: file.mimetype,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error('Document upload failed:', error);
    return res.status(500).json({ message: 'Document upload failed.' });
  } finally {
    connection.release();
  }
}

/**
 * Verify document (Registrar/Admin only)
 * PATCH /api/documents/:documentId/verify
 */
async function verifyDocument(req, res) {
  const { documentId } = req.params;
  const { status, rejectionReason } = req.body;

  if (!status || !['verified', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be "verified" or "rejected".' });
  }

  if (status === 'rejected' && !rejectionReason) {
    return res.status(400).json({ message: 'Rejection reason is required.' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [document] = await connection.query(
      'SELECT enrollment_id FROM enrollment_documents WHERE id = ?',
      [documentId]
    );

    if (document.length === 0) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const enrollmentId = document[0].enrollment_id;

    if (status === 'verified') {
      await connection.query(
        `UPDATE enrollment_documents 
         SET status = 'verified', verified_by = ?, verified_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [req.user.userId, documentId]
      );
    } else {
      await connection.query(
        `UPDATE enrollment_documents 
         SET status = 'rejected', rejection_reason = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [rejectionReason, req.user.userId, documentId]
      );
    }

    // Log the action
    await connection.query(
      `INSERT INTO enrollment_audit_logs 
       (enrollment_id, action, new_value, changed_by) 
       VALUES (?, ?, ?, ?)`,
      [enrollmentId, `Document ${status}`, `Document ID: ${documentId}`, req.user.userId]
    );

    // Check if all documents are verified
    const [requiredDocs] = await connection.query(
      `SELECT COUNT(*) as count FROM document_types 
       WHERE FIND_IN_SET((SELECT grade_level FROM enrollments WHERE id = ?), required_for_grades) > 0`,
      [enrollmentId]
    );

    const [uploadedDocs] = await connection.query(
      `SELECT COUNT(*) as count FROM enrollment_documents 
       WHERE enrollment_id = ? AND status = 'verified'`,
      [enrollmentId]
    );

    // Update enrollment status if all documents verified
    if (requiredDocs[0].count === uploadedDocs[0].count) {
      await connection.query(
        `UPDATE enrollments SET status = 'verified' WHERE id = ? AND status = 'documents_pending'`,
        [enrollmentId]
      );
    } else if (status === 'rejected') {
      await connection.query(
        `UPDATE enrollments SET status = 'documents_pending' WHERE id = ?`,
        [enrollmentId]
      );
    }

    await connection.commit();

    return res.json({
      message: `Document ${status} successfully.`,
      documentId,
      status,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Document verification failed:', error);
    return res.status(500).json({ message: 'Document verification failed.' });
  } finally {
    connection.release();
  }
}

/**
 * Delete document
 * DELETE /api/documents/:documentId
 */
async function deleteDocument(req, res) {
  const { documentId } = req.params;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [document] = await connection.query(
      `SELECT file_path, enrollment_id FROM enrollment_documents WHERE id = ?`,
      [documentId]
    );

    if (document.length === 0) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const { file_path: filePath, enrollment_id: enrollmentId } = document[0];

    // Delete file from filesystem
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document record
    await connection.query('DELETE FROM enrollment_documents WHERE id = ?', [documentId]);

    // Update enrollment status
    await connection.query(
      `UPDATE enrollments SET status = 'documents_pending' WHERE id = ?`,
      [enrollmentId]
    );

    // Log the action
    await connection.query(
      `INSERT INTO enrollment_audit_logs 
       (enrollment_id, action, new_value, changed_by) 
       VALUES (?, ?, ?, ?)`,
      [enrollmentId, 'Document deleted', `Document ID: ${documentId}`, req.user.userId]
    );

    await connection.commit();

    return res.json({ message: 'Document deleted successfully.' });
  } catch (error) {
    await connection.rollback();
    console.error('Document deletion failed:', error);
    return res.status(500).json({ message: 'Document deletion failed.' });
  } finally {
    connection.release();
  }
}

module.exports = {
  getEnrollmentDocuments,
  checkDocumentStatus,
  uploadDocument,
  verifyDocument,
  deleteDocument,
};
