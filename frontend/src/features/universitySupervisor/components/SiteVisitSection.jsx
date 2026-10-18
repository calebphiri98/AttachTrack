import { useEffect, useMemo, useState } from 'react';
import * as siteVisitsApi from '../../../api/siteVisits.api';
import * as actions from '../../../offline/actions';
import StampButton from '../../../components/shared/StampButton';
import SyncChip from '../../../components/shared/SyncChip';
import { useOutbox, useSyncRefresh } from '../../../offline/hooks';
import { pendingSiteVisits, syncInfo } from '../../../offline/overlays';
import { compressImage } from '../../../offline/images';
import { discardRecord } from '../../../offline/syncEngine';

function today() {
  return new Date().toLocaleDateString('en-CA');
}

export default function SiteVisitSection({ studentId, studentName }) {
  const [visits, setVisits] = useState([]);
  const [form, setForm] = useState({ visitDate: today(), notes: '' });
  const [photo, setPhoto] = useState(null);
  const [photoKey, setPhotoKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const outbox = useOutbox();
  const pending = useMemo(() => pendingSiteVisits(outbox, studentId), [outbox, studentId]);

  async function loadVisits() {
    try {
      const res = await siteVisitsApi.getSiteVisits(studentId);
      setVisits(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadVisits();
  }, [studentId]);

  useSyncRefresh(loadVisits);

  async function handlePhoto(event) {
    const chosen = event.target.files?.[0] || null;
    setPhoto(chosen ? await compressImage(chosen) : null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const result = await actions.recordSiteVisit({
        studentId,
        studentName,
        visitDate: form.visitDate,
        notes: form.notes,
        photo,
      });
      setForm({ visitDate: today(), notes: '' });
      setPhoto(null);
      setPhotoKey((key) => key + 1);
      setNotice(
        result.queued
          ? 'Saved on this device. It will sync automatically when the connection allows.'
          : 'Site visit recorded.'
      );
      await loadVisits();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const fieldStyle = { padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' };

  return (
    <section
      style={{
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Site visits</h3>

      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}
      {notice && <p className="pending-note">{notice}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <input
          type="date"
          value={form.visitDate}
          max={today()}
          onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
          style={fieldStyle}
          required
        />
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Visit notes"
          rows={4}
          style={{ ...fieldStyle, resize: 'vertical' }}
        />
        <input key={photoKey} type="file" accept="image/*" onChange={handlePhoto} />
        <StampButton type="submit" loading={saving}>
          Record site visit
        </StampButton>
      </form>

      {loading ? (
        <p>Loading visits...</p>
      ) : visits.length === 0 && pending.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No site visits recorded yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {pending.map((record) => (
            <div
              key={record.id}
              style={{ border: '1px dashed var(--line)', borderRadius: 12, padding: 12 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <strong>{record.payload.visitDate}</strong>
                <SyncChip sync={syncInfo(record)} />
              </div>
              {record.payload.notes && (
                <div style={{ whiteSpace: 'pre-wrap' }}>{record.payload.notes}</div>
              )}
              {record.files.length > 0 && (
                <div className="pending-note">Photo waiting to upload: {record.files[0].name}</div>
              )}
              {record.status === 'failed' && (
                <button type="button" className="btn btn--ghost" onClick={() => discardRecord(record.id)}>
                  Discard
                </button>
              )}
            </div>
          ))}

          {visits.map((visit) => (
            <div key={visit.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <strong>{visit.visit_date}</strong>
                <span style={{ color: 'var(--muted)' }}>{visit.supervisor_name}</span>
              </div>
              {visit.notes && <div style={{ whiteSpace: 'pre-wrap' }}>{visit.notes}</div>}
              {visit.photo_url && (
                <img
                  src={visit.photo_url}
                  alt="Site visit"
                  style={{
                    width: '100%',
                    maxHeight: 220,
                    objectFit: 'cover',
                    borderRadius: 12,
                    marginTop: 12,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
