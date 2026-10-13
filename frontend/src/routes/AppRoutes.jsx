import { Routes, Route, Navigate } from 'react-router-dom';
import SignupPage from '../features/auth/pages/SignupPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import DashboardPlaceholder from '../features/shared/pages/DashboardPlaceholder';
import StudentsListPage from '../features/industrySupervisor/pages/StudentsListPage';
import StudentDetailPage from '../features/industrySupervisor/pages/StudentDetailPage';
import ProtectedRoute from './ProtectedRoute';
import StudentDashboardPage from '../features/student/pages/StudentDashboardPage';
import UniversityStudentsListPage from '../features/universitySupervisor/pages/StudentsListPage';
import UniversityStudentDetailPage from '../features/universitySupervisor/pages/StudentDetailPage';
import MessagesPage from '../features/shared/pages/MessagesPage';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
import AdminCompaniesPage from '../features/admin/pages/AdminCompaniesPage';
import HodDashboardPage from '../features/hod/pages/HodDashboardPage';
import ResultsReleasePage from '../features/results/pages/ResultsReleasePage';
import NotificationSettingsPage from '../features/settings/pages/NotificationSettingsPage';
import PlacementsPage from '../features/placements/pages/PlacementsPage';
import AssessmentFormsPage from '../features/assessments/pages/AssessmentFormsPage';
import IndustryAssessmentsPage from '../features/assessments/pages/IndustryAssessmentsPage';
import AssessmentFormPage from '../features/assessments/pages/AssessmentFormPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        path="/industry/assessments"
        element={
          <ProtectedRoute roles={['industry_supervisor']}>
            <IndustryAssessmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/industry/assessments/:studentId"
        element={
          <ProtectedRoute roles={['industry_supervisor']}>
            <AssessmentFormPage />
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
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminCompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments/forms"
        element={
          <ProtectedRoute roles={['admin']}>
            <AssessmentFormsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hod/dashboard"
        element={
          <ProtectedRoute roles={['hod']}>
            <HodDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/results"
        element={
          <ProtectedRoute roles={['admin', 'hod']}>
            <ResultsReleasePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/placements"
        element={
          <ProtectedRoute roles={['admin', 'hod']}>
            <PlacementsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <ProtectedRoute>
            <NotificationSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}