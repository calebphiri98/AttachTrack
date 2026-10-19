import { useEffect, useState } from 'react';
import PortalLayout from '../../../components/shared/PortalLayout';
import StudentsListView from '../../../components/supervisor/StudentsListView';
import * as industrySupervisorsApi from '../../../api/industrySupervisors.api';

export default function StudentsListPage() {
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
      <StudentsListView students={students} error={error} basePath="/industry/students" />
    </PortalLayout>
  );
}
