import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import * as resultsApi from '../../../api/results.api';

export default function GradesSection() {
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState('');

  useEffect(() => {
    resultsApi
      .getMyResult()
      .then((res) => setResult(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <Card>
      <h2 className="section-title">Final result</h2>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {result === undefined && !error && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
      {result === null && <EmptyState>Your final result has not been released yet.</EmptyState>}
      {result && (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.6rem',
              margin: '0 0 8px',
              color: 'var(--ink)',
            }}
          >
            {result.final_percent}%
          </p>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Released on {new Date(result.released_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </Card>
  );
}