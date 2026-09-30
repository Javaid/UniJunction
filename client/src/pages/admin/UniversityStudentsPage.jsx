import { useEffect, useState } from 'react';

import * as universityService from '../../services/universityService';
import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * §51: a UNIVERSITY_ADMIN's own student roster. Resolves "my university"
 * from the caller's own ADMIN-type membership (the same lookup the
 * University Admin dashboard uses in AdminDashboardPage.jsx), then lists
 * students via the Chunk 05 admin endpoint. Never renders private
 * student fields (student_identifier, email, phone) — the backend
 * summary serializer already excludes them.
 */
const UniversityStudentsPage = () => {
  const [universityId, setUniversityId] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', program_id: '', academic_status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const resolveUniversity = async () => {
      try {
        const memberships = await universityService.listMyUniversities();
        const adminMembership = memberships.data.find((m) => m.membership_type === 'ADMIN');
        if (!adminMembership) {
          setError('No administered university found for your account.');
          setLoading(false);
          return;
        }
        setUniversityId(adminMembership.university_id);
        const programsRes = await universityService.listPrograms(adminMembership.university_id, {
          page: 1,
          pageSize: 100,
        });
        setPrograms(programsRes.data);
      } catch (err) {
        setError('Unable to load your university.');
        setLoading(false);
      }
    };
    resolveUniversity();
  }, []);

  const load = async (page = 1) => {
    if (!universityId) return;
    setLoading(true);
    try {
      const res = await studentService.listUniversityStudents(universityId, {
        page,
        pageSize: 20,
        search: filters.search || undefined,
        program_id: filters.program_id || undefined,
        academic_status: filters.academic_status || undefined,
      });
      setStudents(res.data);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (universityId) load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [universityId]);

  const handleFilterSubmit = (event) => {
    event.preventDefault();
    load(1);
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div>
      <PageHeader title="University Students" />

      <form onSubmit={handleFilterSubmit} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <FormField
            id="search"
            label="Search"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            placeholder="Search by name…"
          />
        </div>
        <div>
          <label htmlFor="program_id" className="block text-sm font-medium text-slate-700">
            Program
          </label>
          <select
            id="program_id"
            value={filters.program_id}
            onChange={(e) => setFilters((prev) => ({ ...prev, program_id: e.target.value }))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All programs</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="academic_status" className="block text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="academic_status"
            value={filters.academic_status}
            onChange={(e) => setFilters((prev) => ({ ...prev, academic_status: e.target.value }))}
            className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            {['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'].map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
          Filter
        </button>
      </form>

      {loading ? (
        <LoadingSpinner label="Loading students…" />
      ) : students.length === 0 ? (
        <EmptyState title="No students found" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Program</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {student.user.display_name || `${student.user.first_name} ${student.user.last_name}`}
                    </div>
                    {student.headline && <div className="text-xs text-slate-500">{student.headline}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{student.program ? student.program.name : '—'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={student.academic_status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{student.availability_status.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={load} />
        </div>
      )}
    </div>
  );
};

export default UniversityStudentsPage;
