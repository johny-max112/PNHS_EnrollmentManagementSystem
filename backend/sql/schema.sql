-- ============================================================================
-- PNHS ENROLLMENT MANAGEMENT SYSTEM - REFACTORED SCHEMA
-- Admin/Registrar Only - Document Management System
-- ============================================================================

CREATE DATABASE IF NOT EXISTS pnhs_enrollment;
USE pnhs_enrollment;

-- ============================================================================
-- CORE TABLES (Keep as-is)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(120) NOT NULL,
  role ENUM('admin', 'registrar') NOT NULL,
  email VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lrn CHAR(12) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100) NULL,
  suffix VARCHAR(20) NULL,
  date_of_birth DATE NULL,
  gender ENUM('male', 'female', 'other') NULL,
  contact_number VARCHAR(20) NULL,
  address VARCHAR(255) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS tracks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track_code VARCHAR(20) NOT NULL UNIQUE,
  track_name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS strands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  track_id INT NOT NULL,
  strand_code VARCHAR(20) NOT NULL UNIQUE,
  strand_name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

CREATE TABLE IF NOT EXISTS subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subject_code VARCHAR(30) NOT NULL,
  subject_name VARCHAR(150) NOT NULL,
  grade_level TINYINT NOT NULL,
  strand_id INT NULL,
  units INT DEFAULT 3,
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

-- ============================================================================
-- ENROLLMENT MANAGEMENT TABLES (REFACTORED)
-- ============================================================================

CREATE TABLE IF NOT EXISTS enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  grade_level TINYINT NOT NULL,
  track_id INT NULL,
  strand_id INT NULL,
  section_id INT NOT NULL,
  school_year VARCHAR(9) NOT NULL,
  status ENUM('pending', 'documents_pending', 'verified', 'enrolled', 'cancelled') NOT NULL DEFAULT 'pending',
  enrolled_by INT NOT NULL,
  verified_by INT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_student_school_year (student_id, school_year),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (track_id) REFERENCES tracks(id),
  FOREIGN KEY (strand_id) REFERENCES strands(id),
  FOREIGN KEY (section_id) REFERENCES sections(id),
  FOREIGN KEY (enrolled_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS enrollment_subjects (
  enrollment_id INT NOT NULL,
  subject_id INT NOT NULL,
  PRIMARY KEY (enrollment_id, subject_id),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- ============================================================================
-- DOCUMENT MANAGEMENT TABLES (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255) NULL,
  required_for_grades VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS enrollment_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  document_type_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT NULL,
  mime_type VARCHAR(50) NULL,
  status ENUM('uploaded', 'verified', 'rejected') NOT NULL DEFAULT 'uploaded',
  rejection_reason VARCHAR(255) NULL,
  uploaded_by INT NOT NULL,
  verified_by INT NULL,
  verified_at TIMESTAMP NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (document_type_id) REFERENCES document_types(id),
  FOREIGN KEY (uploaded_by) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- ============================================================================
-- AUDIT & TRACKING TABLES (NEW)
-- ============================================================================

CREATE TABLE IF NOT EXISTS enrollment_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  changed_by INT NOT NULL,
  notes TEXT NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_enrollment_id (enrollment_id),
  INDEX idx_changed_at (changed_at)
);

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50) NULL,
  resource_id INT NULL,
  ip_address VARCHAR(45) NULL,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_logged_at (logged_at)
);

-- ============================================================================
-- LEGACY COMPATIBILITY (safe for existing databases)
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL DEFAULT NULL;

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO users (username, password_hash, full_name, role, email)
VALUES
  ('admin', '$2b$10$DiAcsMhFtpBKtoF91oROdutIMYgMF5aHs344bYgGgJXlDG7/wzPTO', 'System Administrator', 'admin', 'admin@pnhs.edu.ph'),
  ('registrar', '$2b$10$RwgG3tw3zUJLyMqt6f/TY.rcbZ4qw2C0N3YmZxh2Pr/nrEm8XxBvK', 'PNHS Registrar', 'registrar', 'registrar@pnhs.edu.ph')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  full_name = VALUES(full_name),
  role = VALUES(role),
  email = VALUES(email),
  is_active = 1;

INSERT INTO document_types (code, name, description, required_for_grades)
VALUES
  ('FORM137', 'Form 137-A', 'Permanent Record/Report Card', '7,8,9,10'),
  ('FORM138', 'Form 138', 'Certificate of Eligibility', '11,12'),
  ('CERT_GOOD_MORAL', 'Certificate of Good Moral', 'Good Moral Certificate', '7,8,9,10,11,12'),
  ('MEDICAL_CERT', 'Medical Certificate', 'Physical Examination Report', '7,8,9,10,11,12'),
  ('BIRTH_CERT', 'Birth Certificate', 'NSO Birth Certificate (Certified True Copy)', '7,8,9,10,11,12'),
  ('TRANSFER_CERT', 'Transfer Certificate', 'Certificate of Transfer (if applicable)', '8,9,10'),
  ('PSA_CREDENTIALS', 'PSA Credentials', 'Philippine Statistics Authority Certification', '11,12')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

INSERT INTO tracks (track_code, track_name, description)
VALUES
  ('JHS', 'Junior High School', 'Grades 7-10'),
  ('ACAD', 'Academic Track', 'Science, Technology, Business, and Social Sciences'),
  ('TVL', 'Technical-Vocational-Livelihood', 'Technical and Vocational Programs')
ON DUPLICATE KEY UPDATE track_name = VALUES(track_name), description = VALUES(description);

INSERT INTO strands (track_id, strand_code, strand_name, description)
SELECT t.id, s.strand_code, s.strand_name, s.description
FROM (
  SELECT 'ACAD' AS track_code, 'STEM' AS strand_code, 'STEM' AS strand_name, 'Science, Technology, Engineering, and Mathematics' AS description
  UNION ALL SELECT 'ACAD', 'ABM', 'ABM', 'Accountancy, Business, and Management'
  UNION ALL SELECT 'ACAD', 'HUMSS', 'HUMSS', 'Humanities and Social Sciences'
  UNION ALL SELECT 'TVL', 'ICT', 'ICT', 'Information and Communications Technology'
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

INSERT INTO subjects (subject_code, subject_name, grade_level, strand_id, units)
VALUES
  ('ENG7', 'English 7', 7, NULL, 3),
  ('MATH7', 'Mathematics 7', 7, NULL, 3),
  ('SCI7', 'Science 7', 7, NULL, 3),
  ('ARALING_PANLIPUNAN7', 'Araling Panlipunan 7', 7, NULL, 3),
  ('MAPEH7', 'MAPEH 7', 7, NULL, 2),
  ('TLE7', 'TLE 7', 7, NULL, 3),
  ('TEKNOLOHIYA7', 'Teknolohiya 7', 7, NULL, 3),
  ('ENG8', 'English 8', 8, NULL, 3),
  ('MATH8', 'Mathematics 8', 8, NULL, 3),
  ('SCI8', 'Science 8', 8, NULL, 3),
  ('ARALING_PANLIPUNAN8', 'Araling Panlipunan 8', 8, NULL, 3),
  ('MAPEH8', 'MAPEH 8', 8, NULL, 2),
  ('TLE8', 'TLE 8', 8, NULL, 3),
  ('TEKNOLOHIYA8', 'Teknolohiya 8', 8, NULL, 3),
  ('ENG9', 'English 9', 9, NULL, 3),
  ('MATH9', 'Mathematics 9', 9, NULL, 3),
  ('SCI9', 'Science 9', 9, NULL, 3),
  ('ARALING_PANLIPUNAN9', 'Araling Panlipunan 9', 9, NULL, 3),
  ('MAPEH9', 'MAPEH 9', 9, NULL, 2),
  ('TLE9', 'TLE 9', 9, NULL, 3),
  ('TEKNOLOHIYA9', 'Teknolohiya 9', 9, NULL, 3),
  ('ENG10', 'English 10', 10, NULL, 3),
  ('MATH10', 'Mathematics 10', 10, NULL, 3),
  ('SCI10', 'Science 10', 10, NULL, 3),
  ('ARALING_PANLIPUNAN10', 'Araling Panlipunan 10', 10, NULL, 3),
  ('MAPEH10', 'MAPEH 10', 10, NULL, 2),
  ('TLE10', 'TLE 10', 10, NULL, 3),
  ('TEKNOLOHIYA10', 'Teknolohiya 10', 10, NULL, 3)
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name), units = VALUES(units);

INSERT INTO subjects (subject_code, subject_name, grade_level, strand_id, units)
SELECT x.subject_code, x.subject_name, x.grade_level, st.id, x.units
FROM (
  SELECT 'ORAL_COMM11' AS subject_code, 'Oral Communication in Context' AS subject_name, 11 AS grade_level, 'STEM' AS strand_code, 3 AS units
  UNION ALL SELECT 'STAT_PROB11', 'Statistics and Probability', 11, 'STEM', 3
  UNION ALL SELECT 'PHYSICS11', 'General Physics 1', 11, 'STEM', 3
  UNION ALL SELECT 'CHEM11', 'Chemistry', 11, 'STEM', 3
  UNION ALL SELECT 'BIO11', 'Biology', 11, 'STEM', 3
  UNION ALL SELECT 'ORAL_COMM11', 'Oral Communication in Context', 11, 'ABM', 3
  UNION ALL SELECT 'ACC_FUND11', 'Fundamentals of Accountancy', 11, 'ABM', 3
  UNION ALL SELECT 'BUS_MATH11', 'Business Mathematics', 11, 'ABM', 3
  UNION ALL SELECT 'ECONOMICS11', 'Contemporary World', 11, 'ABM', 3
  UNION ALL SELECT 'ORAL_COMM11', 'Oral Communication in Context', 11, 'HUMSS', 3
  UNION ALL SELECT 'PHILO11', 'Introduction to Philosophy of the Human Person', 11, 'HUMSS', 3
  UNION ALL SELECT 'HISTORY11', 'Philippine History', 11, 'HUMSS', 3
  UNION ALL SELECT 'GEOG11', 'Geography', 11, 'HUMSS', 3
  UNION ALL SELECT 'ORAL_COMM11', 'Oral Communication in Context', 11, 'ICT', 3
  UNION ALL SELECT 'PROG_C11', 'Computer Programming 1 (C)', 11, 'ICT', 3
  UNION ALL SELECT 'SYS_ADMIN11', 'System Administration & Maintenance', 11, 'ICT', 3
  UNION ALL SELECT 'IT_ESSENTIALS11', 'IT Essentials', 11, 'ICT', 3
  UNION ALL SELECT 'RESEARCH12', 'Practical Research 2', 12, 'STEM', 3
  UNION ALL SELECT 'CALCULUS12', 'Basic Calculus', 12, 'STEM', 3
  UNION ALL SELECT 'PHYSICS12', 'General Physics 2', 12, 'STEM', 3
  UNION ALL SELECT 'EARTH_SCI12', 'Earth and Life Science', 12, 'STEM', 3
  UNION ALL SELECT 'RESEARCH12', 'Practical Research 2', 12, 'ABM', 3
  UNION ALL SELECT 'ACCT_12', 'Accounting 2', 12, 'ABM', 3
  UNION ALL SELECT 'FINANCE12', 'Business Finance', 12, 'ABM', 3
  UNION ALL SELECT 'BUSINESS_LAW12', 'Business Law', 12, 'ABM', 3
  UNION ALL SELECT 'CREATIVE_WRITING12', 'Creative Writing', 12, 'HUMSS', 3
  UNION ALL SELECT 'SOCIOLOGY12', 'Sociology', 12, 'HUMSS', 3
  UNION ALL SELECT 'ECONOMICS12', 'Economics', 12, 'HUMSS', 3
  UNION ALL SELECT 'RESEARCH12', 'Practical Research 2', 12, 'ICT', 3
  UNION ALL SELECT 'WEB_DEV12', 'Web Development', 12, 'ICT', 3
  UNION ALL SELECT 'NETWORK12', 'Networking', 12, 'ICT', 3
) x
JOIN strands st ON st.strand_code = x.strand_code
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name), units = VALUES(units);

-- ============================================================================
-- VIEWS FOR EASY QUERYING
-- ============================================================================

DROP VIEW IF EXISTS v_enrollment_with_details;
CREATE VIEW v_enrollment_with_details AS
SELECT 
  e.id,
  e.student_id,
  s.lrn,
  s.first_name,
  s.middle_name,
  s.last_name,
  s.suffix,
  s.date_of_birth,
  e.grade_level,
  sec.section_name,
  t.track_name,
  st.strand_name,
  e.school_year,
  e.status,
  u1.full_name AS enrolled_by_name,
  u2.full_name AS verified_by_name,
  e.created_at,
  e.updated_at
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN sections sec ON sec.id = e.section_id
LEFT JOIN tracks t ON t.id = e.track_id
LEFT JOIN strands st ON st.id = e.strand_id
LEFT JOIN users u1 ON u1.id = e.enrolled_by
LEFT JOIN users u2 ON u2.id = e.verified_by;

DROP VIEW IF EXISTS v_document_status;
CREATE VIEW v_document_status AS
SELECT 
  e.id AS enrollment_id,
  s.lrn,
  CONCAT(s.first_name, ' ', s.last_name) AS student_name,
  e.grade_level,
  sec.section_name,
  e.school_year,
  dt.code,
  dt.name,
  COALESCE(ed.status, 'MISSING') AS document_status,
  ed.uploaded_at,
  ed.verified_at
FROM enrollments e
JOIN students s ON s.id = e.student_id
JOIN sections sec ON sec.id = e.section_id
JOIN document_types dt ON FIND_IN_SET(e.grade_level, dt.required_for_grades)
LEFT JOIN enrollment_documents ed ON ed.enrollment_id = e.id AND ed.document_type_id = dt.id
ORDER BY s.lrn, dt.code;
