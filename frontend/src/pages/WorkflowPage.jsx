import { useEffect, useState } from 'react';
import api from '../api/client';
import '../styles/base.css';
import '../styles/WorkflowPage.css';

const statusOptions = ['pending', 'documents_pending', 'verified', 'enrolled', 'cancelled'];

function WorkflowPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  return (
    <main className="page-shell">
      <section className="enroll-card">
        <h1>Enrollment Status Workflow</h1>
        <p>Review enrollment records and update lifecycle status.</p>

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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default WorkflowPage;
