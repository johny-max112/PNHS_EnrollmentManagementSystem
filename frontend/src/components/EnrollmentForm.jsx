import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const initialForm = {
  lrn: '',
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  gradeLevel: '7',
  trackId: '',
  strandId: '',
  sectionId: '',
  schoolYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
};

function EnrollmentForm() {
  const [formData, setFormData] = useState(initialForm);
  const [tracks, setTracks] = useState([]);
  const [strands, setStrands] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isSHS = useMemo(() => Number(formData.gradeLevel) >= 11, [formData.gradeLevel]);

  const updateField = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const loadMetadata = async (gradeLevel, trackId, strandId) => {
    if (!gradeLevel) {
      return;
    }

    setLoadingMeta(true);
    setError('');

    try {
      const params = { gradeLevel: Number(gradeLevel) };

      if (trackId) {
        params.trackId = Number(trackId);
      }

      if (strandId) {
        params.strandId = Number(strandId);
      }

      const { data } = await api.get('/api/enroll/meta', { params });
      setTracks(data.tracks || []);
      setStrands(data.strands || []);
      setSections(data.sections || []);
      setSubjects(data.subjects || []);
    } catch (err) {
      setTracks([]);
      setStrands([]);
      setSections([]);
      setSubjects([]);
      setError(err.response?.data?.message || 'Failed to load enrollment options.');
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    const gradeLevel = formData.gradeLevel;
    const trackId = isSHS ? formData.trackId : '';
    const strandId = isSHS ? formData.strandId : '';

    loadMetadata(gradeLevel, trackId, strandId);
  }, [formData.gradeLevel, formData.trackId, formData.strandId, isSHS]);

  const onGradeChange = (value) => {
    const nextIsSHS = Number(value) >= 11;

    setFormData((prev) => ({
      ...prev,
      gradeLevel: value,
      trackId: nextIsSHS ? prev.trackId : '',
      strandId: nextIsSHS ? prev.strandId : '',
      sectionId: '',
    }));

    setMessage('');
    setError('');
  };

  const onTrackChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      trackId: value,
      strandId: '',
      sectionId: '',
    }));

    setMessage('');
    setError('');
  };

  const onStrandChange = (value) => {
    setFormData((prev) => ({
      ...prev,
      strandId: value,
      sectionId: '',
    }));

    setMessage('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (!/^\d{12}$/.test(formData.lrn.trim())) {
      setError('LRN must be exactly 12 digits.');
      return;
    }

    if (isSHS && (!formData.trackId || !formData.strandId)) {
      setError('Track and strand are required for Grades 11 and 12.');
      return;
    }

    if (!formData.sectionId) {
      setError('Please select an available section.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        lrn: formData.lrn.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        middleName: formData.middleName.trim() || null,
        suffix: formData.suffix.trim() || null,
        gradeLevel: Number(formData.gradeLevel),
        trackId: formData.trackId ? Number(formData.trackId) : null,
        strandId: formData.strandId ? Number(formData.strandId) : null,
        sectionId: Number(formData.sectionId),
        schoolYear: formData.schoolYear.trim(),
      };

      const { data } = await api.post('/api/enroll', payload);

      setMessage(data.message || 'Enrollment submitted successfully.');
      setFormData((prev) => ({
        ...initialForm,
        schoolYear: prev.schoolYear,
      }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit enrollment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="enroll-card enrollment-layout">
      <h1>Student Enrollment</h1>
      <p>Register learners and assign them to the correct grade and section.</p>

      <form className="enrollment-form" onSubmit={handleSubmit}>
        <div className="enrollment-grid">
          <div className="field-block">
            <label htmlFor="lrn">LRN</label>
            <input
              id="lrn"
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={formData.lrn}
              onChange={(event) => updateField('lrn', event.target.value.replace(/\D/g, ''))}
              placeholder="12-digit learner reference number"
              required
            />
          </div>

          <div className="field-block">
            <label htmlFor="schoolYear">School Year</label>
            <input
              id="schoolYear"
              type="text"
              value={formData.schoolYear}
              onChange={(event) => updateField('schoolYear', event.target.value)}
              placeholder="e.g. 2026-2027"
              required
            />
          </div>

          <div className="field-block">
            <label htmlFor="lastName">Last Name</label>
            <input
              id="lastName"
              type="text"
              value={formData.lastName}
              onChange={(event) => updateField('lastName', event.target.value)}
              required
            />
          </div>

          <div className="field-block">
            <label htmlFor="firstName">First Name</label>
            <input
              id="firstName"
              type="text"
              value={formData.firstName}
              onChange={(event) => updateField('firstName', event.target.value)}
              required
            />
          </div>

          <div className="field-block">
            <label htmlFor="middleName">Middle Name</label>
            <input
              id="middleName"
              type="text"
              value={formData.middleName}
              onChange={(event) => updateField('middleName', event.target.value)}
            />
          </div>

          <div className="field-block">
            <label htmlFor="suffix">Suffix</label>
            <input
              id="suffix"
              type="text"
              value={formData.suffix}
              onChange={(event) => updateField('suffix', event.target.value)}
              placeholder="Jr., III, etc."
            />
          </div>

          <div className="field-block">
            <label htmlFor="gradeLevel">Grade Level</label>
            <select
              id="gradeLevel"
              value={formData.gradeLevel}
              onChange={(event) => onGradeChange(event.target.value)}
            >
              {[7, 8, 9, 10, 11, 12].map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>

          {isSHS && (
            <>
              <div className="field-block">
                <label htmlFor="trackId">Track</label>
                <select
                  id="trackId"
                  value={formData.trackId}
                  onChange={(event) => onTrackChange(event.target.value)}
                  required
                >
                  <option value="">Select track</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id}>
                      {track.track_name} ({track.track_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-block">
                <label htmlFor="strandId">Strand</label>
                <select
                  id="strandId"
                  value={formData.strandId}
                  onChange={(event) => onStrandChange(event.target.value)}
                  required
                  disabled={!formData.trackId}
                >
                  <option value="">Select strand</option>
                  {strands.map((strand) => (
                    <option key={strand.id} value={strand.id}>
                      {strand.strand_name} ({strand.strand_code})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="field-block field-block-wide">
            <label htmlFor="sectionId">Section</label>
            <select
              id="sectionId"
              value={formData.sectionId}
              onChange={(event) => updateField('sectionId', event.target.value)}
              required
              disabled={sections.length === 0}
            >
              <option value="">{loadingMeta ? 'Loading sections...' : 'Select section'}</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.section_name} (capacity: {section.current_enrolled}/{section.capacity})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="enrollment-footer">
          <button type="submit" disabled={submitting || loadingMeta}>
            {submitting ? 'Submitting...' : 'Submit Enrollment'}
          </button>
          <span className="meta-note">Subjects configured: {subjects.length}</span>
        </div>

        {error && <p className="status error">{error}</p>}
        {message && <p className="status success">{message}</p>}
      </form>
    </section>
  );
}

export default EnrollmentForm;
