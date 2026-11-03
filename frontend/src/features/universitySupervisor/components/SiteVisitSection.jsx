import { useEffect, useMemo, useState } from 'react';
import * as siteVisitsApi from '../../../api/siteVisits.api';
import * as actions from '../../../offline/actions';
import SyncChip from '../../../components/shared/SyncChip';
import { useOutbox, useSyncRefresh } from '../../../offline/hooks';
import { pendingSiteVisits, syncInfo } from '../../../offline/overlays';
import { compressImage } from '../../../offline/images';
import { discardRecord } from '../../../offline/syncEngine';
import SectionShell, { EmptyBlock, Pill } from '../../../components/supervisor/SectionShell';
import ui from '../../../components/supervisor/controls.module.css';
import styles from './SiteVisitSection.module.css';

function today() {
  return new Date().toLocaleDateString('en-CA');
}

function formatVisitDate(value) {
  if (!value) return '';
  return new Date(`${String(value).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function SiteVisitSection({ studentId, studentName }) {
  const [visits, setVisits] = useState([]);
  const [schedule, setSchedule] = useState({ visitDate: '', visitTime: '09:00', audience: 'both' });
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [completion, setCompletion] = useState({});
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

  async function scheduleVisit(event) {
    event.preventDefault();
    setError(''); setNotice(''); setScheduleBusy(true);
    try {
      await siteVisitsApi.scheduleSiteVisit({ studentId, ...schedule });
      setNotice('Visit scheduled. The selected recipients were notified according to their preferences.');
      await loadVisits();
    } catch (err) { setError(err.message); }
    finally { setScheduleBusy(false); }
  }

  async function finishVisit(event, visit) {
    event.preventDefault();
    setError(''); setNotice(''); setSaving(true);
    const details = completion[visit.id] || {};
    try {
      await siteVisitsApi.completeSiteVisit(visit.id, details);
      setNotice('Visit completed and assessment recorded for authorised staff.');
      setCompletion((previous) => ({ ...previous, [visit.id]: {} }));
      await loadVisits();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const total = visits.length + pending.length;
  const description = total > 0
    ? `${total} visit${total === 1 ? '' : 's'} recorded`
    : 'Record each visit you make to the student’s workplace';

  return (
    <SectionShell title="Site visits" description={description}>
      <form className={`${ui.form} ${ui.panel}`} onSubmit={scheduleVisit}>
        <h3 className={ui.panelTitle}>Schedule a workplace visit</h3>
        <label className={ui.field}><span className={ui.label}>Planned date</span><input className={ui.input} type="date" value={schedule.visitDate} min={today()} onChange={(event) => setSchedule({ ...schedule, visitDate: event.target.value })} required /></label>
        <label className={ui.field}><span className={ui.label}>Time (local)</span><input className={ui.input} type="time" value={schedule.visitTime} onChange={(event) => setSchedule({ ...schedule, visitTime: event.target.value })} required /></label>
        <label className={ui.field}><span className={ui.label}>Notify</span><select className={ui.input} value={schedule.audience} onChange={(event) => setSchedule({ ...schedule, audience: event.target.value })}><option value="student">Student only</option><option value="industry">Industrial Supervisor only</option><option value="both">Both</option></select></label>
        <p className={styles.meta}>Only the selected recipients will receive a notification. The planned visit will be visible in their site visit section.</p>
        <div className={ui.actions}><button type="submit" className="btn btn--primary" disabled={scheduleBusy}>{scheduleBusy ? 'Scheduling…' : 'Schedule visit'}</button></div>
      </form>
      <form onSubmit={handleSubmit} className={`${ui.form} ${ui.panel}`}>
        <h3 className={ui.panelTitle}>Record a visit</h3>

        <label className={ui.field}>
          <span className={ui.label}>Visit date</span>
          <input
            className={ui.input}
            type="date"
            value={form.visitDate}
            max={today()}
            onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
            required
          />
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Visit notes</span>
          <textarea
            className={ui.textarea}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="What did you observe during the visit?"
            rows={4}
          />
        </label>

        <label className={styles.drop}>
          <input
            key={photoKey}
            className={styles.dropInput}
            type="file"
            accept="image/*"
            onChange={handlePhoto}
          />
          <span className={styles.dropTitle}>{photo ? photo.name : 'Add a photo (optional)'}</span>
          <span className={styles.dropHint}>Photos are shrunk automatically for weak connections</span>
        </label>

        {error && <p className={ui.error} role="alert">{error}</p>}
        {notice && <p className={ui.message} role="status">{notice}</p>}

        <div className={ui.actions}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving && <span className={ui.spinner} aria-hidden="true" />}
            Record site visit
          </button>
        </div>
      </form>

      <div>
        <h3 className={ui.subTitle}>
          Visit history
          {!loading && <span className={ui.count}>{total}</span>}
        </h3>

        {loading && <p className={ui.loading}>Loading visits…</p>}

        {!loading && total === 0 && (
          <EmptyBlock icon="pin" title="No site visits recorded yet">
            Visits you record above will appear here.
          </EmptyBlock>
        )}

        {!loading && total > 0 && (
          <ul className={ui.list}>
            {pending.map((record) => (
              <li key={record.id} className={`${styles.visit} ${styles.visitPending}`}>
                <div className={styles.visitHead}>
                  <strong className={styles.visitDate}>
                    {formatVisitDate(record.payload.visitDate)}
                  </strong>
                  <SyncChip sync={syncInfo(record)} />
                </div>
                {record.payload.notes && <p className={styles.notes}>{record.payload.notes}</p>}
                {record.files.length > 0 && (
                  <span className={styles.meta}>
                    Photo waiting to upload: {record.files[0].name}
                  </span>
                )}
                {record.status === 'failed' && (
                  <div className={ui.actions}>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => discardRecord(record.id)}
                    >
                      Discard
                    </button>
                  </div>
                )}
              </li>
            ))}

            {visits.map((visit) => (
              <li key={visit.id} className={styles.visit}>
                <div className={styles.visitHead}>
                  <strong className={styles.visitDate}>{formatVisitDate(visit.visit_date)}</strong>
                  {visit.supervisor_name && <Pill tone="info">{visit.supervisor_name}</Pill>}
                </div>
                <span className={styles.meta}>{visit.status === 'scheduled' ? `Scheduled${visit.visit_time ? ` at ${visit.visit_time}` : ''}` : 'Completed'}</span>
                {visit.notes && <p className={styles.notes}>{visit.notes}</p>}
                {visit.score !== null && visit.score !== undefined && <p className={styles.meta}>Site visit assessment: {visit.score}/100 (staff only; separate from final grade)</p>}
                {visit.status === 'scheduled' && (
                  <form className={ui.form} onSubmit={(event) => finishVisit(event, visit)}>
                    <label className={ui.field}><span className={ui.label}>Visit findings</span><textarea className={ui.textarea} rows={3} value={completion[visit.id]?.notes || ''} onChange={(event) => setCompletion({ ...completion, [visit.id]: { ...completion[visit.id], notes: event.target.value } })} /></label>
                    <label className={ui.field}><span className={ui.label}>Visit assessment (0–100, optional)</span><input className={ui.input} type="number" min="0" max="100" step="0.01" value={completion[visit.id]?.score || ''} onChange={(event) => setCompletion({ ...completion, [visit.id]: { ...completion[visit.id], score: event.target.value } })} /></label>
                    <label className={ui.field}><span className={ui.label}>Photo (optional)</span><input className={ui.input} type="file" accept="image/*" onChange={(event) => setCompletion({ ...completion, [visit.id]: { ...completion[visit.id], photo: event.target.files?.[0] || null } })} /></label>
                    <div className={ui.actions}><button className="btn btn--primary" type="submit" disabled={saving}>Complete visit</button></div>
                  </form>
                )}
                {visit.photo_url && (
                  <img className={styles.photo} src={visit.photo_url} alt="Site visit" />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionShell>
  );
}
