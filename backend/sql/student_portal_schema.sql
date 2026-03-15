USE pnhs_enrollment;

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

INSERT INTO student_accounts (student_id, lrn, password_hash, is_active)
SELECT id, lrn, '$2b$10$lnoKB9DeImnQ6YSmQW2cNOXY2adzpZXo/Onvfs4PfPj0Jo88qD63S', 1
FROM students
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  is_active = VALUES(is_active);

-- Default seeded password for student demo accounts:
-- Student123!
