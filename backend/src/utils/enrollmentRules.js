const JHS_MIN_GRADE = 7;
const JHS_MAX_GRADE = 10;
const SHS_MIN_GRADE = 11;
const SHS_MAX_GRADE = 12;

function isValidGradeLevel(gradeLevel) {
  const grade = Number(gradeLevel);
  return Number.isInteger(grade) && grade >= JHS_MIN_GRADE && grade <= SHS_MAX_GRADE;
}

function isSHS(gradeLevel) {
  return Number(gradeLevel) >= SHS_MIN_GRADE;
}

module.exports = {
  JHS_MIN_GRADE,
  JHS_MAX_GRADE,
  SHS_MIN_GRADE,
  SHS_MAX_GRADE,
  isValidGradeLevel,
  isSHS,
};
