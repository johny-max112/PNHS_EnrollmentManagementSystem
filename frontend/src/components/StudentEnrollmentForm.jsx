import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const gradeOptions = [7, 8, 9, 10, 11, 12];

const schoolYearInputPattern = '\\d{4}\\s*[-–—]\\s*\\d{4}';

function normalizeSchoolYear(value = '') {
  return value
    .replace(/[–—−]/g, '-')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

function isValidSchoolYear(value) {
  const match = normalizeSchoolYear(value).match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return false;
  }

  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  return endYear === startYear + 1;
}

const defaultForm = {
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  gradeLevel: '',
  trackId: '',
  strandId: '',
  schoolYear: '2026-2027',
};

function StudentEnrollmentForm() {
  const [formData, setFormData] = useState(defaultForm);
  const [student, setStudent] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [strands, setStrands] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSHS = useMemo(() => Number(formData.gradeLevel) >= 11, [formData.gradeLevel]);

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const { data } = await api.get('/api/student-auth/me');
        setStudent(data.student);
        setFormData((prev) => ({
          ...prev,
          firstName: data.student.first_name || '',
          lastName: data.student.last_name || '',
          middleName: data.student.middle_name || '',
          suffix: data.student.suffix || '',
        }));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load student profile.');
      }
    };

    loadStudent();
  }, []);

  const loadMetadata = async (params) => {
    setLoadingMeta(true);
    setError('');

    try {
      const { data } = await api.get('/api/student/enrollment/meta', { params });
      setTracks(data.tracks || []);
      setStrands(data.strands || []);
      setSubjects(data.subjects || []);
    } catch (err) {
      setTracks([]);
      setStrands([]);
      setSubjects([]);
      setError(err.response?.data?.message || 'Failed to load grade-level options.');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    const gradeLevel = Number(formData.gradeLevel);
    if (!gradeLevel) {
      setTracks([]);
      setStrands([]);
      setSubjects([]);
      return;
    }

    const query = { gradeLevel };
    if (isSHS && formData.trackId) {
      query.trackId = formData.trackId;
    }
    if (isSHS && formData.strandId) {
      query.strandId = formData.strandId;
    }

    loadMetadata(query);
  }, [formData.gradeLevel, formData.trackId, formData.strandId, isSHS]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === 'gradeLevel') {
      const nextIsSHS = Number(value) >= 11;
      setFormData((prev) => ({
        ...prev,
        gradeLevel: value,
        trackId: nextIsSHS ? prev.trackId : '',
        strandId: nextIsSHS ? prev.strandId : '',
      }));
      return;
    }

    if (name === 'trackId') {
      setFormData((prev) => ({
        ...prev,
        trackId: value,
        strandId: '',
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSchoolYearBlur = () => {
    setFormData((prev) => ({
      ...prev,
      schoolYear: normalizeSchoolYear(prev.schoolYear),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    const normalizedSchoolYear = normalizeSchoolYear(formData.schoolYear);
    if (!isValidSchoolYear(normalizedSchoolYear)) {
      setError('School year must be in YYYY-YYYY format, and the second year must be the next year.');
      setSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        gradeLevel: Number(formData.gradeLevel),
        trackId: formData.trackId ? Number(formData.trackId) : null,
        strandId: formData.strandId ? Number(formData.strandId) : null,
        schoolYear: normalizedSchoolYear,
      };

      const { data } = await api.post('/api/student/enrollment', payload);
      setSuccess(
        `${data.message} Assigned section: ${data.assignedSection}. Enrollment ID: ${data.enrollmentId}`
      );
      setFormData((prev) => ({
        ...defaultForm,
        firstName: prev.firstName,
        lastName: prev.lastName,
        middleName: prev.middleName,
        suffix: prev.suffix,
      }));
      setTracks([]);
      setStrands([]);
      setSubjects([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="enroll-layout">
      <form className="enroll-card" onSubmit={handleSubmit}>
        <h1>Student Enrollment</h1>
        <p>Submit your enrollment application. Section assignment is automatic.</p>

        <label htmlFor="studentLrn">LRN</label>
        <input id="studentLrn" type="text" value={student?.lrn || ''} disabled readOnly />

        <label htmlFor="firstName">First Name</label>
        <input id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />

        <label htmlFor="lastName">Last Name</label>
        <input id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />

        <label htmlFor="middleName">Middle Name</label>
        <input id="middleName" name="middleName" value={formData.middleName} onChange={handleChange} />

        <label htmlFor="suffix">Suffix</label>
        <input id="suffix" name="suffix" value={formData.suffix} onChange={handleChange} />

        <label htmlFor="gradeLevel">Grade Level</label>
        <select id="gradeLevel" name="gradeLevel" value={formData.gradeLevel} onChange={handleChange} required>
          <option value="">Select grade level</option>
          {gradeOptions.map((grade) => (
            <option key={grade} value={grade}>
              Grade {grade}
            </option>
          ))}
        </select>

        {isSHS && (
          <>
            <label htmlFor="trackId">Track</label>
            <select id="trackId" name="trackId" value={formData.trackId} onChange={handleChange} required>
              <option value="">Select track</option>
              {tracks.map((track) => (
                <option key={track.id} value={track.id}>
                  {track.track_name}
                </option>
              ))}
            </select>

            <label htmlFor="strandId">Strand</label>
            <select
              id="strandId"
              name="strandId"
              value={formData.strandId}
              onChange={handleChange}
              required
              disabled={!formData.trackId}
            >
              <option value="">Select strand</option>
              {strands.map((strand) => (
                <option key={strand.id} value={strand.id}>
                  {strand.strand_name}
                </option>
              ))}
            </select>
          </>
        )}

        <label htmlFor="schoolYear">School Year</label>
        <input
          id="schoolYear"
          name="schoolYear"
          type="text"
          pattern={schoolYearInputPattern}
          title="Use format YYYY-YYYY (example: 2026-2027)."
          value={formData.schoolYear}
          onChange={handleChange}
          onBlur={handleSchoolYearBlur}
          required
        />

        <button type="submit" disabled={submitting || loadingMeta}>
          {submitting ? 'Submitting...' : 'Submit Enrollment'}
        </button>

        {error && <p className="status error">{error}</p>}
        {success && <p className="status success">{success}</p>}
      </form>

      <aside className="subject-card">
        <h2>Loaded Subjects</h2>
        {!formData.gradeLevel && <p>Select a grade level to load subjects.</p>}
        {formData.gradeLevel && subjects.length === 0 && <p>No subjects configured yet.</p>}
        {subjects.length > 0 && (
          <ul>
            {subjects.map((subject) => (
              <li key={subject.id}>
                <span>{subject.subject_code}</span>
                <small>{subject.subject_name}</small>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}

export default StudentEnrollmentForm;
