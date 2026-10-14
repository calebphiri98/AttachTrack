import { useAuth } from '../../../context/AuthContext';
import ResultsCompilePage from './ResultsCompilePage';
import ResultsApprovePage from './ResultsApprovePage';

export default function ResultsPage() {
  const { user } = useAuth();

  if (user?.role === 'hod') {
    return <ResultsApprovePage />;
  }

  return <ResultsCompilePage />;
}