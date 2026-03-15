CREATE DATABASE IF NOT EXISTS pnhs_enrollment;
USE pnhs_enrollment;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lrn CHAR(12) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  suffix VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL UNIQUE,
  lrn CHAR(12) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (lrn) REFERENCES students(lrn)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin', 'registrar') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track_code VARCHAR(20) NOT NULL UNIQUE,
  track_name VARCHAR(100) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS strands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track_id INT NOT NULL,
  strand_code VARCHAR(20) NOT NULL UNIQUE,
  strand_name VARCHAR(120) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_code VARCHAR(30) NOT NULL,
  subject_name VARCHAR(150) NOT NULL,
  grade_level TINYINT NOT NULL,
  strand_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_subject_code_grade (subject_code, grade_level, strand_id),
  FOREIGN KEY (strand_id) REFERENCES strands(id)
);

CREATE TABLE IF NOT EXISTS sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_name VARCHAR(100) NOT NULL,
  grade_level TINYINT NOT NULL,
  strand_id INT NULL,
  capacity INT NOT NULL DEFAULT 45,
  current_enrolled INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uq_section_name_grade (section_name, grade_level),
  FOREIGN KEY (strand_id) REFERENCES strands(id)
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  grade_level TINYINT NOT NULL,
  track_id INT NULL,
  strand_id INT NULL,
  section_id INT NOT NULL,
  school_year VARCHAR(9) NOT NULL,
  status ENUM('pending', 'enrolled', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_school_year (student_id, school_year),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (strand_id) REFERENCES strands(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

CREATE TABLE IF NOT EXISTS enrollment_subjects (
  enrollment_id INT NOT NULL,
  subject_id INT NOT NULL,
  PRIMARY KEY (enrollment_id, subject_id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS enrollment_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  old_status ENUM('pending', 'enrolled', 'cancelled', 'completed') NULL,
  new_status ENUM('pending', 'enrolled', 'cancelled', 'completed') NOT NULL,
  changed_by INT NULL,
  notes VARCHAR(255) NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

INSERT INTO users (username, password_hash, full_name, role)
VALUES
  ('admin', '$2b$10$DiAcsMhFtpBKtoF91oROdutIMYgMF5aHs344bYgGgJXlDG7/wzPTO', 'System Administrator', 'admin'),
  ('registrar', '$2b$10$RwgG3tw3zUJLyMqt6f/TY.rcbZ4qw2C0N3YmZxh2Pr/nrEm8XxBvK', 'PNHS Registrar', 'registrar')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  role = VALUES(role),
  is_active = 1;

INSERT INTO tracks (track_code, track_name)
VALUES
  ('ACAD', 'Academic'),
  ('TVL', 'Technical-Vocational-Livelihood')
ON DUPLICATE KEY UPDATE track_name = VALUES(track_name);

INSERT INTO strands (track_id, strand_code, strand_name)
SELECT t.id, s.strand_code, s.strand_name
FROM (
  SELECT 'ACAD' AS track_code, 'STEM' AS strand_code, 'Science, Technology, Engineering, and Mathematics' AS strand_name
  UNION ALL SELECT 'ACAD', 'ABM', 'Accountancy, Business, and Management'
  UNION ALL SELECT 'ACAD', 'HUMSS', 'Humanities and Social Sciences'
  UNION ALL SELECT 'TVL', 'ICT', 'Information and Communications Technology'
) s
JOIN tracks t ON t.track_code = s.track_code
ON DUPLICATE KEY UPDATE strand_name = VALUES(strand_name);

INSERT INTO sections (section_name, grade_level, strand_id, capacity)
VALUES
  ('Rizal', 7, NULL, 45),
  ('Bonifacio', 8, NULL, 45),
  ('Mabini', 9, NULL, 45),
  ('Del Pilar', 10, NULL, 45)
ON DUPLICATE KEY UPDATE capacity = VALUES(capacity);

INSERT INTO sections (section_name, grade_level, strand_id, capacity)
SELECT s.section_name, s.grade_level, st.id, s.capacity
FROM (
  SELECT 'STEM-A' AS section_name, 11 AS grade_level, 'STEM' AS strand_code, 45 AS capacity
  UNION ALL SELECT 'ABM-A', 11, 'ABM', 45
  UNION ALL SELECT 'HUMSS-A', 11, 'HUMSS', 45
  UNION ALL SELECT 'ICT-A', 11, 'ICT', 45
  UNION ALL SELECT 'STEM-B', 12, 'STEM', 45
  UNION ALL SELECT 'ABM-B', 12, 'ABM', 45
  UNION ALL SELECT 'HUMSS-B', 12, 'HUMSS', 45
  UNION ALL SELECT 'ICT-B', 12, 'ICT', 45
) s
JOIN strands st ON st.strand_code = s.strand_code
ON DUPLICATE KEY UPDATE capacity = VALUES(capacity);

INSERT INTO subjects (subject_code, subject_name, grade_level, strand_id)
VALUES
  ('ENG7', 'English 7', 7, NULL),
  ('MATH7', 'Mathematics 7', 7, NULL),
  ('SCI7', 'Science 7', 7, NULL),
  ('ENG8', 'English 8', 8, NULL),
  ('MATH8', 'Mathematics 8', 8, NULL),
  ('SCI8', 'Science 8', 8, NULL),
  ('ENG9', 'English 9', 9, NULL),
  ('MATH9', 'Mathematics 9', 9, NULL),
  ('SCI9', 'Science 9', 9, NULL),
  ('ENG10', 'English 10', 10, NULL),
  ('MATH10', 'Mathematics 10', 10, NULL),
  ('SCI10', 'Science 10', 10, NULL)
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name);

INSERT INTO subjects (subject_code, subject_name, grade_level, strand_id)
SELECT x.subject_code, x.subject_name, x.grade_level, st.id
FROM (
  SELECT 'CORE11-ENG' AS subject_code, 'Oral Communication' AS subject_name, 11 AS grade_level, 'STEM' AS strand_code
  UNION ALL SELECT 'CORE11-STAT', 'Statistics and Probability', 11, 'STEM'
  UNION ALL SELECT 'CORE11-PRAC', 'Practical Research 1', 11, 'ABM'
  UNION ALL SELECT 'CORE11-FABM', 'Fundamentals of Accountancy', 11, 'ABM'
  UNION ALL SELECT 'CORE11-PHILO', 'Introduction to Philosophy', 11, 'HUMSS'
  UNION ALL SELECT 'CORE11-POLGOV', 'Philippine Politics and Governance', 11, 'HUMSS'
  UNION ALL SELECT 'CORE11-COMPROG', 'Computer Programming', 11, 'ICT'
  UNION ALL SELECT 'CORE11-NCSS', 'Computer Systems Servicing', 11, 'ICT'
  UNION ALL SELECT 'CORE12-RES2', 'Practical Research 2', 12, 'STEM'
  UNION ALL SELECT 'CORE12-CALC', 'Basic Calculus', 12, 'STEM'
  UNION ALL SELECT 'CORE12-BFIN', 'Business Finance', 12, 'ABM'
  UNION ALL SELECT 'CORE12-APPL', 'Applied Economics', 12, 'ABM'
  UNION ALL SELECT 'CORE12-CREW', 'Creative Writing', 12, 'HUMSS'
  UNION ALL SELECT 'CORE12-DS', 'Disciplines and Ideas in Social Sciences', 12, 'HUMSS'
  UNION ALL SELECT 'CORE12-WEBDEV', 'Web Development', 12, 'ICT'
  UNION ALL SELECT 'CORE12-ANIM', 'Animation', 12, 'ICT'
) x
JOIN strands st ON st.strand_code = x.strand_code
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name);

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
