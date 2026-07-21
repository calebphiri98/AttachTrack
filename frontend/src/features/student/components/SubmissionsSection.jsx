import { useEffect, useState, useRef } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StampButton from '../../../components/shared/StampButton';
import * as submissionsApi from '../../../api/submissions.api';

export default function SubmissionsSection({ canSubmit }) {
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function load() {
    submissionsApi
      .listMine()
      .then((res) => setSubmissions(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleUpload(e) {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file first');
      return;
    }
    setError('');
    setUploading(true);
    try {
      await submissionsApi.submitDocument(file);
      fileInputRef.current.value = '';
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <h2 className="section-title">Submissions</h2>

      {canSubmit ? (
        <form onSubmit={handleUpload} className="inline-form">
          <label className="inline-form__field inline-form__field--full">
            <span>Document (PDF or Word, up to 20MB)</span>
            <input type="file" ref={fileInputRef} accept=".pdf,.doc,.docx" />
          </label>
          {error && <p className="inline-form__error">{error}</p>}
          <StampButton type="submit" loading={uploading} style={{ width: 'auto', padding: '9px 20px' }}>
            Submit document
          </StampButton>
        </form>
      ) : (
        <p style={{ color: 'var(--muted)' }}>
          You'll be able to submit documents once you're linked to a supervisor.
        </p>
      )}

      <div className="section-divider" />

      {submissions === null && !error && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
      {submissions && submissions.length === 0 && <EmptyState>No submissions yet.</EmptyState>}
      {submissions && submissions.length > 0 && (
        <ul className="record-list">
          {submissions.map((s) => (
            <li key={s.id} className="record-list__row">
              <a href={s.file_url} target="_blank" rel="noreferrer" style={{ color: 'var(--stamp)' }}>
                {s.file_name}
              </a>
              <span className="record-list__date">
                {new Date(s.submitted_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}