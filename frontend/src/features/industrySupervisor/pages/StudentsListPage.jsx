import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import { Card, EmptyState } from '../../../components/shared/Card';
import StatusBadge from '../../../components/shared/StatusBadge';
import StampButton from '../../../components/shared/StampButton';
import AddStudentForm from '../components/AddStudentForm';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';
import './StudentsListPage.css';

export default function StudentsListPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  function loadStudents() {
    industrySupervisorsApi
      .listMyStudents()
      .then((res) => setStudents(res.data))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadStudents();
  }, []);

  function handleAdded(student) {
    setShowAddForm(false);
    setStudents((prev) => {
      const withoutDuplicate = (prev || []).filter((s) => s.id !== student.id);
      return [student, ...withoutDuplicate];
    });
  }

  return (
    <PortalLayout
      eyebrow="Your students"
      title="Students"
      actions={
        !showAddForm && (
          <StampButton onClick={() => setShowAddForm(true)} style={{ width: 'auto', padding: '10px 20px' }}>
            Add student
          </StampButton>
        )
      }
    >
      {showAddForm && (
        <Card>
          <AddStudentForm onAdded={handleAdded} onCancel={() => setShowAddForm(false)} />
        </Card>
      )}

      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {students === null && !error && <p style={{ color: 'var(--muted)' }}>Loading students…</p>}

      {students && students.length === 0 && (
        <Card>
          <EmptyState>
            No students yet. Add one by name and email — they'll link up automatically once
            they register.
          </EmptyState>
        </Card>
      )}

      {students && students.length > 0 && (
        <Card>
          <ul className="student-list">
            {students.map((student) => (
              <li key={student.id} className="student-list__row">
                <div>
                  <p className="student-list__name">{student.name}</p>
                  <p className="student-list__email">{student.email}</p>
                </div>
                <div className="student-list__meta">
                  <StatusBadge>{student.link_status}</StatusBadge>
                  <button
                    className="student-list__view"
                    onClick={() => navigate(`/industry/students/${student.id}`, { state: { student } })}
                  >
                    View →
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
