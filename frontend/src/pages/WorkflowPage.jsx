import { useEffect, useState } from 'react';
import api from '../api/client';

const statusOptions = ['pending', 'approved', 'enrolled', 'completed', 'cancelled'];

function WorkflowPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [applicationSubjects, setApplicationSubjects] = useState([]);
  const [applicationLogs, setApplicationLogs] = useState([]);

  const loadEnrollments = async () => {
    setLoading(true);
    setError('');

    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await api.get('/api/workflow', { params });
      setEnrollments(data.enrollments || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load workflow records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, [statusFilter]);

  const onStatusChange = async (enrollmentId, nextStatus) => {
    setMessage('');
    setError('');

    try {
      const { data } = await api.patch(`/api/workflow/${enrollmentId}/status`, {
        status: nextStatus,
        notes: `Updated in workflow screen to ${nextStatus}`,
      });
      setMessage(data.message);
      await loadEnrollments();
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed.');
    }
  };

  const openApplication = async (enrollmentId) => {
    setApplicationLoading(true);
    setError('');

    try {
      const { data } = await api.get(`/api/workflow/${enrollmentId}/application`);
      setSelectedApplication(data.application || null);
      setApplicationSubjects(data.subjects || []);
      setApplicationLogs(data.logs || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load application details.');
    } finally {
      setApplicationLoading(false);
    }
  };

  const closeApplication = () => {
    setSelectedApplication(null);
    setApplicationSubjects([]);
    setApplicationLogs([]);
  };

  return (
    <main className="page-shell">
      <section className="enroll-card">
        <h1>Enrollment Status Workflow</h1>
        <p>Review transactions and update lifecycle status.</p>

        <div className="workflow-controls">
          <label htmlFor="statusFilter">Filter by Status</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        {loading && <p>Loading records...</p>}
        {error && <p className="status error">{error}</p>}
        {message && <p className="status success">{message}</p>}

        <div className="table-wrap">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>LRN</th>
                <th>Student</th>
                <th>Grade</th>
                <th>Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((item) => (
                <tr key={item.id}>
                  <td>{item.lrn}</td>
                  <td>{item.last_name}, {item.first_name}</td>
                  <td>{item.grade_level}</td>
                  <td>{item.section_name}</td>
                  <td>{item.status}</td>
                  <td>
                    <div className="workflow-actions">
                      <select
                        defaultValue={item.status}
                        onChange={(event) => onStatusChange(item.id, event.target.value)}
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="workflow-view-btn"
                        onClick={() => openApplication(item.id)}
                        disabled={applicationLoading}
                      >
                        View Application
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedApplication && (
          <div className="application-modal-backdrop" onClick={closeApplication}>
            <article
              className="application-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="application-modal-header">
                <h2>Application Review</h2>
                <button type="button" className="application-close-btn" onClick={closeApplication}>
                  Close
                </button>
              </header>

              <section className="application-grid">
                <p><strong>LRN:</strong> {selectedApplication.lrn}</p>
                <p>
                  <strong>Student:</strong> {selectedApplication.last_name}, {selectedApplication.first_name}
                  {selectedApplication.middle_name ? ` ${selectedApplication.middle_name}` : ''}
                  {selectedApplication.suffix ? ` ${selectedApplication.suffix}` : ''}
                </p>
                <p><strong>Grade:</strong> {selectedApplication.grade_level}</p>
                <p><strong>Section:</strong> {selectedApplication.section_name}</p>
                <p><strong>Track:</strong> {selectedApplication.track_name || 'N/A'}</p>
                <p><strong>Strand:</strong> {selectedApplication.strand_name || 'N/A'}</p>
                <p><strong>School Year:</strong> {selectedApplication.school_year}</p>
                <p><strong>Current Status:</strong> {selectedApplication.status}</p>
              </section>

              <section className="application-block">
                <h3>Assigned Subjects</h3>
                {applicationSubjects.length === 0 && <p>No subjects found.</p>}
                {applicationSubjects.length > 0 && (
                  <ul className="application-subjects">
                    {applicationSubjects.map((subject) => (
                      <li key={subject.id}>
                        <strong>{subject.subject_code}</strong> - {subject.subject_name}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="application-block">
                <h3>Documents</h3>
                <p>No uploaded documents are stored in the current schema.</p>
              </section>

              <section className="application-block">
                <h3>Status Timeline</h3>
                {applicationLogs.length === 0 && <p>No status logs found.</p>}
                {applicationLogs.length > 0 && (
                  <ul className="application-logs">
                    {applicationLogs.map((log) => (
                      <li key={log.id}>
                        <strong>{log.new_status}</strong>
                        {log.old_status ? ` (from ${log.old_status})` : ''}
                        {' - '}
                        {new Date(log.changed_at).toLocaleString()}
                        {' - '}
                        {log.changed_by_name || 'System'}
                        {log.notes ? ` (${log.notes})` : ''}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </article>
          </div>
        )}
      </section>
    </main>
  );
}

export default WorkflowPage;
