const xss = require('xss');

/**
 * Sanitizes HTML by removing potentially dangerous tags and attributes
 * while preserving basic formatting
 */
function sanitizeHtml(input) {
  if (!input) return '';
  return xss(String(input), {
    whiteList: {}, // No tags allowed
    stripIgnoredTag: true,
    stripLeakage: true,
  });
}

/**
 * Escapes HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validates school year format (YYYY-YYYY)
 */
function isValidSchoolYear(schoolYear) {
  if (!schoolYear || typeof schoolYear !== 'string') {
    return false;
  }
  return /^\d{4}-\d{4}$/.test(schoolYear);
}

/**
 * Validates LRN format (12 digits)
 */
function isValidLRN(lrn) {
  if (!lrn) return false;
  return /^\d{12}$/.test(String(lrn));
}

/**
 * Validates grade level (7-12)
 */
function isValidGradeLevel(gradeLevel) {
  const grade = Number(gradeLevel);
  return !isNaN(grade) && grade >= 7 && grade <= 12;
}

/**
 * Validates username format (alphanumeric and underscore, 3-50 chars)
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') {
    return false;
  }
  return /^[a-zA-Z0-9_]{3,50}$/.test(username);
}

/**
 * Validates password strength
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
function isStrongPassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return false;
  }
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

/**
 * Sanitizes user input names (first, last, middle names)
 */
function sanitizeName(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }
  // Only allow letters, spaces, hyphens, and apostrophes
  return name.replace(/[^a-zA-Z\s\-']/g, '').trim();
}

module.exports = {
  sanitizeHtml,
  escapeHtml,
  isValidSchoolYear,
  isValidLRN,
  isValidGradeLevel,
  isValidUsername,
  isStrongPassword,
  sanitizeName,
};
