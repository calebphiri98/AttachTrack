import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';
import './StudentsListPage.css';

export default function StudentsListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    industrySupervisorsApi
      .listMyStudents()
      .then((res) => setStudents(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <PortalLayout eyebrow="Your students" title="Students">
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {students === null && !error && <p style={{ color: 'var(--muted)' }}>Loading students...</p>}

      {students && students.length === 0 && (
        <Card>
          <EmptyState>
            No students have been assigned to you yet. The coordinator allocates students to
            supervisors.
          </EmptyState>
        </Card>
      )}

      {students && students.length > 0 && (
        <Card>
          <ul className="student-list">
            {students.map((student) => (
              <li key={student.id} className="student-list__row">
                <div>
                  <p className="student-list__name">{student.name || student.email}</p>
                  {student.name && <p className="student-list__email">{student.email}</p>}
                </div>
                <div className="student-list__meta">
                  <StatusBadge>{student.link_status}</StatusBadge>
                  <button
                    className="student-list__view"
                    onClick={() => navigate(`/industry/students/${student.id}`, { state: { student } })}
                  >
                    View &rarr;
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PortalLayout>
  );
}
