import SubmissionsPanel from '../../../components/supervisor/SubmissionsPanel';

export default function SubmissionsSection({ studentId }) {
  return <SubmissionsPanel studentId={studentId} requirementLabel="University supervisor requirement" />;
}
