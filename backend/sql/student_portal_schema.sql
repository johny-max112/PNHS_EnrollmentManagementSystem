USE pnhs_enrollment;

-- This project is now admin/registrar only.
-- Keep this script as a backward-compatible cleanup helper.
DROP TABLE IF EXISTS student_accounts;
