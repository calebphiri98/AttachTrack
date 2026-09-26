import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import * as submissionsApi from '../../../api/submissions.api';

export default function SubmissionsSection({ studentId }) {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState('');

  const isVideoSubmission = (fileType) => (fileType || '').startsWith('video/');

  useEffect(() => {
    submissionsApi
      .listSubmissionsForStudent(studentId)
      .then((res) => setSubmissions(res.data))
      .catch((err) => setError(err.message));
  }, [studentId]);

  return (
    <Card>
      <h2 className="section-title">Submissions</h2>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {submissions === null && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {submissions && submissions.length === 0 && (
        <EmptyState>No documents submitted yet.</EmptyState>
      )}
      {submissions && submissions.length > 0 && (
        <ul className="record-list">
          {submissions.map((s) => (
            <li key={s.id} className="record-list__row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
              {isVideoSubmission(s.file_type) ? (
                <video controls src={s.file_url} style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8 }} />
              ) : (
                <a href={s.file_url} target="_blank" rel="noreferrer" className="record-list__link">
                  {s.file_name}
                </a>
              )}
              <span className="record-list__date">
                {s.file_name}
                {isVideoSubmission(s.file_type) ? ' • video' : ''}
                {' • '}
                {new Date(s.submitted_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
