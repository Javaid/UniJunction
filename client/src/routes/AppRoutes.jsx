import { Navigate, Route, Routes } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
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
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
);

export default AppRoutes;
