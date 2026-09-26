import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { status, user } = useAuth();

  if (status === 'loading') {
    return null; // avoid a login-page flash while we check for a cached session
  }
  if (status === 'guest') {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
