import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import LedgerField from '../../../components/shared/LedgerField';
import StampButton from '../../../components/shared/StampButton';
import FeedbackSection from '../components/FeedbackSection';
import AttendanceSection from '../components/AttendanceSection';
import SubmissionsSection from '../components/SubmissionsSection';
import GradesSection from '../components/GradesSection';
import LogbookSection from '../components/LogbookSection';
import ExportButton from '../../../components/shared/ExportButton';
import * as studentsApi from '../../../api/students.api';
import * as reportsApi from '../../../api/reports.api';
import '../../../styles/portalSections.css';

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [location, setLocation] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [error, setError] = useState('');

  function loadProfile() {
    studentsApi
      .getMyStudentProfile()
      .then((res) => {
        setProfile(res.data);
        setLocation(res.data.location || '');
      })
      .catch((err) => setError(err.message));
  }

  async function handleExport() {
    if (!profile) return;
    try {
      const csv = await reportsApi.exportStudentReport(profile.id);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${profile.name || 'student'}-report.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleLocationSave(e) {
    e.preventDefault();
    if (!profile) return;
    setSavingLocation(true);
    try {
      const res = await studentsApi.updateLocation({ location });
      setProfile((prev) => ({ ...prev, location: res.data.location }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingLocation(false);
    }
  }

  return (
    <PortalLayout
      eyebrow="Your attachment"
      title={profile ? profile.name : 'Dashboard'}
      actions={
        profile ? (
          <>
            <StatusBadge>{profile.link_status}</StatusBadge>
            <ExportButton onClick={handleExport}>Export report</ExportButton>
          </>
        ) : null
      }
    >
      {error && <p style={{ color: 'var(--error)' }}>{error}</p>}

      {profile && profile.link_status !== 'linked' && (
        <p style={{ color: 'var(--muted)', marginTop: -16, marginBottom: 24 }}>
          Waiting to be linked to a supervisor. Once your industry or university supervisor
          adds you, this will update automatically.
        </p>
      )}

      {profile && (
        <form onSubmit={handleLocationSave} className="inline-form" style={{ marginBottom: 24 }}>
          <LedgerField
            label="Placement location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Add your site address or location"
          />
          <StampButton type="submit" loading={savingLocation} style={{ width: 'auto', padding: '9px 20px' }}>
            Save location
          </StampButton>
        </form>
      )}

      {profile && (
        <>
          <SubmissionsSection canSubmit={profile.link_status === 'linked'} />
          <AttendanceSection studentId={profile.id} />
          <FeedbackSection studentId={profile.id} />
          <GradesSection studentId={profile.id} />
          <LogbookSection />
        </>
      )}
    </PortalLayout>
  );
}