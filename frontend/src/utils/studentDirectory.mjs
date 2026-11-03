export const ASSIGNMENT_OPTIONS = [
  { value: 'all', label: 'All students' },
  { value: 'both', label: 'Both supervisors' },
  { value: 'none', label: 'Neither supervisor' },
  { value: 'university_only', label: 'University only' },
  { value: 'industry_only', label: 'Industry only' },
];

export function assignmentCategory(student) {
  const university = Boolean(student.university_supervisor_id);
  const industry = Boolean(student.industry_supervisor_id);
  if (university && industry) return 'both';
  if (university) return 'university_only';
  if (industry) return 'industry_only';
  return 'none';
}

export function searchMatches(student, query) {
  const term = String(query || '').trim().toLocaleLowerCase();
  if (!term) return true;
  const values = [
    student.name, student.email, student.registration_number,
    student.programme, student.location, student.company_name,
    student.industry_company_name, student.industry_supervisor_name,
    student.university_supervisor_name, student.university_department,
  ];
  return values.some((value) => String(value ?? '').toLocaleLowerCase().includes(term));
}

export function filterStudentDirectory(students, { query = '', assignment = 'all', sort = 'name' } = {}) {
  const filtered = (Array.isArray(students) ? students : []).filter((student) =>
    (assignment === 'all' || assignmentCategory(student) === assignment) && searchMatches(student, query)
  );
  return filtered.sort((a, b) => {
    if (sort === 'newest') return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    if (sort === 'oldest') return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    return String(a.name || a.email || '').localeCompare(String(b.name || b.email || ''), undefined, { sensitivity: 'base' });
  });
}
