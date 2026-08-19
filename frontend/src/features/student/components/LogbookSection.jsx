import { useEffect, useState } from 'react';
import * as logbooksApi from '../../../api/logbooks.api';
import StampButton from '../../../components/shared/StampButton';

export default function LogbookSection({ studentId = null }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ entryDate: new Date().toISOString().slice(0, 10), activity: '', notes: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function loadEntries() {
    try {
      const res = studentId ? await logbooksApi.getStudentLogbook(studentId) : await logbooksApi.getMyLogbook();
      setEntries(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
  }, [studentId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!studentId) {
      setSaving(true);
      try {
        await logbooksApi.createLogbookEntry({ ...form, file });
        setForm({ entryDate: new Date().toISOString().slice(0, 10), activity: '', notes: '' });
        setFile(null);
        await loadEntries();
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <section style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>Logbook</h3>
      </div>

      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {!studentId && (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          <input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }} />
          <textarea value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="Describe activities or tasks completed" rows={3} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', resize: 'vertical' }} required />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes or reflections" rows={3} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', resize: 'vertical' }} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <StampButton type="submit" loading={saving}>Add logbook entry</StampButton>
        </form>
      )}

      {loading ? (
        <p>Loading logbook…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No logbook entries yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', marginBottom: 8 }}>
                <strong>{entry.entry_date}</strong>
                {entry.attachment_url && (
                  <a href={entry.attachment_url} target="_blank" rel="noreferrer" style={{ color: 'var(--stamp)' }}>
                    View attachment
                  </a>
                )}
              </div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{entry.activity}</div>
              {entry.notes && <div style={{ color: 'var(--muted)', whiteSpace: 'pre-wrap', marginTop: 8 }}>{entry.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
