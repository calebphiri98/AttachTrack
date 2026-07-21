import { Routes, Route, Navigate } from 'react-router-dom';
import SignupPage from '../features/auth/pages/SignupPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardPlaceholder from '../features/shared/pages/DashboardPlaceholder';
import StudentsListPage from '../features/industrySupervisor/pages/StudentsListPage';
import StudentDetailPage from '../features/industrySupervisor/pages/StudentDetailPage';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPlaceholder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/industry/students"
        element={
          <ProtectedRoute roles={['industry_supervisor']}>
            <StudentsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/industry/students/:studentId"
        element={
          <ProtectedRoute roles={['industry_supervisor']}>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
