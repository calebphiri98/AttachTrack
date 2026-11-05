import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as placementsApi from '../../../api/placements.api';
import { saveAttachmentPeriod } from '../../../api/attachmentPeriod.api';
import styles from './AttachmentDatesPage.module.css';

function normalDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

export default function AttachmentDatesPage() {
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    placementsApi.getPlacementOverview()
      .then((response) => {
        if (!active) return;
        const rows = response.data || [];
        setItems(rows);
        setDrafts(Object.fromEntries(rows.map((row) => [row.placement_id, {
          startDate: normalDate(row.attachment_start_date),
          endDate: normalDate(row.attachment_end_date),
        }]).filter(([id]) => Boolean(id))));
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function save(placementId) {
    const values = drafts[placementId] || {};
    setSaving(placementId);
    setError('');
    setNotice('');
    try {
      const result = await saveAttachmentPeriod(placementId, values.startDate, values.endDate);
      setItems((current) => current.map((row) => row.placement_id === placementId ? {
        ...row,
        attachment_start_date: result.data.attachment_start_date,
        attachment_end_date: result.data.attachment_end_date,
      } : row));
      setNotice('Attachment dates saved. The student countdown will reflect these dates.');
    } catch (err) {
      setError(err.message || 'Unable to update the attachment period');
    } finally {
      setSaving(null);
    }
  }

  const filtered = items.filter((row) => row.status === 'confirmed' && (
    (row.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (row.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (row.email || '').toLowerCase().includes(search.toLowerCase())
  ));

  return (
    <PortalLayout eyebrow="Coordinator" title="Attachment dates">
      <div className={styles.page}>
        <p>Set the actual attachment period for each confirmed placement. A confirmation date is not the start date.</p>
        <label className={styles.search}>Search student or organisation
          <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search confirmed placements" />
        </label>
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        {loading ? <p>Loading placements...</p> : filtered.length === 0 ? <p>No confirmed placements match your search.</p> : (
          <div className={styles.rows}>
            {filtered.map((row) => {
              const current = drafts[row.placement_id] || { startDate: '', endDate: '' };
              return (
                <form className={styles.row} key={row.placement_id} onSubmit={(event) => { event.preventDefault(); save(row.placement_id); }}>
                  <div className={styles.identity}><strong>{row.name}</strong><span>{row.company_name}</span></div>
                  <label>Start date<input type="date" required value={current.startDate} onChange={(event) => setDrafts((old) => ({ ...old, [row.placement_id]: { ...current, startDate: event.target.value } }))} /></label>
                  <label>End date<input type="date" required min={current.startDate || undefined} value={current.endDate} onChange={(event) => setDrafts((old) => ({ ...old, [row.placement_id]: { ...current, endDate: event.target.value } }))} /></label>
                  <button type="submit" disabled={saving === row.placement_id}>{saving === row.placement_id ? 'Saving...' : 'Save dates'}</button>
                </form>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
