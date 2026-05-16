import { useEffect, useMemo, useState } from 'react';
import api, { cancelAllRequests } from '../api/client';
import '../styles/base.css';
import '../styles/DashboardPage.css';

const filterOptions = [
  { key: '', label: 'All' },
  { key: 'enrolled', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
];

const statusOptions = ['pending', 'documents_pending', 'verified', 'enrolled', 'cancelled'];

const statusBadgeMap = {
  pending: { label: 'PENDING', className: 'status-pending' },
  documents_pending: { label: 'DOCS PENDING', className: 'status-docs-pending' },
  verified: { label: 'VERIFIED', className: 'status-verified' },
  enrolled: { label: 'APPROVED', className: 'status-approved' },
  cancelled: { label: 'CANCELLED', className: 'status-cancelled' },
};

function DashboardPage() {
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [filterKey, setFilterKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [schoolYears, setSchoolYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEnrollments = async (year = '') => {
    setLoading(true);
    setError('');

    try {
      const params = {};
      if (year) params.schoolYear = year;
      const { data } = await api.get('/api/dashboard', { params });
      setAllEnrollments(data.enrollments || []);

      // Populate school year options if not already present
      if (!year) {
        const years = Array.from(new Set((data.enrollments || []).map((r) => r.school_year))).sort().reverse();
        setSchoolYears(years);
        if (years.length > 0) setSelectedYear(years[0]);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load to populate school years and data
    loadEnrollments();

    // Cleanup: cancel requests when component unmounts
    return () => {
      cancelAllRequests();
    };
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      return;
    }

    // reload when selected year changes
    loadEnrollments(selectedYear);
  }, [selectedYear]);

  const filteredEnrollments = useMemo(() => {
    let result = allEnrollments;

    // Apply status filter
    if (filterKey) {
      result = result.filter((e) => e.status === filterKey);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((e) => {
        const lrnMatch = String(e.lrn).includes(query);
        const nameMatch = `${e.last_name} ${e.first_name}`.toLowerCase().includes(query);
        return lrnMatch || nameMatch;
      });
    }

    return result;
  }, [allEnrollments, filterKey, searchQuery]);

  const stats = useMemo(() => {
    const total = allEnrollments.length;
    const jhs = allEnrollments.filter((e) => Number(e.grade_level) >= 7 && Number(e.grade_level) <= 10).length;
    const pending = allEnrollments.filter((e) => e.status === 'pending' || e.status === 'documents_pending').length;
    return { total, jhs, pending };
  }, [allEnrollments]);

  const onStatusChange = async (enrollmentId, nextStatus) => {
    setMessage('');
    setError('');

    try {
      const { data } = await api.patch(`/api/dashboard/${enrollmentId}/status`, {
        status: nextStatus,
        notes: `Updated in dashboard screen to ${nextStatus}`,
      });
      setMessage(data.message);
      await loadEnrollments();
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  return (
    <main className="page-shell">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Overview of enrollment statistics for Pateros National High School</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Students</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">JHS Students</span>
          <span className="stat-value">{stats.jhs}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending Enrollments</span>
          <span className="stat-value">{stats.pending}</span>
        </div>
      </div>

      <section className="enroll-card">
        <div className="section-header">
          <div className="left-controls">
            <div className="year-filter">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="year-select"
              >
                <option value="">All Years</option>
                {schoolYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="filter-tabs">
              {filterOptions.map((option) => (
                <button
                  key={option.key}
                  className={`filter-tab small ${filterKey === option.key ? 'active' : ''}`}
                  onClick={() => setFilterKey(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="right-controls">
            <input
              type="text"
              className="search-bar"
              placeholder="Search by LRN or Name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>

        {loading && <p>Loading records...</p>}
        {error && <p className="status error">{error}</p>}
        {message && <p className="status success">{message}</p>}

        <div className="table-wrap">
          <table className="workflow-table">
            <thead>
              <tr>
                <th>LRN</th>
                <th>School Year</th>
                <th>Student Name</th>
                <th>Grade Level</th>
                <th>Section</th>
                <th>Enrollment Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollments.map((item) => {
                const badgeInfo = statusBadgeMap[item.status] || {
                  label: item.status?.toUpperCase(),
                  className: 'status-default',
                };
                return (
                  <tr key={item.id}>
                      <td className="lrn-cell">{item.lrn}</td>
                      <td className="school-year-cell">{item.school_year || '—'}</td>
                      <td>{item.last_name}, {item.first_name}</td>
                      <td>Grade {item.grade_level}</td>
                      <td>{item.section_name || '—'}</td>
                      <td>{formatDate(item.created_at)}</td>
                    <td>
                      <span className={`status-badge ${badgeInfo.className}`}>
                        {badgeInfo.label}
                      </span>
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

export default DashboardPage;
