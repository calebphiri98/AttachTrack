import { useEffect, useState } from 'react';
import * as api from '../../../api/siteVisits.api';

export default function SiteVisitReadOnly({ studentId }) {
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getSiteVisits(studentId).then((result) => { if (active) setVisits(result.data || []); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId]);
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h3>University site visits</h3>
      {loading && <p>Loading site visits…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && visits.length === 0 && <p>No site visits scheduled or recorded.</p>}
      {visits.map((visit) => (
        <article key={visit.id} style={{ border: '1px solid var(--border, #ddd)', borderRadius: 10, padding: 16 }}>
          <strong>{String(visit.visit_date).slice(0, 10)}{visit.visit_time ? ` · ${visit.visit_time}` : ''}</strong>
          <p>{visit.status === 'scheduled' ? 'Upcoming visit' : 'Completed visit'}</p>
          {visit.supervisor_name && <p>University supervisor: {visit.supervisor_name}</p>}
          {visit.notes && <p>{visit.notes}</p>}
        </article>
      ))}
    </section>
  );
}
