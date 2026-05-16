import { useEffect, useState } from 'react';
import api, { cancelAllRequests } from '../api/client';
import '../styles/base.css';
import '../styles/ReportsPage.css';

function ReportsPage() {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [schoolYear, setSchoolYear] = useState('2026-2027');
  const [sections, setSections] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSections = async () => {
      try {
        const { data } = await api.get('/api/dashboard/sections');
        setSections(data.sections || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load section list.');
      }
    };

    loadSections();

    // Cleanup: cancel requests when component unmounts
    return () => {
      cancelAllRequests();
    };
  }, []);

  const openReport = async (url) => {
    setError('');
    try {
      const { data } = await api.get(url, { responseType: 'text' });
      const reportWindow = window.open('', '_blank', 'width=980,height=750');
      if (!reportWindow) {
        setError('Please allow popups to view printable reports.');
        return;
      }
      reportWindow.document.open();
      reportWindow.document.write(data);
      reportWindow.document.close();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open report.');
    }
  };

  const openPdf = async (url) => {
    setError('');
    try {
      const { data } = await api.get(url, { responseType: 'blob' });
      const fileUrl = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to open PDF report.');
    }
  };

  const handleCoe = () => {
    if (!enrollmentId) {
      setError('Please input an enrollment ID for COE.');
      return;
    }
    openReport(`/api/reports/coe/${enrollmentId}`);
  };

  const handleCoePdf = () => {
    if (!enrollmentId) {
      setError('Please input an enrollment ID for COE.');
      return;
    }
    openPdf(`/api/reports/coe/${enrollmentId}/pdf`);
  };

  const handleSf1 = () => {
    if (!sectionId || !schoolYear) {
      setError('Please select a section and school year for SF1.');
      return;
    }
    openReport(`/api/reports/sf1?sectionId=${sectionId}&schoolYear=${encodeURIComponent(schoolYear)}`);
  };

  const handleSf1Pdf = () => {
    if (!sectionId || !schoolYear) {
      setError('Please select a section and school year for SF1.');
      return;
    }
    openPdf(`/api/reports/sf1/pdf?sectionId=${sectionId}&schoolYear=${encodeURIComponent(schoolYear)}`);
  };

  return (
    <main className="page-shell">
      <section className="enroll-card report-grid">
        <h1>Printable Reports</h1>
        <p>Generate and print official COE and SF1 reports.</p>

        <div className="report-card">
          <h2>COE</h2>
          <label htmlFor="enrollmentId">Enrollment ID</label>
          <input
            id="enrollmentId"
            value={enrollmentId}
            onChange={(event) => setEnrollmentId(event.target.value)}
            placeholder="e.g. 1"
          />
          <div className="report-actions">
            <button type="button" onClick={handleCoe}>Preview COE</button>
            <button type="button" onClick={handleCoePdf}>Export COE PDF</button>
          </div>
        </div>

        <div className="report-card">
          <h2>SF1</h2>
          <label htmlFor="sectionId">Section</label>
          <select id="sectionId" value={sectionId} onChange={(event) => setSectionId(event.target.value)}>
            <option value="">Select section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                G{section.grade_level} - {section.section_name}
              </option>
            ))}
          </select>

          <label htmlFor="schoolYear">School Year</label>
          <input
            id="schoolYear"
            value={schoolYear}
            onChange={(event) => setSchoolYear(event.target.value)}
            pattern="\\d{4}-\\d{4}"
          />

          <div className="report-actions">
            <button type="button" onClick={handleSf1}>Preview SF1</button>
            <button type="button" onClick={handleSf1Pdf}>Export SF1 PDF</button>
          </div>
        </div>

        {error && <p className="status error">{error}</p>}
      </section>
    </main>
  );
}

export default ReportsPage;
