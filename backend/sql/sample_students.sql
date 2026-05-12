USE pnhs_enrollment;

SET @admin_id := (SELECT id FROM users WHERE username = 'admin' LIMIT 1);

INSERT INTO students (lrn, first_name, last_name, middle_name, suffix, created_by)
VALUES
  ('100000000001', 'Juan', 'Dela Cruz', 'Santos', NULL, @admin_id),
  ('100000000002', 'Maria', 'Reyes', 'Lopez', NULL, @admin_id),
  ('100000000003', 'Carlo', 'Bautista', 'Navarro', NULL, @admin_id),
  ('100000000004', 'Andrea', 'Garcia', 'Mendoza', NULL, @admin_id),
  ('100000000005', 'Miguel', 'Torres', 'Aquino', NULL, @admin_id),
  ('100000000006', 'Patricia', 'Fernandez', 'Ramos', NULL, @admin_id)
ON DUPLICATE KEY UPDATE
  first_name = VALUES(first_name),
  last_name = VALUES(last_name),
  middle_name = VALUES(middle_name),
  suffix = VALUES(suffix),
  created_by = VALUES(created_by);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status, enrolled_by)
SELECT st.id, 7, NULL, NULL, sec.id, '2026-2027', 'enrolled', @admin_id
FROM students st
JOIN sections sec ON sec.section_name = 'Rizal' AND sec.grade_level = 7
WHERE st.lrn = '100000000001'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id), enrolled_by = VALUES(enrolled_by);

INSERT INTO enrollments (student_id, grade_level, track_id, strand_id, section_id, school_year, status, enrolled_by)
SELECT st.id, 9, NULL, NULL, sec.id, '2026-2027', 'pending', @admin_id
FROM students st
JOIN sections sec ON sec.section_name = 'Mabini' AND sec.grade_level = 9
WHERE st.lrn = '100000000002'
ON DUPLICATE KEY UPDATE status = VALUES(status), section_id = VALUES(section_id), enrolled_by = VALUES(enrolled_by);

INSERT IGNORE INTO enrollment_subjects (enrollment_id, subject_id)
SELECT e.id, sub.id
FROM enrollments e
JOIN subjects sub ON sub.grade_level = e.grade_level AND sub.is_active = 1
WHERE e.school_year = '2026-2027'
  AND e.grade_level BETWEEN 7 AND 10
  AND sub.strand_id IS NULL;

INSERT INTO enrollment_audit_logs (enrollment_id, action, old_value, new_value, changed_by, notes)
SELECT e.id, 'status_change', NULL, e.status, @admin_id, 'Seeded sample enrollment'
FROM enrollments e
WHERE e.school_year = '2026-2027'
  AND NOT EXISTS (
    SELECT 1
    FROM enrollment_audit_logs l
    WHERE l.enrollment_id = e.id
      AND l.action = 'status_change'
      AND l.notes = 'Seeded sample enrollment'
  );

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
