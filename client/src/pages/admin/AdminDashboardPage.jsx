import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import * as adminService from '../../services/adminService';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner from '../../components/LoadingSpinner';

const StatCard = ({ label, value }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
    <dd className="mt-1 text-2xl font-semibold text-slate-900">{value ?? '—'}</dd>
  </div>
);

/** §40: platform-wide counts only — no analytics infrastructure. */
const SuperAdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [all, active, pendingVerification, suspended, users] = await Promise.all([
          universityService.listUniversities({ page: 1, pageSize: 1 }),
          universityService.listUniversities({ page: 1, pageSize: 1, status: 'ACTIVE' }),
          universityService.listUniversities({ page: 1, pageSize: 1, verification_status: 'PENDING' }),
          universityService.listUniversities({ page: 1, pageSize: 1, status: 'SUSPENDED' }),
          adminService.listUsers({ page: 1, limit: 1 }),
        ]);
        setStats({
          universities: all.pagination.total,
          active: active.pagination.total,
          pendingVerification: pendingVerification.pagination.total,
          suspended: suspended.pagination.total,
          users: users.pagination.total,
        });
      } catch (err) {
        setError('Unable to load platform statistics.');
      }
    };
    load();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <LoadingSpinner label="Loading platform statistics…" />;

  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <StatCard label="Universities" value={stats.universities} />
      <StatCard label="Active Universities" value={stats.active} />
      <StatCard label="Pending Verification" value={stats.pendingVerification} />
      <StatCard label="Suspended Universities" value={stats.suspended} />
      <StatCard label="Users" value={stats.users} />
    </dl>
  );
};

/** §39: counts from available data only — no analytics infrastructure. */
const UniversityAdminDashboard = () => {
  const [university, setUniversity] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const memberships = await universityService.listMyUniversities();
        const adminMembership = memberships.data.find((m) => m.membership_type === 'ADMIN');
        if (!adminMembership) {
          setError('No administered university found for your account.');
          return;
        }
        setUniversity(adminMembership.university_id);

        const uniId = adminMembership.university_id;
        const [students, faculty, researchers, departments, programs] = await Promise.all([
          universityService.listMembers(uniId, { page: 1, pageSize: 1, membership_type: 'STUDENT' }),
          universityService.listMembers(uniId, { page: 1, pageSize: 1, membership_type: 'FACULTY' }),
          universityService.listMembers(uniId, { page: 1, pageSize: 1, membership_type: 'RESEARCHER' }),
          universityService.listDepartments(uniId, { page: 1, pageSize: 1 }),
          universityService.listPrograms(uniId, { page: 1, pageSize: 1 }),
        ]);
        setStats({
          students: students.pagination.total,
          faculty: faculty.pagination.total,
          researchers: researchers.pagination.total,
          departments: departments.pagination.total,
          programs: programs.pagination.total,
        });
      } catch (err) {
        setError('Unable to load your institution’s statistics.');
      }
    };
    load();
  }, []);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <LoadingSpinner label="Loading your institution's dashboard…" />;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Students" value={stats.students} />
        <StatCard label="Faculty" value={stats.faculty} />
        <StatCard label="Researchers" value={stats.researchers} />
        <StatCard label="Departments" value={stats.departments} />
        <StatCard label="Programs" value={stats.programs} />
      </dl>
      <Link to={`/admin/universities/${university}`} className="text-sm font-medium text-brand-700">
        Manage this university →
      </Link>
    </div>
  );
};

const AdminDashboardPage = () => {
  const roles = useSelector((state) => state.auth.user?.roles || []);
  const isSuperAdmin = roles.includes('SUPER_ADMIN');

  return (
    <div>
      <PageHeader title="Administration Dashboard" />
      {isSuperAdmin ? <SuperAdminDashboard /> : <UniversityAdminDashboard />}
    </div>
  );
};

export default AdminDashboardPage;
