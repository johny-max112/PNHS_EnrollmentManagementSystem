import { useEffect, useMemo, useState } from 'react';
import api, { cancelAllRequests } from '../api/client';
import '../styles/base.css';
import '../styles/SectionAssignmentPage.css';

const DEFAULT_SCHOOL_YEAR = '2026-2027';

function formatName(student) {
  if (!student) return '';
  const parts = [student.last_name, student.first_name].filter(Boolean).join(', ');
  return parts || student.first_name || student.last_name || 'Unknown Student';
}

function SectionAssignmentPage() {
  const [gradeLevel, setGradeLevel] = useState('7');
  const [program, setProgram] = useState('regular');
  const [schoolYear, setSchoolYear] = useState(DEFAULT_SCHOOL_YEAR);
  const [searchQuery, setSearchQuery] = useState('');

  const [queue, setQueue] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [reportStudents, setReportStudents] = useState([]);
  const [reportSection, setReportSection] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadQueue = async () => {
    const params = {
      gradeLevel,
      schoolYear,
    };

    if (program && program !== 'all') {
      params.program = program;
    }

    const { data } = await api.get('/api/section-assignment/queue', { params });
    setQueue(data.queue || []);
  };

  const loadSections = async () => {
    const params = {
      gradeLevel,
    };

    if (program && program !== 'all') {
      params.program = program;
    }

    const { data } = await api.get('/api/section-assignment/sections', { params });
    setSections(data.sections || []);
  };

  const loadReport = async (sectionId) => {
    if (!sectionId || !schoolYear) {
      setReportStudents([]);
      setReportSection(null);
      return;
    }

    const { data } = await api.get('/api/section-assignment/report', {
      params: { sectionId, schoolYear },
    });
    setReportStudents(data.students || []);
    setReportSection(data.section || null);
  };

  const refreshAll = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await Promise.all([loadQueue(), loadSections()]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load section assignment data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();

    return () => {
      cancelAllRequests();
    };
  }, [gradeLevel, program, schoolYear]);

  useEffect(() => {
    if (!selectedSectionId) {
      setReportStudents([]);
      setReportSection(null);
      return;
    }

    loadReport(selectedSectionId).catch((err) => {
      setError(err.response?.data?.message || 'Failed to load report data.');
    });
  }, [selectedSectionId, schoolYear]);

  const filteredQueue = useMemo(() => {
    if (!searchQuery.trim()) {
      return queue;
    }

    const query = searchQuery.toLowerCase();
    return queue.filter((item) => {
      const fullName = `${item.last_name} ${item.first_name}`.toLowerCase();
      return fullName.includes(query) || String(item.lrn || '').includes(query);
    });
  }, [queue, searchQuery]);

  const handleAssign = async () => {
    if (!selectedEnrollment || !selectedSectionId) {
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const payload = {
        enrollmentId: selectedEnrollment.enrollment_id,
        studentId: selectedEnrollment.student_id,
        sectionId: Number(selectedSectionId),
      };

      const { data } = await api.post('/api/section-assignment/assign', payload);
      setMessage(data.message || 'Section assignment saved.');
      await refreshAll();

      setSelectedEnrollment(null);
      setSelectedSectionId('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign section.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell section-assignment">
      <div className="section-assignment__header">
        <div>
          <h1>Section Assignment</h1>
          <p>Assign students to sections with capacity monitoring.</p>
        </div>

        <div className="section-assignment__filters">
          <select value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)}>
            <option value="2026-2027">2026-2027</option>
            <option value="2025-2026">2025-2026</option>
          </select>
          <select value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)}>
            {[7, 8, 9, 10].map((grade) => (
              <option key={grade} value={String(grade)}>
                Grade {grade}
              </option>
            ))}
          </select>
          <select value={program} onChange={(event) => setProgram(event.target.value)}>
            <option value="regular">Regular JHS</option>
            <option value="ste">STE Program</option>
            <option value="all">All Programs</option>
          </select>
          <button type="button" className="refresh-btn" onClick={refreshAll}>
            Refresh
          </button>
        </div>
      </div>

      {loading && <p className="status">Loading section assignment data...</p>}
      {error && <p className="status error">{error}</p>}
      {message && <p className="status success">{message}</p>}

      <div className="section-assignment__grid">
        <section className="section-card">
          <div className="section-card__header">
            <h2>Queue Filter</h2>
            <span className="queue-count">{filteredQueue.length} students</span>
          </div>

          <div className="queue-search">
            <input
              type="text"
              placeholder="Search by LRN or Name"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="queue-list">
            {filteredQueue.length === 0 && (
              <p className="empty-state">No verified students waiting for assignment.</p>
            )}
            {filteredQueue.map((item) => (
              <button
                key={item.enrollment_id}
                type="button"
                className={`queue-item ${
                  selectedEnrollment?.enrollment_id === item.enrollment_id ? 'active' : ''
                }`}
                onClick={() => setSelectedEnrollment(item)}
              >
                <div>
                  <div className="queue-name">{formatName(item)}</div>
                  <div className="queue-meta">LRN: {item.lrn || '—'}</div>
                  <div className="queue-meta">Grade {item.grade_level}</div>
                </div>
                <div className="queue-right">
                  <span className="queue-chip">{item.section_name || 'Unassigned'}</span>
                  <span className="queue-meta">{item.school_year}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="section-card">
          <div className="section-card__header">
            <h2>Live Capacity Tracking</h2>
          </div>

          <div className="section-grid">
            {sections.map((section) => {
              const remaining = Math.max(0, Number(section.remaining));
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`section-tile ${section.is_full ? 'full' : ''} ${
                    String(selectedSectionId) === String(section.id) ? 'active' : ''
                  }`}
                  onClick={() => setSelectedSectionId(String(section.id))}
                  disabled={section.is_full}
                >
                  <div>
                    <div className="section-title">{section.section_name}</div>
                    <div className="section-meta">Grade {section.grade_level}</div>
                  </div>
                  <div className="section-capacity">
                    <span>{section.current_enrolled} / {section.capacity}</span>
                    <span className="remaining">{remaining} slots left</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="assignment-summary">
            <div>
              <div className="summary-label">Selected Student</div>
              <div className="summary-value">
                {selectedEnrollment ? formatName(selectedEnrollment) : 'None'}
              </div>
            </div>
            <div>
              <div className="summary-label">Selected Section</div>
              <div className="summary-value">
                {selectedSectionId
                  ? sections.find((s) => String(s.id) === String(selectedSectionId))?.section_name ||
                    'Selected'
                  : 'None'}
              </div>
            </div>
            <button
              type="button"
              className="primary-btn"
              disabled={!selectedEnrollment || !selectedSectionId || loading}
              onClick={handleAssign}
            >
              Assign to Section
            </button>
          </div>

          <div className="report-panel">
            <div className="section-card__header">
              <h2>Section Student List</h2>
              {reportSection && (
                <span className="queue-chip">{reportSection.section_name}</span>
              )}
            </div>
            {selectedSectionId ? (
              <div className="report-list">
                {reportStudents.length === 0 && (
                  <p className="empty-state">No enrolled students for this section yet.</p>
                )}
                {reportStudents.map((student, index) => (
                  <div key={student.student_id} className="report-row">
                    <span>{index + 1}</span>
                    <span>{student.last_name}, {student.first_name}</span>
                    <span>{student.gender || '—'}</span>
                    <span>{student.lrn || '—'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-state">
                Select a section to preview the student list grouped by gender.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default SectionAssignmentPage;
