import { useEffect, useState } from 'react';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import * as tempSupervisorsApi from '../../../api/tempSupervisors.api';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';

export default function TempSupervisorSection({ studentId }) {
  const [current, setCurrent] = useState(null);
  const [industrySupervisors, setIndustrySupervisors] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  function loadCurrent() {
    tempSupervisorsApi
      .getCurrentTempSupervisor(studentId)
      .then((res) => setCurrent(res.data))
      .catch((err) => setError(err.message));
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
    <Card>
      <h2 className="section-title">Temporary Supervisor</h2>
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {current === null && !error && <p style={{ color: 'var(--muted)' }}>Loading...</p>}

      {current === undefined && null}

      {current && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ marginBottom: 8 }}>
            <StatusBadge>Active</StatusBadge>
          </p>
          <p style={{ margin: '4px 0' }}>Assigned by {current.assigned_by_name}</p>
          {current.department && <p style={{ margin: '4px 0' }}>Department: {current.department}</p>}
          <p style={{ margin: '4px 0', color: 'var(--muted)' }}>
            Since {new Date(current.start_date).toLocaleDateString()}
          </p>
          <button onClick={handleEnd} disabled={actionLoading} style={{ marginTop: 12 }}>
            End temporary assignment
          </button>
        </div>
      )}

      {!current && industrySupervisors && (
        <EmptyState>No active temporary supervisor.</EmptyState>
      )}

      {industrySupervisors && (
        <form onSubmit={handleAssign} style={{ marginTop: 16 }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            required
            style={{ marginRight: 8 }}
          >
            <option value="">Select industry supervisor</option>
            {industrySupervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Department (optional)"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{ marginRight: 8 }}
          />
          <button type="submit" disabled={actionLoading}>
            {current ? 'Reassign' : 'Assign'}
          </button>
        </form>
      )}
    </Card>
  );
}
