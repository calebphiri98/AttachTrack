import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import LedgerField from '../../../components/shared/LedgerField';
import StampButton from '../../../components/shared/StampButton';
import ExportButton from '../../../components/shared/ExportButton';
import SectionTabs from '../../../components/shared/SectionTabs';
import { Card, EmptyState } from '../../../components/shared/Card';
import FeedbackSection from '../components/FeedbackSection';
import AttendanceSection from '../components/AttendanceSection';
import SubmissionsSection from '../components/SubmissionsSection';
import GradesSection from '../components/GradesSection';
import LogbookSection from '../components/LogbookSection';
import * as studentsApi from '../../../api/students.api';
import * as reportsApi from '../../../api/reports.api';
import * as placementsApi from '../../../api/placements.api';
import '../../../styles/portalSections.css';
import './StudentDashboardPage.css';

const SECTIONS = [
  { id: 'submissions', label: 'Submissions' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'grades', label: 'Final result' },
  { id: 'logbook', label: 'Logbook' },
];

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [placement, setPlacement] = useState(undefined);
  const [location, setLocation] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
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
    placementsApi
      .getMyPlacement()
      .then((res) => setPlacement(res.data))
      .catch(() => setPlacement(null));
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
      {error && <p className="student-error">{error}</p>}

      {profile && profile.link_status !== 'linked' && (
        <p className="student-notice">
          Waiting to be linked to a supervisor. Once your industry or university supervisor
          adds you, this will update automatically.
        </p>
      )}

      {profile && (
        <Card>
          <h2 className="section-title">Your placement</h2>
          {placement === undefined && <p style={{ color: 'var(--muted)' }}>Loading...</p>}
          {placement === null && (
            <EmptyState>Your placement has not been confirmed yet.</EmptyState>
          )}
          {placement && (
            <div>
              <p style={{ fontWeight: 700, margin: '0 0 4px', color: 'var(--ink)' }}>
                {placement.company_name}
              </p>
              {placement.industry_sector && (
                <p style={{ margin: '0 0 4px', color: 'var(--muted)' }}>
                  {placement.industry_sector}
                </p>
              )}
              {placement.address && (
                <p style={{ margin: '0 0 4px', color: 'var(--muted)' }}>{placement.address}</p>
              )}
              {placement.confirmed_at && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Confirmed on {new Date(placement.confirmed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {profile && (
        <section className="student-location">
          <form onSubmit={handleLocationSave} className="student-location__form">
            <LedgerField
              label="Placement location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Add your site address or location"
            />
            <StampButton type="submit" loading={savingLocation}>
              Save location
            </StampButton>
          </form>
        </section>
      )}

      {profile && (
        <>
          <SectionTabs
            items={SECTIONS}
            activeId={activeSection}
            onChange={setActiveSection}
            label="Student sections"
          />

          {activeSection === 'submissions' && (
            <SubmissionsSection canSubmit={profile.link_status === 'linked'} />
          )}
          {activeSection === 'attendance' && <AttendanceSection studentId={profile.id} />}
          {activeSection === 'feedback' && <FeedbackSection studentId={profile.id} />}
          {activeSection === 'grades' && <GradesSection studentId={profile.id} />}
          {activeSection === 'logbook' && <LogbookSection />}
        </>
      )}
    </PortalLayout>
  );
}