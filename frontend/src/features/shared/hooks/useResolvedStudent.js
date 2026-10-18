import { useEffect, useState } from 'react';

export default function useResolvedStudent(studentId, stateStudent, loadList) {
  const [student, setStudent] = useState(stateStudent || null);

  useEffect(() => {
    if (stateStudent && stateStudent.id === studentId) {
      setStudent(stateStudent);
      return undefined;
    }
    let cancelled = false;
    loadList()
      .then((res) => {
        if (cancelled) return;
        const found = (res.data || []).find((item) => item.id === studentId);
        if (found) setStudent(found);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [studentId, stateStudent, loadList]);

  return student;
}
