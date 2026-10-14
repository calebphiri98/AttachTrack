import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StampButton from '../../../components/shared/StampButton';
import * as logbooksApi from '../../../api/logbooks.api';
import './LogbookSection.css';

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatEntryDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function LogbookSection({ studentId = null }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ entryDate: todayValue(), activity: '', notes: '' });
  const [file, setFile] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [saving, setSaving] = useState(false);

  async function loadEntries() {
    try {
      const res = studentId
        ? await logbooksApi.getStudentLogbook(studentId)
        : await logbooksApi.getMyLogbook();
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
    if (studentId) return;
    setSaving(true);
    setError('');
    try {
      await logbooksApi.createLogbookEntry({ ...form, file });
      setForm({ entryDate: todayValue(), activity: '', notes: '' });
      setFile(null);
      setFileKey((key) => key + 1);
      await loadEntries();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="section-title">Logbook</h2>

      {error && <p className="logbook-error">{error}</p>}

      {!studentId && (
        <form onSubmit={handleSubmit} className="logbook-form">
          <label className="logbook-form__field">
            <span>Date</span>
            <input
              type="date"
              value={form.entryDate}
              onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
              required
            />
          </label>

          <label className="logbook-form__field">
            <span>Activities</span>
            <textarea
              value={form.activity}
              onChange={(e) => setForm({ ...form, activity: e.target.value })}
              placeholder="Describe activities or tasks completed"
              rows={3}
              required
            />
          </label>

          <label className="logbook-form__field">
            <span>Notes (optional)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes or reflections"
              rows={3}
            />
          </label>

          <label className="logbook-form__field">
            <span>Attachment (optional)</span>
            <input
              key={fileKey}
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>

          <div className="logbook-form__actions">
            <StampButton type="submit" loading={saving}>
              Add logbook entry
            </StampButton>
          </div>
        </form>
      )}

      {loading && <p className="logbook-loading">Loading logbook...</p>}

      {!loading && entries.length === 0 && <EmptyState>No logbook entries yet.</EmptyState>}

      {!loading && entries.length > 0 && (
        <ul className="logbook-list">
          {entries.map((entry) => (
            <li key={entry.id} className="logbook-entry">
              <div className="logbook-entry__head">
                <strong className="logbook-entry__date">{formatEntryDate(entry.entry_date)}</strong>
                {entry.attachment_url && (
                  <a
                    href={entry.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="logbook-entry__link"
                  >
                    View attachment
                  </a>
                )}
              </div>
              <p className="logbook-entry__activity">{entry.activity}</p>
              {entry.notes && <p className="logbook-entry__notes">{entry.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}