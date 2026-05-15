import { useEffect, useMemo, useState, useRef } from 'react';
import api from '../api/client';
import '../styles/base.css';
import '../styles/SubjectAssignment.css';

const defaultForm = {
  lrn: '',
  firstName: '',
  lastName: '',
  middleName: '',
  suffix: '',
  dateOfBirth: '',
  age: '',
  gender: '',
  contactNumber: '',
  address: '',
  gradeLevel: '7',
  sectionId: '',
  schoolYear: '2026-2027',
};

function StudentEnrollmentPage() {
  const [formData, setFormData] = useState(defaultForm);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimer = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const { data } = await api.get('/api/enroll/meta');
        setSections(data.sections || []);
        setSubjects(data.subjects || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load enrollment options.');
      }
    };

    loadMeta();
  }, []);

  // lookup student by LRN or name (debounced)
  const lookupStudent = async (q) => {
    if (!q || q.trim().length === 0) return;
    try {
      const { data } = await api.get('/api/enroll/lookup', { params: { query: q } });
      if (data.student) {
        setFormData((prev) => ({
          ...prev,
          lrn: data.student.lrn || prev.lrn,
          firstName: data.student.first_name || prev.firstName,
          lastName: data.student.last_name || prev.lastName,
          middleName: data.student.middle_name || prev.middleName,
          suffix: data.student.suffix || prev.suffix,
          dateOfBirth: data.student.date_of_birth || prev.dateOfBirth,
          gender: data.student.gender || prev.gender,
          gradeLevel: data.student.grade_level ? String(data.student.grade_level) : prev.gradeLevel,
          sectionId: data.student.section_id ? String(data.student.section_id) : prev.sectionId,
          schoolYear: data.student.school_year || prev.schoolYear,
        }));
      }

      if (Array.isArray(data.subjects)) {
        setSubjects(data.subjects);
      }
    } catch (err) {
      console.error('Lookup error', err);
    }
  };

  const onSearchChange = (val) => {
    setSearchQuery(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      lookupStudent(val.trim());
    }, 350);
  };

  const filteredSections = useMemo(
    () => sections.filter((section) => String(section.grade_level) === String(formData.gradeLevel)),
    [sections, formData.gradeLevel]
  );

  const selectedSection = useMemo(
    () => filteredSections.find((section) => String(section.id) === String(formData.sectionId)) || null,
    [filteredSections, formData.sectionId]
  );

  const autoLoadedSubjects = useMemo(() => {
    const grade = Number(formData.gradeLevel);
    const strandId = selectedSection?.strand_id ?? null;

    return subjects.filter((subject) => {
      if (Number(subject.grade_level) !== grade) {
        return false;
      }

      if (strandId) {
        return subject.strand_id === null || Number(subject.strand_id) === Number(strandId);
      }

      return subject.strand_id === null;
    });
  }, [subjects, formData.gradeLevel, selectedSection]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        sectionId: Number(formData.sectionId),
      };

      const { data } = await api.post('/api/enroll', payload);
      setMessage(data.message || 'Student enrollment saved successfully.');
      setFormData(defaultForm);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save enrollment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell subject-assignment-shell">
      <div className="subject-assignment-container">
        <section className="subject-form-col">
          <div className="form-card">
            <div className="form-card-inner">
              <div className="form-header">
                <img src="/logo_pnhs.png" alt="PNHS logo" className="form-logo" />
                <div>
                  <h1>Subject Assignment</h1>
                  <p className="muted">PNHS Student Enrollment Form — School Year: {formData.schoolYear}</p>
                </div>
              </div>

              <div className="form-search">
                <input
                  placeholder="Search by LRN or Name"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                <select value={formData.gradeLevel} onChange={(e) => updateField('gradeLevel', e.target.value)}>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                  <option value="11">Grade 11</option>
                  <option value="12">Grade 12</option>
                </select>
              </div>

              <form onSubmit={handleSubmit} className="subject-form">
                <div className="two-col">
                  <div>
                    <label>School Year</label>
                    <input value={formData.schoolYear} onChange={(e) => updateField('schoolYear', e.target.value)} />
                  </div>
                  <div>
                    <label>LRN (Learner Reference Number)</label>
                    <input value={formData.lrn} onChange={(e) => updateField('lrn', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>First Name</label>
                    <input value={formData.firstName} onChange={(e) => updateField('firstName', e.target.value)} />
                  </div>
                  <div>
                    <label>Last Name</label>
                    <input value={formData.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>Extension Name (Jr., Sr.)</label>
                    <input value={formData.suffix} onChange={(e) => updateField('suffix', e.target.value)} />
                  </div>
                  <div>
                    <label>Age</label>
                    <input value={formData.age} onChange={(e) => updateField('age', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>Sex</label>
                    <select value={formData.gender} onChange={(e) => updateField('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label>Birthdate</label>
                    <input type="date" value={formData.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label>Place of Birth (Municipality/City)</label>
                  <input value={formData.address} onChange={(e) => updateField('address', e.target.value)} />
                </div>

                <div>
                  <label>Address</label>
                  <input value={formData.address} onChange={(e) => updateField('address', e.target.value)} />
                </div>

                <div>
                  <label>Grade Level / Section</label>
                  <select value={formData.sectionId} onChange={(e) => updateField('sectionId', e.target.value)}>
                    <option value="">Select section</option>
                    {filteredSections.map((section) => (
                      <option key={section.id} value={section.id}>
                        G{section.grade_level} - {section.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Assign Subject'}</button>
                  <button type="button" className="btn-secondary" onClick={() => { setFormData(defaultForm); setMessage(''); setError(''); }}>Clear</button>
                </div>
              </form>
            </div>
          </div>
        </section>

        <aside className="subject-preview-col">
          <div className="preview-card">
            <h3>Subject Preview</h3>
            <p className="muted">Select a grade level to view subjects</p>
            <div className="preview-list">
              {autoLoadedSubjects.length === 0 && <div className="muted">No subjects to preview.</div>}
              {autoLoadedSubjects.map((s) => (
                <div key={s.id} className="preview-item">{s.subject_name}</div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default StudentEnrollmentPage;