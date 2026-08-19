import { useEffect, useState } from 'react';
import * as siteVisitsApi from '../../../api/siteVisits.api';
import StampButton from '../../../components/shared/StampButton';

export default function SiteVisitSection({ studentId }) {
  const [visits, setVisits] = useState([]);
  const [form, setForm] = useState({ visitDate: new Date().toISOString().slice(0, 10), notes: '' });
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
    loadVisits();
  }, [studentId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await siteVisitsApi.saveSiteVisit({ studentId, ...form, photo });
      setForm({ visitDate: new Date().toISOString().slice(0, 10), notes: '' });
      setPhoto(null);
      await loadVisits();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 20, padding: 20, marginBottom: 24 }}>
      <h3 style={{ marginTop: 0 }}>Site visits</h3>

      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
        <input type="date" value={form.visitDate} onChange={(e) => setForm({ ...form, visitDate: e.target.value })} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)' }} required />
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Visit notes" rows={4} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', resize: 'vertical' }} />
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        <StampButton type="submit" loading={saving}>Record site visit</StampButton>
      </form>

      {loading ? (
        <p>Loading visits…</p>
      ) : visits.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No site visits recorded yet.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {visits.map((visit) => (
            <div key={visit.id} style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                <strong>{visit.visit_date}</strong>
                <span style={{ color: 'var(--muted)' }}>{visit.supervisor_name}</span>
              </div>
              {visit.notes && <div style={{ whiteSpace: 'pre-wrap' }}>{visit.notes}</div>}
              {visit.photo_url && <img src={visit.photo_url} alt="Site visit" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 12, marginTop: 12 }} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
