import { useEffect, useState } from 'react';
import * as tempSupervisorsApi from '../../../api/tempSupervisors.api';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';
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
    <section className={styles.card}>
      <h2 className={styles.title}>Temporary Supervisor</h2>

      {error && <p className={styles.error}>{error}</p>}

      {loading && <p className={styles.loading}>Loading...</p>}

      {!loading && current && (
        <div className={styles.current}>
          <span className={styles.badge}>Active</span>
          <p className={styles.detail}>Assigned by {current.assigned_by_name}</p>
          {current.department && <p className={styles.detail}>Department: {current.department}</p>}
          <p className={styles.detailMuted}>
            Since {new Date(current.start_date).toLocaleDateString()}
          </p>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={handleEnd}
            disabled={actionLoading}
          >
            {actionLoading && <span className={styles.spinner} aria-hidden="true" />}
            End temporary assignment
          </button>
        </div>
      )}

      {!loading && !current && <p className={styles.empty}>No active temporary supervisor.</p>}

      {industrySupervisors && (
        <>
          <hr className={styles.divider} />

          <form onSubmit={handleAssign} className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Industry supervisor</span>
              <select
                className={styles.select}
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

            <label className={styles.field}>
              <span className={styles.label}>Department (optional)</span>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. Finance"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </label>

            <button type="submit" className={styles.button} disabled={actionLoading}>
              {actionLoading && <span className={styles.spinner} aria-hidden="true" />}
              {current ? 'Reassign' : 'Assign'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}