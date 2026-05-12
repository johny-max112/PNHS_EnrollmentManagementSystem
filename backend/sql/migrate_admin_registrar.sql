USE pnhs_enrollment;

-- Drop obsolete student-portal and legacy tracking artifacts.
DROP VIEW IF EXISTS v_document_status;
DROP VIEW IF EXISTS v_enrollment_with_details;
DROP TABLE IF EXISTS enrollment_status_logs;
DROP TABLE IF EXISTS student_accounts;

-- Ensure required user fields exist for activity tracking.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL DEFAULT NULL;

-- Ensure required student fields exist for staff-only data entry.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS date_of_birth DATE NULL,
  ADD COLUMN IF NOT EXISTS gender ENUM('male', 'female', 'other') NULL,
  ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS address VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS created_by INT NULL;

-- Ensure required enrollment fields and statuses exist.
ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS enrolled_by INT NULL,
  ADD COLUMN IF NOT EXISTS verified_by INT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Map old statuses to the new lifecycle before enum update.
UPDATE enrollments SET status = 'verified' WHERE status = 'approved';
UPDATE enrollments SET status = 'enrolled' WHERE status = 'completed';

ALTER TABLE enrollments
  MODIFY COLUMN status ENUM('pending', 'documents_pending', 'verified', 'enrolled', 'cancelled') NOT NULL DEFAULT 'pending';

-- Make sure we have at least one admin user to backfill ownership fields.
INSERT INTO users (username, password_hash, full_name, role, email)
VALUES ('admin', '$2b$10$DiAcsMhFtpBKtoF91oROdutIMYgMF5aHs344bYgGgJXlDG7/wzPTO', 'System Administrator', 'admin', 'admin@pnhs.edu.ph')
ON DUPLICATE KEY UPDATE is_active = 1;

SET @admin_id := (SELECT id FROM users WHERE username = 'admin' LIMIT 1);

UPDATE students SET created_by = @admin_id WHERE created_by IS NULL;
UPDATE enrollments SET enrolled_by = @admin_id WHERE enrolled_by IS NULL;

ALTER TABLE students MODIFY COLUMN created_by INT NOT NULL;
ALTER TABLE enrollments MODIFY COLUMN enrolled_by INT NOT NULL;

-- Extend subjects schema for report and curriculum display.
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS units INT DEFAULT 3;

-- Document management and audit tables.
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

-- Required document master data.
INSERT INTO document_types (code, name, description, required_for_grades)
VALUES
  ('FORM137', 'Form 137-A', 'Permanent Record/Report Card', '7,8,9,10'),
  ('FORM138', 'Form 138', 'Certificate of Eligibility', '7,8,9,10'),
  ('CERT_GOOD_MORAL', 'Certificate of Good Moral', 'Good Moral Certificate', '7,8,9,10'),
  ('MEDICAL_CERT', 'Medical Certificate', 'Physical Examination Report', '7,8,9,10'),
  ('BIRTH_CERT', 'Birth Certificate', 'NSO Birth Certificate (Certified True Copy)', '7,8,9,10'),
  ('TRANSFER_CERT', 'Transfer Certificate', 'Certificate of Transfer (if applicable)', '7,8,9,10'),
  ('PSA_CREDENTIALS', 'PSA Credentials', 'Philippine Statistics Authority Certification', '7,8,9,10')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  required_for_grades = VALUES(required_for_grades),
  is_active = 1;
