import { useState } from 'react';
import LedgerField from '../../../components/shared/LedgerField';
import StampButton from '../../../components/shared/StampButton';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';

export default function AddStudentForm({ onAdded, onCancel }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Enter both a name and an email');
      return;
    }
    setLoading(true);
    try {
      const res = await industrySupervisorsApi.addStudent({ name, email });
      onAdded(res.data);
      setName('');
      setEmail('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 8 }}>
      <LedgerField label="Student name" value={name} onChange={(e) => setName(e.target.value)} />
      <LedgerField
        label="Student email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: 14 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <StampButton type="submit" loading={loading}>
          Add student
        </StampButton>
        <button
          type="button"
          onClick={onCancel}
          style={{
            border: '1.5px solid var(--line)',
            background: 'transparent',
            borderRadius: 6,
            padding: '0 18px',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
