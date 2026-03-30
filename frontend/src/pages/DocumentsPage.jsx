import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import '../styles/base.css';
import '../styles/DocumentsPage.css';

function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [enrollments, setEnrollments] = useState([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [statusSummary, setStatusSummary] = useState(null);
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [filesByType, setFilesByType] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [workingTypeId, setWorkingTypeId] = useState(null);
  const [workingDocumentId, setWorkingDocumentId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const selectedEnrollment = useMemo(
    () => enrollments.find((item) => Number(item.id) === Number(selectedEnrollmentId)) || null,
    [enrollments, selectedEnrollmentId]
  );

  const documentsByType = useMemo(() => {
    const map = new Map();
    documents.forEach((doc) => {
      map.set(Number(doc.document_type_id), doc);
    });
    return map;
  }, [documents]);

  const loadEnrollments = async () => {
    setLoadingEnrollments(true);
    setError('');

    try {
      const { data } = await api.get('/api/workflow');
      const list = data.enrollments || [];
      setEnrollments(list);

      const queryEnrollmentId = searchParams.get('enrollmentId');
      if (queryEnrollmentId && list.some((item) => String(item.id) === String(queryEnrollmentId))) {
        setSelectedEnrollmentId(String(queryEnrollmentId));
      } else if (list.length > 0) {
        setSelectedEnrollmentId(String(list[0].id));
      } else {
        setSelectedEnrollmentId('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load enrollments.');
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const loadDocuments = async (enrollmentId) => {
    if (!enrollmentId) {
      return;
    }

    setLoadingDocuments(true);
    setError('');

    try {
      const [statusRes, docsRes] = await Promise.all([
        api.get(`/api/documents/check/${enrollmentId}`),
        api.get(`/api/documents/enrollment/${enrollmentId}`),
      ]);

      setStatusSummary(statusRes.data.summary || null);
      setRequiredDocuments(statusRes.data.requiredDocuments || []);
      setDocuments(docsRes.data.documents || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents.');
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, []);

  useEffect(() => {
    if (!selectedEnrollmentId) {
      setRequiredDocuments([]);
      setDocuments([]);
      setStatusSummary(null);
      return;
    }

    loadDocuments(selectedEnrollmentId);
    setSearchParams({ enrollmentId: String(selectedEnrollmentId) });
  }, [selectedEnrollmentId]);

  const onPickFile = (documentTypeId, file) => {
    setFilesByType((prev) => ({ ...prev, [documentTypeId]: file || null }));
  };

  const uploadDocument = async (documentTypeId) => {
    const file = filesByType[documentTypeId];
    if (!file || !selectedEnrollmentId) {
      setError('Please select a file before uploading.');
      return;
    }

    setWorkingTypeId(documentTypeId);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentTypeId', String(documentTypeId));

      const { data } = await api.post(
        `/api/documents/enrollment/${selectedEnrollmentId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setMessage(data.message || 'Document uploaded successfully.');
      setFilesByType((prev) => ({ ...prev, [documentTypeId]: null }));
      await loadDocuments(selectedEnrollmentId);
    } catch (err) {
      setError(err.response?.data?.message || 'Document upload failed.');
    } finally {
      setWorkingTypeId(null);
    }
  };

  const verifyDocument = async (documentId) => {
    setWorkingDocumentId(documentId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.patch(`/api/documents/${documentId}/verify`, {
        status: 'verified',
      });

      setMessage(data.message || 'Document verified.');
      await loadDocuments(selectedEnrollmentId);
    } catch (err) {
      setError(err.response?.data?.message || 'Document verification failed.');
    } finally {
      setWorkingDocumentId(null);
    }
  };

  const rejectDocument = async (documentId) => {
    const reason = (rejectionReasons[documentId] || '').trim();
    if (!reason) {
      setError('Please provide a rejection reason.');
      return;
    }

    setWorkingDocumentId(documentId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.patch(`/api/documents/${documentId}/verify`, {
        status: 'rejected',
        rejectionReason: reason,
      });

      setMessage(data.message || 'Document rejected.');
      await loadDocuments(selectedEnrollmentId);
    } catch (err) {
      setError(err.response?.data?.message || 'Document rejection failed.');
    } finally {
      setWorkingDocumentId(null);
    }
  };

  const deleteDocument = async (documentId) => {
    setWorkingDocumentId(documentId);
    setError('');
    setMessage('');

    try {
      const { data } = await api.delete(`/api/documents/${documentId}`);
      setMessage(data.message || 'Document deleted.');
      await loadDocuments(selectedEnrollmentId);
    } catch (err) {
      setError(err.response?.data?.message || 'Document deletion failed.');
    } finally {
      setWorkingDocumentId(null);
    }
  };

  return (
    <main className="page-shell">
      <section className="enroll-card documents-shell">
        <h1>Document Management</h1>
        <p>Upload, verify, reject, and monitor enrollment documents.</p>

        <div className="documents-toolbar">
          <label htmlFor="enrollmentPicker">Enrollment</label>
          <select
            id="enrollmentPicker"
            value={selectedEnrollmentId}
            onChange={(event) => setSelectedEnrollmentId(event.target.value)}
            disabled={loadingEnrollments || enrollments.length === 0}
          >
            {enrollments.length === 0 && <option value="">No enrollment records</option>}
            {enrollments.map((item) => (
              <option key={item.id} value={item.id}>
                #{item.id} - {item.lrn} - {item.last_name}, {item.first_name} - G{item.grade_level} {item.section_name}
              </option>
            ))}
          </select>
        </div>

        {selectedEnrollment && (
          <div className="documents-summary">
            <p>
              <strong>Enrollment:</strong> #{selectedEnrollment.id} | <strong>Student:</strong> {selectedEnrollment.last_name}, {selectedEnrollment.first_name} ({selectedEnrollment.lrn})
            </p>
            <p>
              <strong>Status:</strong> {selectedEnrollment.status} | <strong>Grade/Section:</strong> G{selectedEnrollment.grade_level} - {selectedEnrollment.section_name}
            </p>
            {statusSummary && (
              <p>
                <strong>Documents:</strong> {statusSummary.verified}/{statusSummary.required} verified, {statusSummary.pending} pending, {statusSummary.rejected} rejected
              </p>
            )}
          </div>
        )}

        {loadingDocuments && <p>Loading document records...</p>}
        {error && <p className="status error">{error}</p>}
        {message && <p className="status success">{message}</p>}

        <div className="table-wrap">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Current Status</th>
                <th>Upload / Replace</th>
                <th>Verification</th>
              </tr>
            </thead>
            <tbody>
              {requiredDocuments.map((requiredDoc) => {
                const existing = documentsByType.get(Number(requiredDoc.id));
                const isWorkingUpload = workingTypeId === requiredDoc.id;
                const isWorkingDoc = existing && workingDocumentId === existing.id;

                return (
                  <tr key={requiredDoc.id}>
                    <td>
                      <strong>{requiredDoc.code}</strong>
                      <div>{requiredDoc.name}</div>
                    </td>
                    <td>
                      <span className={`doc-badge ${existing ? existing.status : 'missing'}`}>
                        {existing ? existing.status : 'missing'}
                      </span>
                      {existing?.rejection_reason && <p className="doc-note">Reason: {existing.rejection_reason}</p>}
                    </td>
                    <td>
                      <div className="doc-upload-block">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={(event) => onPickFile(requiredDoc.id, event.target.files?.[0])}
                        />
                        <button
                          type="button"
                          onClick={() => uploadDocument(requiredDoc.id)}
                          disabled={isWorkingUpload || !selectedEnrollmentId}
                        >
                          {isWorkingUpload ? 'Uploading...' : existing ? 'Replace File' : 'Upload File'}
                        </button>
                      </div>
                    </td>
                    <td>
                      {!existing && <span className="doc-muted">Upload first</span>}

                      {existing && (
                        <div className="doc-actions">
                          <button
                            type="button"
                            onClick={() => verifyDocument(existing.id)}
                            disabled={isWorkingDoc || existing.status === 'verified'}
                          >
                            Verify
                          </button>

                          <input
                            type="text"
                            placeholder="Rejection reason"
                            value={rejectionReasons[existing.id] || ''}
                            onChange={(event) =>
                              setRejectionReasons((prev) => ({
                                ...prev,
                                [existing.id]: event.target.value,
                              }))
                            }
                            disabled={isWorkingDoc}
                          />

                          <button
                            type="button"
                            className="danger"
                            onClick={() => rejectDocument(existing.id)}
                            disabled={isWorkingDoc}
                          >
                            Reject
                          </button>

                          <button
                            type="button"
                            className="ghost"
                            onClick={() => deleteDocument(existing.id)}
                            disabled={isWorkingDoc}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default DocumentsPage;
