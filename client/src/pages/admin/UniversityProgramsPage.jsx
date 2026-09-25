import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import Can from '../../components/Can';

// UX convenience only — the backend independently validates degree_level
// against its own allow-list (see server/src/utils/enums.js,
// DEGREE_LEVELS) and is the actual source of truth. Adding a new degree
// level does not require a frontend change to keep working; it only
// needs one here to appear as a selectable option.
const DEGREE_LEVELS = ['CERTIFICATE', 'DIPLOMA', 'ASSOCIATE', 'BACHELOR', 'MASTER', 'MS', 'MPHIL', 'PHD'];

const CreateProgramForm = ({ universityId, departments, onCreated, onCancel }) => {
  const [form, setForm] = useState({ name: '', degree_level: 'BACHELOR', department_id: '', duration_years: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await universityService.createProgram(universityId, {
        name: form.name,
        degree_level: form.degree_level,
        department_id: form.department_id,
        duration_years: form.duration_years ? Number(form.duration_years) : null,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create program.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="program-name" name="name" label="Program Name" value={form.name} onChange={handleChange} required />
        <div>
          <label htmlFor="degree_level" className="block text-sm font-medium text-slate-700">
            Degree Level
          </label>
          <select
            id="degree_level"
            name="degree_level"
            value={form.degree_level}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {DEGREE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="department_id" className="block text-sm font-medium text-slate-700">
            Department
          </label>
          <select
            id="department_id"
            name="department_id"
            value={form.department_id}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Select a department
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>
        <FormField
          id="duration_years"
          name="duration_years"
          type="number"
          step="0.5"
          label="Duration (years)"
          value={form.duration_years}
          onChange={handleChange}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add Program'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
};

const UniversityProgramsPage = () => {
  const { id } = useParams();
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [progRes, deptRes] = await Promise.all([
      universityService.listPrograms(id, { page: 1, pageSize: 100 }),
      universityService.listDepartments(id, { page: 1, pageSize: 100 }),
    ]);
    setPrograms(progRes.data);
    setDepartments(deptRes.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleStatus = async (program) => {
    const nextStatus = program.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await universityService.updateProgramStatus(program.id, nextStatus);
    load();
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Universities', to: '/admin/universities' },
          { label: 'University', to: `/admin/universities/${id}` },
          { label: 'Programs' },
        ]}
        title="Programs"
        actions={
          <Can permission="PROGRAM_CREATE">
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              disabled={departments.length === 0}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              title={departments.length === 0 ? 'Create a department first' : undefined}
            >
              {showForm ? 'Close' : 'New Program'}
            </button>
          </Can>
        }
      />

      {showForm && (
        <CreateProgramForm
          universityId={id}
          departments={departments}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <LoadingSpinner label="Loading programs…" />
      ) : programs.length === 0 ? (
        <EmptyState
          title="No programs yet"
          description={departments.length === 0 ? 'Create a department before adding a program.' : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Degree</th>
                <th className="px-4 py-2">Department</th>
                <th className="px-4 py-2">Status</th>
                <Can permission="PROGRAM_STATUS_UPDATE">
                  <th className="px-4 py-2" />
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {programs.map((program) => (
                <tr key={program.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{program.name}</td>
                  <td className="px-4 py-3 text-slate-600">{program.degree_level}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {departments.find((d) => d.id === program.department_id)?.name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={program.status} />
                  </td>
                  <Can permission="PROGRAM_STATUS_UPDATE">
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(program)}
                        className="text-sm font-medium text-brand-700"
                      >
                        {program.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

export default UniversityProgramsPage;
