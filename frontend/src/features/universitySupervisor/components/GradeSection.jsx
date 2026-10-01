import { useEffect, useState } from 'react';
import * as gradesApi from '../../../api/grades.api';
import styles from './GradeSection.module.css';

export default function GradeSection({ studentId }) {
  const [existing, setExisting] = useState(undefined);
  const [gradeValue, setGradeValue] = useState('');
  const [comments, setComments] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    gradesApi
      .getGradeForStudent(studentId)
      .then((res) => {
        const grade = res.data || null;
        setExisting(grade);
        setGradeValue(grade?.grade_value || '');
        setComments(grade?.comments || '');
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
    <section className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Grade</h2>
        {existing !== undefined && (
          <span
            className={`${styles.status} ${existing ? styles.statusGraded : styles.statusPending}`}
          >
            {existing ? 'Graded' : 'Not graded yet'}
          </span>
        )}
      </div>

      {existing === undefined && !error && <p className={styles.loading}>Loading…</p>}

      {existing === undefined && error && <p className={styles.error}>{error}</p>}

      {existing !== undefined && (
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.row}>
            <label className={styles.field}>
              <span className={styles.label}>Grade</span>
              <input
                className={styles.input}
                type="text"
                value={gradeValue}
                onChange={(e) => setGradeValue(e.target.value)}
                placeholder="e.g. A, B+, 75"
              />
            </label>

            <label className={`${styles.field} ${styles.fieldFull}`}>
              <span className={styles.label}>Comments (optional)</span>
              <input
                className={styles.input}
                type="text"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Notes on performance"
              />
            </label>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.button} disabled={saving}>
              {saving && <span className={styles.spinner} aria-hidden="true" />}
              {saving ? 'Saving' : existing ? 'Update grade' : 'Assign grade'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}