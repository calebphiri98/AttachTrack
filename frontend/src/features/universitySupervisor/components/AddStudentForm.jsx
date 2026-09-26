import { useState } from 'react';
import LedgerField from '../../../components/shared/LedgerField';
import StampButton from '../../../components/shared/StampButton';
import * as universitySupervisorsApi from '../../../api/universitySupervisors.api';

export default function AddStudentForm({ onAdded, onCancel }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !email.trim()) {
      setError('Enter the student\'s name and email');
      return;
    }
    setSaving(true);
    try {
      const res = await universitySupervisorsApi.addStudent({ name: name.trim(), email: email.trim() });
      onAdded(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <LedgerField label="Student name" value={name} onChange={(e) => setName(e.target.value)} />
      <LedgerField label="Student email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <p style={{ color: 'var(--error)', fontSize: '0.88rem', marginBottom: 16 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 12 }}>
        <StampButton type="submit" loading={saving} style={{ width: 'auto', padding: '10px 20px' }}>
          Add student
        </StampButton>
        <button
          type="button"
          onClick={onCancel}
          style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', font: 'inherit' }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}