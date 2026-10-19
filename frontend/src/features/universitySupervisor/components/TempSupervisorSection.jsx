import { useEffect, useState } from 'react';
import * as tempSupervisorsApi from '../../../api/tempSupervisors.api';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';
import SectionShell, { EmptyBlock, Pill } from '../../../components/supervisor/SectionShell';
import ui from '../../../components/supervisor/controls.module.css';
import styles from './TempSupervisorSection.module.css';

export default function TempSupervisorSection({ studentId }) {
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [industrySupervisors, setIndustrySupervisors] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  function loadCurrent() {
    setLoading(true);
    tempSupervisorsApi
      .getCurrentTempSupervisor(studentId)
      .then((res) => setCurrent(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCurrent();
    industrySupervisorsApi
      .listAll()
      .then((res) => setIndustrySupervisors(res.data))
      .catch((err) => setError(err.message));
  }, [studentId]);

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedId) return;
    setError('');
    setActionLoading(true);
    try {
      await tempSupervisorsApi.assignTempSupervisor({
        studentId,
        industrySupervisorId: selectedId,
        department,
      });
      setSelectedId('');
      setDepartment('');
      loadCurrent();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEnd() {
    setError('');
    setActionLoading(true);
    try {
      await tempSupervisorsApi.endTempSupervisor(studentId);
      loadCurrent();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <SectionShell
      title="Temporary supervisor"
      description="Hand day-to-day supervision to another industry supervisor when needed"
    >
      {error && <p className={ui.error} role="alert">{error}</p>}
      {loading && <p className={ui.loading}>Loading assignment…</p>}

      {!loading && current && (
        <div className={styles.current}>
          <div className={styles.currentHead}>
            <Pill tone="ok">Active</Pill>
            <span className={styles.since}>
              Since {new Date(current.start_date).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <p className={styles.detail}>Assigned by {current.assigned_by_name}</p>
          {current.department && (
            <p className={styles.detailMuted}>Department: {current.department}</p>
          )}
          <div className={ui.actions}>
            <button
              type="button"
              className={`btn btn--ghost ${styles.endButton}`}
              onClick={handleEnd}
              disabled={actionLoading}
            >
              End temporary assignment
            </button>
          </div>
        </div>
      )}

      {!loading && !current && (
        <EmptyBlock icon="user" title="No active temporary supervisor">
          Assign an industry supervisor below if the student needs cover.
        </EmptyBlock>
      )}

      {industrySupervisors && (
        <form onSubmit={handleAssign} className={`${styles.assignForm} ${ui.panel}`}>
          <label className={ui.field}>
            <span className={ui.label}>Industry supervisor</span>
            <select
              className={`${ui.input} ${ui.select}`}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              <option value="">Select industry supervisor</option>
              {industrySupervisors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </label>

          <label className={ui.field}>
            <span className={ui.label}>Department (optional)</span>
            <input
              className={ui.input}
              type="text"
              placeholder="For example, Finance"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </label>

          <button type="submit" className="btn btn--primary" disabled={actionLoading}>
            {actionLoading && <span className={ui.spinner} aria-hidden="true" />}
            {current ? 'Reassign' : 'Assign'}
          </button>
        </form>
      )}
    </SectionShell>
  );
}
