import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import FeedbackSection from '../components/FeedbackSection';
import AttendanceSection from '../components/AttendanceSection';
import SubmissionsSection from '../components/SubmissionsSection';
import GradesSection from '../components/GradesSection';
import * as studentsApi from '../../../api/students.api';
import '../../../styles/portalSections.css';

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    studentsApi
      .getMyStudentProfile()
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <PortalLayout
      eyebrow="Your attachment"
      title={profile ? profile.name : 'Dashboard'}
      actions={profile && <StatusBadge>{profile.link_status}</StatusBadge>}
    >
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {profile && profile.link_status !== 'linked' && (
        <p style={{ color: 'var(--muted)', marginTop: -16, marginBottom: 24 }}>
          Waiting to be linked to a supervisor. Once your industry or university supervisor
          adds you, this will update automatically.
        </p>
      )}

      {profile && (
        <>
          <SubmissionsSection canSubmit={profile.link_status === 'linked'} />
          <AttendanceSection studentId={profile.id} />
          <FeedbackSection studentId={profile.id} />
          <GradesSection studentId={profile.id} />
        </>
      )}
    </PortalLayout>
  );
}