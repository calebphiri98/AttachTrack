import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import StatusBadge from '../../../components/shared/StatusBadge';
import ExportButton from '../../../components/shared/ExportButton';
import SectionTabs from '../../../components/shared/SectionTabs';
import { Card, EmptyState } from '../../../components/shared/Card';
import FeedbackSection from '../components/FeedbackSection';
import AttendanceSection from '../components/AttendanceSection';
import SubmissionsSection from '../components/SubmissionsSection';
import LogbookSection from '../components/LogbookSection';
import AreaInterestEditor from '../components/AreaInterestEditor';
import AttachmentLocation from '../../../components/supervisor/AttachmentLocation';
import * as studentsApi from '../../../api/students.api';
import * as reportsApi from '../../../api/reports.api';
import * as placementsApi from '../../../api/placements.api';
import '../../../styles/portalSections.css';
import './StudentDashboardPage.css';
import styles from './StudentDashboardPage.module.css';

const SECTIONS = [
  { id: 'submissions', label: 'Submissions' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'logbook', label: 'Logbook' },
];

export default function StudentDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [placement, setPlacement] = useState(undefined);
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [error, setError] = useState('');

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
    studentsApi
      .getMyStudentProfile()
      .then((res) => setProfile(res.data))
      .catch((err) => setError(err.message));
    placementsApi
      .getMyPlacement()
      .then((res) => setPlacement(res.data))
      .catch(() => setPlacement(null));
  }, []);

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
          Waiting for the coordinator to assign your industry and university supervisors. This
          page updates once both are assigned.
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
              <AttachmentLocation companyName={placement.company_name} address={placement.address} />
              {placement.confirmed_at && (
                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Confirmed on {new Date(placement.confirmed_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {profile && <AreaInterestEditor value={profile.area_interest} onSaved={(area_interest) => setProfile((previous) => ({ ...previous, area_interest }))} />}

      {profile && (
        <>
          <div className={styles.workspace}>
            <div className={styles.workspaceHeading}>
              <div><span className={styles.eyebrow}>ATTACHMENT WORKSPACE</span><h2>Records and progress</h2><p>Manage submissions, attendance, supervisor feedback and daily activities.</p></div>
            </div>
            <SectionTabs
            items={SECTIONS}
            activeId={activeSection}
            onChange={setActiveSection}
            label="Student sections"
            />
          </div>

          {activeSection === 'submissions' && (
            <SubmissionsSection canSubmit={profile.link_status === 'linked'} />
          )}
          {activeSection === 'attendance' && <AttendanceSection studentId={profile.id} />}
          {activeSection === 'feedback' && <FeedbackSection studentId={profile.id} />}
          {activeSection === 'logbook' && <LogbookSection />}
        </>
      )}
    </PortalLayout>
  );
}
