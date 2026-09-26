import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
// import * as gradesApi from '../../../api/grades.api';

import * as gradesApi from '../../../api/grades.api'
export default function GradesSection({ studentId }) {
  const [grade, setGrade] = useState(undefined); // undefined = loading, null = none yet
  const [error, setError] = useState('');

  useEffect(() => {
    gradesApi
      .getGradeForStudent(studentId)
      .then((res) => setGrade(res.data))
      .catch((err) => {
        if (err.statusCode === 404) {
          setGrade(null);
        } else {
          setError(err.message);
        }
      });
  }, [studentId]);

  return (
    <Card>
      <h2 className="section-title">Grade</h2>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {grade === undefined && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {grade === null && <EmptyState>Not graded yet.</EmptyState>}
      {grade && (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', margin: '0 0 8px', color: 'var(--ink)' }}>
            {grade.grade_value}
          </p>
          {grade.comments && <p style={{ color: 'var(--muted)', margin: 0 }}>{grade.comments}</p>}
        </div>
      )}
    </Card>
  );
}