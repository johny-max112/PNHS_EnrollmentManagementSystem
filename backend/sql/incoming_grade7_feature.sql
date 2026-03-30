USE pnhs_enrollment;

CREATE TABLE IF NOT EXISTS incoming_grade7_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  lrn CHAR(12) NOT NULL,
  school_year VARCHAR(9) NOT NULL,
  completed_grade_level TINYINT NOT NULL DEFAULT 6,
  target_grade_level TINYINT NOT NULL DEFAULT 7,
  status ENUM('pending', 'approved', 'enrolled_grade7', 'incomplete', 'rejected') NOT NULL DEFAULT 'pending',
  missing_requirements TEXT NULL,
  reviewer_notes VARCHAR(255) NULL,
  reviewed_by INT NULL,
  reviewed_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (lrn) REFERENCES students(lrn),
  FOREIGN KEY (reviewed_by) REFERENCES users(id),
  INDEX idx_incoming_g7_lrn (lrn),
  INDEX idx_incoming_g7_status (status),
  INDEX idx_incoming_g7_school_year (school_year)
);

CREATE TABLE IF NOT EXISTS incoming_grade7_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  document_type ENUM('form_138', 'psa_birth_certificate', 'id_photos', 'good_moral_certificate') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES incoming_grade7_submissions(id) ON DELETE CASCADE,
  INDEX idx_incoming_g7_docs_submission (submission_id)
);

CREATE TABLE IF NOT EXISTS incoming_grade7_validation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_id INT NOT NULL,
  old_status ENUM('pending', 'approved', 'enrolled_grade7', 'incomplete', 'rejected') NULL,
  new_status ENUM('pending', 'approved', 'enrolled_grade7', 'incomplete', 'rejected') NOT NULL,
  changed_by INT NULL,
  notes VARCHAR(255) NULL,
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (submission_id) REFERENCES incoming_grade7_submissions(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id),
  INDEX idx_incoming_g7_logs_submission (submission_id)
);
