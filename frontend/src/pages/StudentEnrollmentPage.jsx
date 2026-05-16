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
  religion: '',
  placeOfBirth: '',
  houseStreet: '',
  barangay: '',
  municipality: '',
  address: '',
  gradeLevel: '7',
  sectionId: '',
  schoolYear: '2026-2027',

  // Parents / guardians
  fatherLastName: '',
  fatherFirstName: '',
  fatherMiddleName: '',
  fatherSuffix: '',
  fatherContact: '',

  guardianLastName: '',
  guardianFirstName: '',
  guardianMiddleName: '',
  guardianSuffix: '',
  guardianContact: '',

  // Special needs / PWD
  specialNeeds: false,
  specialNeedsOption: '',
  diagnosisA: '',
  diagnosisB: '',
  pwdId: false,

  // Returning / transfer
  returningLearner: false,
  lastGradeLevelCompleted: '',
  lastSchoolYearCompleted: '',
  lastSchoolAttended: '',
  lastSchoolId: '',

  // Distance learning preferences
  distance_blended: false,
  distance_etv: false,
  distance_other: false,
};

const toDateInputValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    const datePart = value.split('T')[0];
    return datePart || '';
  }

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

function StudentEnrollmentPage() {
  const [formData, setFormData] = useState(defaultForm);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedPreviewSubjects, setSelectedPreviewSubjects] = useState([]);
  const [assignmentSummary, setAssignmentSummary] = useState(null);
  const [viewMode, setViewMode] = useState('form');
  const [searchQuery, setSearchQuery] = useState('');
  const searchTimer = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
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

  const getPreviewSubjectsForStudent = (student) => {
    if (!student?.grade_level) {
      return [];
    }

    const grade = Number(student.grade_level);
    const studentSection = student.section_id
      ? sections.find((section) => String(section.id) === String(student.section_id)) || null
      : null;
    const strandId = studentSection?.strand_id ?? null;

    const filtered = subjects.filter((subject) => {
      if (Number(subject.grade_level) !== grade) {
        return false;
      }

      if (strandId) {
        return subject.strand_id === null || Number(subject.strand_id) === Number(strandId);
      }

      return subject.strand_id === null;
    });

    const unique = new Map();
    filtered.forEach((subject) => {
      const key = (subject.subject_code || subject.subject_name || '').toLowerCase().trim();
      if (!key) return;
      if (!unique.has(key)) {
        unique.set(key, subject);
      }
    });

    return Array.from(unique.values());
  };

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
          dateOfBirth: toDateInputValue(data.student.date_of_birth) || prev.dateOfBirth,
          age:
            data.student.age !== undefined && data.student.age !== null
              ? String(data.student.age)
              : prev.age,
          gender: data.student.gender || prev.gender,
          contactNumber: data.student.contact_number || prev.contactNumber,
          religion: data.student.religion || prev.religion,
          placeOfBirth: data.student.place_of_birth || prev.placeOfBirth,
          houseStreet: data.student.house_street || prev.houseStreet,
          barangay: data.student.barangay || prev.barangay,
          municipality: data.student.municipality || prev.municipality,
          address: data.student.address || prev.address,
          gradeLevel: data.student.grade_level ? String(data.student.grade_level) : prev.gradeLevel,
          sectionId: data.student.section_id ? String(data.student.section_id) : prev.sectionId,
          schoolYear: data.student.school_year || prev.schoolYear,
          fatherLastName: data.student.father_last_name || prev.fatherLastName,
          fatherFirstName: data.student.father_first_name || prev.fatherFirstName,
          fatherMiddleName: data.student.father_middle_name || prev.fatherMiddleName,
          fatherSuffix: data.student.father_suffix || prev.fatherSuffix,
          fatherContact: data.student.father_contact || prev.fatherContact,
          guardianLastName: data.student.guardian_last_name || prev.guardianLastName,
          guardianFirstName: data.student.guardian_first_name || prev.guardianFirstName,
          guardianMiddleName: data.student.guardian_middle_name || prev.guardianMiddleName,
          guardianSuffix: data.student.guardian_suffix || prev.guardianSuffix,
          guardianContact: data.student.guardian_contact || prev.guardianContact,
          specialNeeds: Boolean(data.student.special_needs_program),
          specialNeedsOption: data.student.special_needs_option || prev.specialNeedsOption,
          diagnosisA: data.student.diagnosis_a || prev.diagnosisA,
          diagnosisB: data.student.diagnosis_b || prev.diagnosisB,
          pwdId: Boolean(data.student.pwd_id),
          returningLearner: Boolean(data.student.returning_learner),
          lastGradeLevelCompleted:
            data.student.last_grade_level_completed !== undefined &&
            data.student.last_grade_level_completed !== null
              ? String(data.student.last_grade_level_completed)
              : prev.lastGradeLevelCompleted,
          lastSchoolYearCompleted: data.student.last_school_year_completed || prev.lastSchoolYearCompleted,
          lastSchoolAttended: data.student.last_school_attended || prev.lastSchoolAttended,
          lastSchoolId: data.student.last_school_id || prev.lastSchoolId,
          distance_blended: Boolean(data.student.distance_blended),
          distance_etv: Boolean(data.student.distance_etv),
          distance_other: Boolean(data.student.distance_other),
        }));
      }

      return data;
    } catch (err) {
      console.error('Lookup error', err);
      return null;
    }
  };

  const searchSuggestions = async (q) => {
    if (!q || q.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    try {
      const { data } = await api.get('/api/enroll/search', { params: { query: q } });
      setSuggestions(data.students || []);
    } catch (err) {
      console.error('search suggestions failed', err);
      setSuggestions([]);
    }
  };

  const onSearchChange = (val) => {
    setSearchQuery(val);
    setSelectedStudent(null);
    setSelectedPreviewSubjects([]);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      searchSuggestions(val.trim());
    }, 250);
  };

  const selectSuggestion = async (student) => {
    const display = `${student.last_name}, ${student.first_name}${student.middle_name ? ' ' + student.middle_name : ''}`;
    setSearchQuery(display);
    setSuggestions([]);
    // prefer LRN lookup if available
    const lookupResult = student.lrn
      ? await lookupStudent(student.lrn)
      : await lookupStudent(`${student.first_name} ${student.last_name}`);

    const lookupStudentData = lookupResult?.student || student;
    setSelectedStudent(lookupStudentData);
  };

  const filteredSections = useMemo(
    () => sections.filter((section) => String(section.grade_level) === String(formData.gradeLevel)),
    [sections, formData.gradeLevel]
  );

  useEffect(() => {
    if (!selectedStudent) {
      setSelectedPreviewSubjects([]);
      return;
    }

    const previewSubjects = getPreviewSubjectsForStudent(selectedStudent);
    setSelectedPreviewSubjects(previewSubjects);
  }, [selectedStudent, sections, subjects]);

  const updateField = (field, value) => {
    setFormData((prev) => {
      if (field === 'gradeLevel') {
        return { ...prev, gradeLevel: value, sectionId: '' };
      }

      return { ...prev, [field]: value };
    });

    if (field === 'gradeLevel' || field === 'sectionId') {
      setSelectedPreviewSubjects([]);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    if (!formData.sectionId) {
      setError('Please select a section before submitting.');
      setLoading(false);
      return;
    }

    try {
      const sectionMatch = sections.find((section) => String(section.id) === String(formData.sectionId)) || null;
      const fullName = [formData.lastName, formData.firstName, formData.middleName]
        .filter(Boolean)
        .join(', ');
      const displayName = formData.suffix ? `${fullName} ${formData.suffix}` : fullName;
      const payload = {
        ...formData,
        sectionId: Number(formData.sectionId),
      };

      const { data } = await api.post('/api/enroll', payload);
      setMessage(data.message || 'Student enrollment saved successfully.');
      setAssignmentSummary({
        lrn: formData.lrn,
        name: displayName,
        gradeLevel: formData.gradeLevel,
        sectionName: sectionMatch ? sectionMatch.section_name : null,
        schoolYear: formData.schoolYear,
        subjects: selectedPreviewSubjects,
      });
      setViewMode('summary');
      setFormData(defaultForm);
      setSelectedStudent(null);
      setSelectedPreviewSubjects([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save enrollment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell subject-assignment-shell">
      {viewMode === 'summary' && assignmentSummary ? (
        <section className="summary-screen">
          <div className="summary-hero">
            <div>
              <div className="summary-hero-title">Assignment Submitted</div>
              <div className="summary-hero-sub">Student subject assignment has been saved successfully.</div>
            </div>
            <button
              type="button"
              className="summary-action"
              onClick={() => {
                setAssignmentSummary(null);
                setMessage('');
                setError('');
                setSearchQuery('');
                setSuggestions([]);
                setViewMode('form');
              }}
            >
              New Assignment
            </button>
          </div>

          <div className="summary-body">
            <div className="summary-panel">
              <div className="summary-title">Student Details</div>
              <div className="summary-grid">
                <div>
                  <span className="summary-label">Student</span>
                  <span className="summary-value">{assignmentSummary.name || '—'}</span>
                </div>
                <div>
                  <span className="summary-label">LRN</span>
                  <span className="summary-value">{assignmentSummary.lrn || '—'}</span>
                </div>
                <div>
                  <span className="summary-label">Grade / Section</span>
                  <span className="summary-value">
                    G{assignmentSummary.gradeLevel}{assignmentSummary.sectionName ? ` - ${assignmentSummary.sectionName}` : ''}
                  </span>
                </div>
                <div>
                  <span className="summary-label">School Year</span>
                  <span className="summary-value">{assignmentSummary.schoolYear || '—'}</span>
                </div>
              </div>
            </div>

            <div className="summary-panel">
              <div className="summary-title">Subjects Assigned</div>
              {assignmentSummary.subjects.length > 0 ? (
                <ul className="summary-subject-list">
                  {assignmentSummary.subjects.map((subject) => (
                    <li key={subject.id}>
                      {subject.subject_code ? `${subject.subject_code} — ` : ''}{subject.subject_name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No subjects listed.</p>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="subject-assignment-container">
          <section className="subject-form-col">
            <div className="form-card">
              <div className="form-card-inner">
                <div className="form-top">
                  <div className="subject-assign-row">
                    <div className="subject-label">Subject Assignment</div>
                    <div className="subject-input">
                      <div className="suggestions search-suggestions">
                        <input
                          value={searchQuery}
                          placeholder="123456789012"
                          onChange={(e) => onSearchChange(e.target.value)}
                          aria-label="Search student by name or LRN"
                        />
                        {suggestions.length > 0 && (
                          <ul className="suggestions-list">
                            {suggestions.map((s) => (
                              <li
                                key={s.id}
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  selectSuggestion(s);
                                }}
                              >
                                {s.lrn ? `${s.lrn} — ` : ''}{s.last_name}, {s.first_name}{s.middle_name ? ' ' + s.middle_name : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-branding">
                    <img src="/logo_pnhs.png" alt="PNHS logo" className="center-logo" />
                    <div className="branding-text">
                      <div className="branding-title">PNHS Student Enrollment Form</div>
                      <div className="branding-sub">Pateros National High School - San Pedro, Pateros</div>
                      <div className="branding-year">School Year: {formData.schoolYear}</div>
                    </div>
                  </div>
                </div>

                <div className="form-search">
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
                  <input value={formData.placeOfBirth} onChange={(e) => updateField('placeOfBirth', e.target.value)} />
                </div>

                <div className="two-col">
                  <div>
                    <label>House No / Street</label>
                    <input value={formData.houseStreet} onChange={(e) => updateField('houseStreet', e.target.value)} />
                  </div>
                  <div>
                    <label>Barangay</label>
                    <input value={formData.barangay} onChange={(e) => updateField('barangay', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label>Municipality/City</label>
                  <input value={formData.municipality} onChange={(e) => updateField('municipality', e.target.value)} />
                </div>

                <div>
                  <label>Religion</label>
                  <input value={formData.religion} onChange={(e) => updateField('religion', e.target.value)} />
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

                <hr />

                <h3>Parent / Guardian Information</h3>

                <div className="two-col">
                  <div>
                    <label>Father's Last Name</label>
                    <input value={formData.fatherLastName} onChange={(e) => updateField('fatherLastName', e.target.value)} />
                  </div>
                  <div>
                    <label>Father's First Name</label>
                    <input value={formData.fatherFirstName} onChange={(e) => updateField('fatherFirstName', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>Father's Middle Name</label>
                    <input value={formData.fatherMiddleName} onChange={(e) => updateField('fatherMiddleName', e.target.value)} />
                  </div>
                  <div>
                    <label>Extension (Jr., Sr., III)</label>
                    <input value={formData.fatherSuffix} onChange={(e) => updateField('fatherSuffix', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label>Father's Contact Number</label>
                  <input value={formData.fatherContact} onChange={(e) => updateField('fatherContact', e.target.value)} />
                </div>

                <h3>Legal Guardian (if not living with parents)</h3>

                <div className="two-col">
                  <div>
                    <label>Guardian Last Name</label>
                    <input value={formData.guardianLastName} onChange={(e) => updateField('guardianLastName', e.target.value)} />
                  </div>
                  <div>
                    <label>Guardian First Name</label>
                    <input value={formData.guardianFirstName} onChange={(e) => updateField('guardianFirstName', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>Guardian Middle Name</label>
                    <input value={formData.guardianMiddleName} onChange={(e) => updateField('guardianMiddleName', e.target.value)} />
                  </div>
                  <div>
                    <label>Extension</label>
                    <input value={formData.guardianSuffix} onChange={(e) => updateField('guardianSuffix', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label>Guardian Contact Number</label>
                  <input value={formData.guardianContact} onChange={(e) => updateField('guardianContact', e.target.value)} />
                </div>

                <h3>Special Needs / PWD</h3>

                <div className="two-col">
                  <div>
                    <label>Is learner under special needs program?</label>
                    <select value={formData.specialNeedsOption} onChange={(e) => updateField('specialNeedsOption', e.target.value)}>
                      <option value="">Select</option>
                      <option value="no">No</option>
                      <option value="a1">A1 - With Diagnosis from Licensed Medical Specialist (A1)</option>
                      <option value="a2">A2 - With Diagnosis from Licensed Medical Specialist (A2)</option>
                    </select>
                  </div>
                  <div>
                    <label>Diagnosis (A1)</label>
                    <input value={formData.diagnosisA} onChange={(e) => updateField('diagnosisA', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>Diagnosis (A2)</label>
                    <input value={formData.diagnosisB} onChange={(e) => updateField('diagnosisB', e.target.value)} />
                  </div>
                  <div>
                    <label>Has PWD ID?</label>
                    <select value={formData.pwdId ? 'yes' : 'no'} onChange={(e) => updateField('pwdId', e.target.value === 'yes')}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                <h3>Returning / Transfer Learner</h3>

                <div className="two-col">
                  <div>
                    <label>Last Grade Level Completed</label>
                    <input value={formData.lastGradeLevelCompleted} onChange={(e) => updateField('lastGradeLevelCompleted', e.target.value)} />
                  </div>
                  <div>
                    <label>Last School Year Completed</label>
                    <input value={formData.lastSchoolYearCompleted} onChange={(e) => updateField('lastSchoolYearCompleted', e.target.value)} />
                  </div>
                </div>

                <div className="two-col">
                  <div>
                    <label>Last School Attended</label>
                    <input value={formData.lastSchoolAttended} onChange={(e) => updateField('lastSchoolAttended', e.target.value)} />
                  </div>
                  <div>
                    <label>Last School ID</label>
                    <input value={formData.lastSchoolId} onChange={(e) => updateField('lastSchoolId', e.target.value)} />
                  </div>
                </div>

                <h3>Distance Learning Preferences</h3>

                <div className="two-col">
                  <div>
                    <label><input type="checkbox" checked={formData.distance_blended} onChange={(e) => updateField('distance_blended', e.target.checked)} /> Blended (Combination)</label>
                  </div>
                  <div>
                    <label><input type="checkbox" checked={formData.distance_etv} onChange={(e) => updateField('distance_etv', e.target.checked)} /> Educational Television</label>
                  </div>
                </div>

                <div>
                  <label><input type="checkbox" checked={formData.distance_other} onChange={(e) => updateField('distance_other', e.target.checked)} /> Other / Combination</label>
                </div>

                  <div className="form-actions">
                    <button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Assign Subject'}</button>
                    <button type="button" className="btn-secondary" onClick={() => { setFormData(defaultForm); setSearchQuery(''); setSuggestions([]); setSelectedStudent(null); setSelectedPreviewSubjects([]); setMessage(''); setError(''); }}>Clear</button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <aside className="subject-preview-col">
            <div className="preview-card">
              <h3>Subject Preview</h3>
              <div className="preview-list">
                {selectedPreviewSubjects.map((s) => (
                  <div key={s.id} className="preview-item">{s.subject_name}</div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default StudentEnrollmentPage;