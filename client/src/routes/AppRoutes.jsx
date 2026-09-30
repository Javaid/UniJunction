import { Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import StudentProfileLayout from '../layouts/StudentProfileLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import StudentRoute from './StudentRoute';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import UniversitiesListPage from '../pages/admin/UniversitiesListPage';
import UniversityDetailPage from '../pages/admin/UniversityDetailPage';
import UniversityFacultiesPage from '../pages/admin/UniversityFacultiesPage';
import UniversityDepartmentsPage from '../pages/admin/UniversityDepartmentsPage';
import UniversityProgramsPage from '../pages/admin/UniversityProgramsPage';
import UniversityMembersPage from '../pages/admin/UniversityMembersPage';
import UniversityStudentsPage from '../pages/admin/UniversityStudentsPage';
import StudentProfilePage from '../pages/student/StudentProfilePage';
import StudentProfileEditPage from '../pages/student/StudentProfileEditPage';
import StudentSkillsPage from '../pages/student/StudentSkillsPage';
import StudentInterestsPage from '../pages/student/StudentInterestsPage';
import StudentResearchPage from '../pages/student/StudentResearchPage';
import StudentCertificationsPage from '../pages/student/StudentCertificationsPage';
import StudentAchievementsPage from '../pages/student/StudentAchievementsPage';
import StudentGoalsPage from '../pages/student/StudentGoalsPage';

const AppRoutes = () => (
  <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route element={<AdminRoute />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="universities" element={<UniversitiesListPage />} />
            <Route path="universities/:id" element={<UniversityDetailPage />} />
            <Route path="universities/:id/faculties" element={<UniversityFacultiesPage />} />
            <Route path="universities/:id/departments" element={<UniversityDepartmentsPage />} />
            <Route path="universities/:id/programs" element={<UniversityProgramsPage />} />
            <Route path="universities/:id/members" element={<UniversityMembersPage />} />
          </Route>
          <Route path="university/students" element={<UniversityStudentsPage />} />
        </Route>
        <Route element={<StudentRoute />}>
          <Route path="student/profile" element={<StudentProfileLayout />}>
            <Route index element={<StudentProfilePage />} />
            <Route path="edit" element={<StudentProfileEditPage />} />
            <Route path="skills" element={<StudentSkillsPage />} />
            <Route path="interests" element={<StudentInterestsPage />} />
            <Route path="research" element={<StudentResearchPage />} />
            <Route path="certifications" element={<StudentCertificationsPage />} />
            <Route path="achievements" element={<StudentAchievementsPage />} />
            <Route path="goals" element={<StudentGoalsPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default AppRoutes;
