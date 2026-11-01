import { useEffect, useState } from 'react';
import * as studentsApi from '../../../api/students.api';
import styles from './AreaInterestEditor.module.css';

export default function AreaInterestEditor({ value, onSaved }) {
  const [areaInterest, setAreaInterest] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { setAreaInterest(value || ''); }, [value]);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await studentsApi.updateMyAreaInterest(areaInterest.trim());
      onSaved?.(response.data.area_interest || '');
      setMessage('Area of interest updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.card} onSubmit={save}>
      <div className={styles.header}>
        <h2>Area of interest</h2>
        <p>Tell your supervisors which skills or department you want to develop during attachment.</p>
      </div>
      <label htmlFor="area-interest" className={styles.label}>Your interests</label>
      <textarea id="area-interest" className={styles.input} value={areaInterest} onChange={(event) => setAreaInterest(event.target.value)} maxLength={300} rows={3} placeholder="For example, networking, software development or technical support" disabled={saving} />
      <div className={styles.footer}>
        <span className={styles.count}>{areaInterest.length}/300</span>
        <button type="submit" className={styles.button} disabled={saving || areaInterest.trim() === (value || '')}>{saving ? 'Saving…' : 'Save interests'}</button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}
    </form>
  );
}
