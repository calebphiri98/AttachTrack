import { useEffect, useState } from 'react';
import { Card } from '../../../components/shared/Card';
import StampButton from '../../../components/shared/StampButton';
import * as gradesApi from '../../../api/grades.api';

export default function GradeSection({ studentId }) {
  const [existing, setExisting] = useState(undefined); // undefined = loading, null = none yet
  const [gradeValue, setGradeValue] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    gradesApi
      .getGradeForStudent(studentId)
      .then((res) => {
        setExisting(res.data);
        setGradeValue(res.data.grade_value || '');
        setComments(res.data.comments || '');
      })
      .catch((err) => {
        if (err.statusCode === 404) {
          setExisting(null);
        } else {
          setError(err.message);
        }
      });
  }

  useEffect(load, [studentId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!gradeValue.trim()) {
      setError('Enter a grade value');
      return;
    }
    setSaving(true);
    try {
      await gradesApi.assignGrade({ studentId, gradeValue: gradeValue.trim(), comments });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="section-title">Grade</h2>
      {existing === undefined && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {existing !== undefined && (
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="inline-form__row">
            <label className="inline-form__field">
              <span>Grade</span>
              <input
                type="text"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                placeholder="e.g. A, B+, 75"
              />
            </label>
          </div>
          <label className="inline-form__field inline-form__field--full">
            <span>Comments (optional)</span>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Notes on performance"
            />
          </label>
          {error && <p className="inline-form__error">{error}</p>}
          <StampButton type="submit" loading={saving} style={{ width: 'auto', padding: '9px 20px' }}>
            {existing ? 'Update grade' : 'Assign grade'}
          </StampButton>
        </form>
      )}
    </Card>
  );
}