import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../../components/shared/PortalLayout';
import * as assessmentsApi from '../../../api/assessments.api';
import './AssessmentPages.css';

const STATUS_LABELS = {
  not_started: 'Not started',
  draft: 'Draft saved',
  submitted: 'Submitted',
};

const ACTION_LABELS = {
  not_started: 'Start assessment',
  draft: 'Continue',
  submitted: 'View',
};

export default function IndustryAssessmentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    assessmentsApi
      .listIndustryStudents()
      .then((res) => setStudents(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PortalLayout eyebrow="Industrial supervisor" title="Student assessments">
      {error && <p className="assess-error">{error}</p>}
      {loading && <p className="assess-empty">Loading students...</p>}

      {!loading && !error && students.length === 0 && (
        <p className="assess-empty">No students are assigned to you yet.</p>
      )}

      {students.length > 0 && (
        <div className="assess-table-wrap">
          <table className="assess-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Organisation</th>
                <th>Status</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{student.name}</div>
                    <div className="assess-table__muted">{student.programme || student.email}</div>
                  </td>
                  <td>{student.company_name || '-'}</td>
                  <td>
                    <span className={`assess-chip assess-chip--${student.status === 'not_started' ? 'none' : student.status}`}>
                      {STATUS_LABELS[student.status]}
                    </span>
                  </td>
                  <td>
                    {student.status === 'submitted' && student.max_total
                      ? `${student.total_marks} / ${student.max_total}`
                      : '-'}
                  </td>
                  <td>
                    <Link
                      to={`/industry/assessments/${student.student_id}`}
                      className={student.status === 'submitted' ? 'btn btn--ghost' : 'btn btn--primary'}
                    >
                      {ACTION_LABELS[student.status]}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PortalLayout>
  );
}