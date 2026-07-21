import { Routes, Route, Navigate } from 'react-router-dom';
import SignupPage from '../features/auth/pages/SignupPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import DashboardPlaceholder from '../features/shared/pages/DashboardPlaceholder';
import StudentsListPage from '../features/industrySupervisor/pages/StudentsListPage';
import StudentDetailPage from '../features/industrySupervisor/pages/StudentDetailPage';
import ProtectedRoute from './ProtectedRoute';
import StudentDashboardPage from '../features/student/pages/StudentDashboardPage';
import UniversityStudentsListPage from '../features/universitySupervisor/pages/StudentsListPage';
import UniversityStudentDetailPage from '../features/universitySupervisor/pages/StudentDetailPage';
import MessagesPage from '../features/shared/pages/MessagesPage';

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
        path="/student/dashboard"
        element={
          <ProtectedRoute roles={['student']}>
            <StudentDashboardPage />
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
      <Route
        path="/university/students"
        element={
          <ProtectedRoute roles={['university_supervisor']}>
            <UniversityStudentsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/students/:studentId"
        element={
          <ProtectedRoute roles={['university_supervisor']}>
            <UniversityStudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student/messages"
        element={
          <ProtectedRoute roles={['student']}>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/industry/messages"
        element={
          <ProtectedRoute roles={['industry_supervisor']}>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/university/messages"
        element={
          <ProtectedRoute roles={['university_supervisor']}>
            <MessagesPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}