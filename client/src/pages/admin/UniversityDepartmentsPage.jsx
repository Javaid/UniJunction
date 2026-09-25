import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import Can from '../../components/Can';

const CreateDepartmentForm = ({ universityId, faculties, onCreated, onCancel }) => {
  const [form, setForm] = useState({ name: '', faculty_id: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await universityService.createDepartment(universityId, {
        name: form.name,
        faculty_id: form.faculty_id || null,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <FormField
          id="department-name"
          label="Department Name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
      </div>
      <div>
        <label htmlFor="faculty" className="block text-sm font-medium text-slate-700">
          Faculty (optional)
        </label>
        <select
          id="faculty"
          value={form.faculty_id}
          onChange={(e) => setForm((prev) => ({ ...prev, faculty_id: e.target.value }))}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">No faculty</option>
          {faculties.map((faculty) => (
            <option key={faculty.id} value={faculty.id}>
              {faculty.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? 'Adding…' : 'Add Department'}
      </button>
      <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600">
        Cancel
      </button>
    </form>
  );
};

const UniversityDepartmentsPage = () => {
  const { id } = useParams();
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [deptRes, facRes] = await Promise.all([
      universityService.listDepartments(id, { page: 1, pageSize: 100 }),
      universityService.listFaculties(id, { page: 1, pageSize: 100 }),
    ]);
    setDepartments(deptRes.data);
    setFaculties(facRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleStatus = async (department) => {
    const nextStatus = department.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await universityService.updateDepartmentStatus(department.id, nextStatus);
    load();
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Universities', to: '/admin/universities' },
          { label: 'University', to: `/admin/universities/${id}` },
          { label: 'Departments' },
        ]}
        title="Departments"
        actions={
          <Can permission="DEPARTMENT_CREATE">
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? 'Close' : 'New Department'}
            </button>
          </Can>
        }
      />

      {showForm && (
        <CreateDepartmentForm
          universityId={id}
          faculties={faculties}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <LoadingSpinner label="Loading departments…" />
      ) : departments.length === 0 ? (
        <EmptyState title="No departments yet" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Faculty</th>
                <th className="px-4 py-2">Status</th>
                <Can permission="DEPARTMENT_STATUS_UPDATE">
                  <th className="px-4 py-2" />
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => (
                <tr key={department.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{department.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {faculties.find((f) => f.id === department.faculty_id)?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={department.status} />
                  </td>
                  <Can permission="DEPARTMENT_STATUS_UPDATE">
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(department)}
                        className="text-sm font-medium text-brand-700"
                      >
                        {department.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </Can>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UniversityDepartmentsPage;
