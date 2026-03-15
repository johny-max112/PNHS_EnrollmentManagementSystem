import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

function StudentDashboardPage() {
  const [enrollment, setEnrollment] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentEnrollment = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/api/student/enrollment/current');
        setEnrollment(data.enrollment);
        setSubjects(data.subjects || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load current enrollment.');
      } finally {
        setLoading(false);
      }
    };

    loadCurrentEnrollment();
  }, []);

  const openReport = async (url, responseType) => {
    setError('');
    try {
      const { data } = await api.get(url, { responseType });
      if (responseType === 'text') {
        const reportWindow = window.open('', '_blank', 'width=980,height=750');
        if (!reportWindow) {
          setError('Please allow popups to view your COE.');
          return;
        }
        reportWindow.document.open();
        reportWindow.document.write(data);
        reportWindow.document.close();
        return;
      }

      const fileUrl = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open report.');
    }
  };

  return (
    <main className="page-shell">
      <section className="enroll-card report-grid">
        <h1>Student Dashboard</h1>
        <p>View your enrollment status, assigned section, subjects, and COE.</p>

        {loading && <p>Loading your enrollment...</p>}
        {error && <p className="status error">{error}</p>}

        {!loading && !enrollment && (
          <div className="report-card">
            <h2>No Enrollment Yet</h2>
            <p>You have not submitted an enrollment application yet.</p>
            <Link className="inline-link" to="/student/enrollment">
              Start Enrollment
            </Link>
          </div>
        )}

        {enrollment && (
          <>
            <div className="report-card">
              <h2>Current Status</h2>
              <p><strong>Status:</strong> {enrollment.status}</p>
              <p><strong>School Year:</strong> {enrollment.school_year}</p>
              <p><strong>Grade Level:</strong> {enrollment.grade_level}</p>
              <p><strong>Track:</strong> {enrollment.track_name || 'N/A'}</p>
              <p><strong>Strand:</strong> {enrollment.strand_name || 'N/A'}</p>
              <p><strong>Assigned Section:</strong> {enrollment.section_name}</p>
            </div>

            <div className="report-card">
              <h2>Assigned Subjects</h2>
              {subjects.length === 0 && <p>No subjects assigned yet.</p>}
              {subjects.length > 0 && (
                <ul className="subject-list-compact">
                  {subjects.map((subject) => (
                    <li key={subject.id}>
                      <span>{subject.subject_code}</span>
                      <small>{subject.subject_name}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="report-card">
              <h2>Certificate of Enrollment</h2>
              <div className="report-actions">
                <button type="button" onClick={() => openReport('/api/student/reports/coe', 'text')}>
                  View COE
                </button>
                <button type="button" onClick={() => openReport('/api/student/reports/coe/pdf', 'blob')}>
                  Download COE PDF
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default StudentDashboardPage;
