import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import '../styles/base.css';
import '../styles/DocumentsPage.css';

function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [enrollments, setEnrollments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState('');
  const [documents, setDocuments] = useState([]);
  const [statusSummary, setStatusSummary] = useState(null);
  const [requiredDocuments, setRequiredDocuments] = useState([]);
  const [editing, setEditing] = useState(false);
  const [checkState, setCheckState] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
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

  const filteredEnrollments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return enrollments;
    }

    return enrollments.filter((item) => {
      const studentName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
      return String(item.lrn || '').includes(query) || studentName.includes(query);
    });
  }, [enrollments, searchQuery]);

  const selectedDocumentInfo = useMemo(() => {
    if (!selectedEnrollment) {
      return null;
    }

    return {
      name: `${selectedEnrollment.first_name || ''} ${selectedEnrollment.last_name || ''}`.trim(),
      lrn: selectedEnrollment.lrn,
      grade: selectedEnrollment.grade_level,
      gender: selectedEnrollment.gender || 'N/A',
    };
  }, [selectedEnrollment]);

  const loadEnrollments = async () => {
    setLoadingEnrollments(true);
    setError('');

    try {
      const { data } = await api.get('/api/dashboard');
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
      const fetchedDocuments = docsRes.data.documents || [];
      setDocuments(fetchedDocuments);

      const nextCheckState = {};
      fetchedDocuments.forEach((doc) => {
        nextCheckState[doc.document_type_id] = doc.status === 'verified';
      });
      setCheckState(nextCheckState);
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
      setCheckState({});
      setEditing(false);
      return;
    }

    loadDocuments(selectedEnrollmentId);
    setSearchParams({ enrollmentId: String(selectedEnrollmentId) });
  }, [selectedEnrollmentId]);

  const setRequirementStatus = async (documentTypeId, checked, silent = false) => {
    setWorkingDocumentId(documentTypeId);
    if (!silent) {
      setError('');
      setMessage('');
    }

    try {
      const { data } = await api.patch(
        `/api/documents/enrollment/${selectedEnrollmentId}/requirements/${documentTypeId}`,
        {
          status: checked ? 'verified' : 'rejected',
          rejectionReason: checked ? undefined : 'Marked incomplete in Requirement Validator.',
        }
      );

      if (!silent) {
        setMessage(data.message || 'Requirement status updated.');
        await loadDocuments(selectedEnrollmentId);
      }
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Requirement update failed.');
      return false;
    } finally {
      setWorkingDocumentId(null);
    }
  };

  const onToggleCheck = (documentTypeId) => {
    if (!editing) {
      return;
    }

    setCheckState((prev) => ({
      ...prev,
      [documentTypeId]: !prev[documentTypeId],
    }));
  };

  const onEdit = () => {
    setEditing(true);
    setError('');
    setMessage('');
  };

  const onCancelEdit = () => {
    const resetState = {};
    documents.forEach((doc) => {
      resetState[doc.document_type_id] = doc.status === 'verified';
    });
    setCheckState(resetState);
    setEditing(false);
    setError('');
    setMessage('Changes were discarded.');
  };

  const onSaveEdit = async () => {
    if (!selectedEnrollmentId || !selectedEnrollment) {
      return;
    }

    setError('');
    setMessage('');

    const actions = [];

    requiredDocuments.forEach((requiredDoc) => {
      const desiredChecked = Boolean(checkState[requiredDoc.id]);
      const existing = documentsByType.get(Number(requiredDoc.id));
      const currentlyChecked = existing?.status === 'verified';

      if (desiredChecked && !currentlyChecked) {
        actions.push({ documentTypeId: requiredDoc.id, checked: true });
      }

      if (!desiredChecked && currentlyChecked) {
        actions.push({ documentTypeId: requiredDoc.id, checked: false });
      }
    });

    try {
      for (const action of actions) {
        const ok = await setRequirementStatus(action.documentTypeId, action.checked, true);
        if (!ok) {
          return;
        }
      }

      setEditing(false);
      if (actions.length === 0) {
        setMessage('No changes to save.');
      } else {
        setMessage('Requirement checklist updated successfully.');
      }
      await loadDocuments(selectedEnrollmentId);
    } catch {
      // Errors are already handled inside verify/reject helpers.
    }
  };

  return (
    <main className="page-shell">
      <section className="enroll-card documents-shell">
        <h1>Requirement Validator</h1>
        <p>Verify and validate student enrollment documents.</p>

        {loadingDocuments && <p>Loading document records...</p>}
        {error && <p className="status error">{error}</p>}
        {message && <p className="status success">{message}</p>}

        <div className="validator-layout">
          <section className="student-list-panel">
            <h2>Student List</h2>
            <input
              type="text"
              placeholder="Search by LRN or Name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              disabled={loadingEnrollments}
            />

            <div className="student-list-scroll">
              {filteredEnrollments.map((item) => {
                const isSelected = Number(item.id) === Number(selectedEnrollmentId);

                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`student-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedEnrollmentId(String(item.id))}
                  >
                    <strong>{item.first_name} {item.last_name}</strong>
                    <span>LRN: {item.lrn}</span>
                    <span>Grade {item.grade_level}</span>
                    <span>School Year: {item.school_year || 'N/A'}</span>
                  </button>
                );
              })}
              {filteredEnrollments.length === 0 && <p className="doc-muted">No matching students found.</p>}
            </div>
          </section>

          <section className="validator-panel">
            {!selectedDocumentInfo && (
              <div className="empty-validator">
                <p>Select a student to review and validate submitted documents.</p>
              </div>
            )}

            {selectedDocumentInfo && (
              <>
                <header className="validator-header">
                  <div>
                    <h3>{selectedDocumentInfo.name}</h3>
                    <p>LRN: {selectedDocumentInfo.lrn}</p>
                    <p>Gender: {selectedDocumentInfo.gender}</p>
                  </div>
                  <span>Grade {selectedDocumentInfo.grade}</span>
                </header>

                <div className="verification-card">
                  <div className="verification-row student-row">
                    <span className="check-dot filled">✓</span>
                    <div>
                      <strong>{selectedDocumentInfo.name}</strong>
                      {statusSummary && <p>{statusSummary.verified}/{statusSummary.required} documents verified</p>}
                    </div>

                    {!editing && (
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={onEdit}
                        disabled={loadingDocuments || workingDocumentId !== null}
                      >
                        Edit
                      </button>
                    )}
                  </div>

                  <h4>Document Verification</h4>

                  <div className="verification-list">
                    {requiredDocuments.map((requiredDoc) => {
                      const existing = documentsByType.get(Number(requiredDoc.id));
                      const isChecked = Boolean(checkState[requiredDoc.id]);
                      const isMissing = !existing;

                      return (
                        <button
                          key={requiredDoc.id}
                          type="button"
                          className={`verification-row ${editing ? 'editable' : ''} ${isChecked ? 'checked' : ''}`}
                          onClick={() => onToggleCheck(requiredDoc.id)}
                          disabled={!editing || workingDocumentId !== null}
                          title={isMissing ? 'No submitted document record yet.' : requiredDoc.name}
                        >
                          <span className={`check-dot ${isChecked ? 'filled' : ''}`}>{isChecked ? '✓' : ''}</span>
                          <span>{requiredDoc.name}</span>
                          {isMissing && <span className="row-note">No record</span>}
                        </button>
                      );
                    })}
                  </div>

                  {editing && (
                    <div className="edit-actions">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={onCancelEdit}
                        disabled={workingDocumentId !== null}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="save-btn"
                        onClick={onSaveEdit}
                        disabled={workingDocumentId !== null}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default DocumentsPage;
