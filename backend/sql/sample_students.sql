USE pnhs_enrollment;

INSERT INTO students (lrn, first_name, last_name, middle_name, suffix)
VALUES
  ('100000000001', 'Juan', 'Dela Cruz', 'Santos', NULL),
  ('100000000002', 'Maria', 'Reyes', 'Lopez', NULL),
  ('100000000003', 'Carlo', 'Bautista', 'Navarro', NULL),
  ('100000000004', 'Andrea', 'Garcia', 'Mendoza', NULL),
  ('100000000005', 'Miguel', 'Torres', 'Aquino', NULL),
  ('100000000006', 'Patricia', 'Fernandez', 'Ramos', NULL)
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  middle_name = VALUES(middle_name),
  suffix = VALUES(suffix);

INSERT INTO student_accounts (student_id, lrn, password_hash, is_active)
SELECT id, lrn, '$2b$10$lnoKB9DeImnQ6YSmQW2cNOXY2adzpZXo/Onvfs4PfPj0Jo88qD63S', 1
FROM students
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  is_active = VALUES(is_active);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status)
SELECT st.id, 7, NULL, NULL, sec.id, '2026-2027', 'enrolled'
FROM students st
JOIN sections sec ON sec.section_name = 'Rizal' AND sec.grade_level = 7
WHERE st.lrn = '100000000001'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status)
SELECT st.id, 9, NULL, NULL, sec.id, '2026-2027', 'pending'
FROM students st
JOIN sections sec ON sec.section_name = 'Mabini' AND sec.grade_level = 9
WHERE st.lrn = '100000000002'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status)
SELECT st.id, 11, tr.id, sd.id, sec.id, '2026-2027', 'enrolled'
FROM students st
JOIN tracks tr ON tr.track_code = 'ACAD'
JOIN strands sd ON sd.strand_code = 'STEM'
JOIN sections sec ON sec.section_name = 'STEM-A' AND sec.grade_level = 11
WHERE st.lrn = '100000000003'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id), track_id = VALUES(track_id), strand_id = VALUES(strand_id);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status)
SELECT st.id, 11, tr.id, sd.id, sec.id, '2026-2027', 'completed'
FROM students st
JOIN tracks tr ON tr.track_code = 'ACAD'
JOIN strands sd ON sd.strand_code = 'ABM'
JOIN sections sec ON sec.section_name = 'ABM-A' AND sec.grade_level = 11
WHERE st.lrn = '100000000004'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id), track_id = VALUES(track_id), strand_id = VALUES(strand_id);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status)
SELECT st.id, 12, tr.id, sd.id, sec.id, '2026-2027', 'enrolled'
FROM students st
JOIN tracks tr ON tr.track_code = 'TVL'
JOIN strands sd ON sd.strand_code = 'ICT'
JOIN sections sec ON sec.section_name = 'ICT-B' AND sec.grade_level = 12
WHERE st.lrn = '100000000005'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id), track_id = VALUES(track_id), strand_id = VALUES(strand_id);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status)
SELECT st.id, 12, tr.id, sd.id, sec.id, '2026-2027', 'cancelled'
FROM students st
JOIN tracks tr ON tr.track_code = 'ACAD'
JOIN strands sd ON sd.strand_code = 'HUMSS'
JOIN sections sec ON sec.section_name = 'HUMSS-B' AND sec.grade_level = 12
WHERE st.lrn = '100000000006'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id), track_id = VALUES(track_id), strand_id = VALUES(strand_id);

INSERT IGNORE INTO enrollment_subjects (enrollment_id, subject_id)
SELECT e.id, sub.id
FROM enrollments e
JOIN subjects sub ON sub.grade_level = e.grade_level AND sub.is_active = 1
WHERE e.school_year = '2026-2027'
  AND (
    (e.grade_level BETWEEN 7 AND 10 AND sub.strand_id IS NULL)
    OR (e.grade_level BETWEEN 11 AND 12 AND (sub.strand_id IS NULL OR sub.strand_id = e.strand_id))
  );

INSERT IGNORE INTO enrollment_status_logs (enrollment_id, old_status, new_status, changed_by, notes)
SELECT e.id, NULL, e.status, u.id, 'Seeded sample enrollment'
FROM enrollments e
LEFT JOIN users u ON u.username = 'admin'
WHERE e.school_year = '2026-2027';

UPDATE sections sec
JOIN (
  SELECT section_id, COUNT(*) AS total
  FROM enrollments
  WHERE status <> 'cancelled'
  GROUP BY section_id
) x ON x.section_id = sec.id
SET sec.current_enrolled = x.total;

UPDATE sections
SET current_enrolled = 0
WHERE id NOT IN (
  SELECT section_id FROM enrollments WHERE status <> 'cancelled'
);
