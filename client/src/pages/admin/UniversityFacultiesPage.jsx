import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import Can from '../../components/Can';

const CreateFacultyForm = ({ universityId, onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await universityService.createFaculty(universityId, { name });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create faculty.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <FormField id="faculty-name" label="Faculty Name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? 'Adding…' : 'Add Faculty'}
      </button>
      <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600">
        Cancel
      </button>
    </form>
  );
};

const UniversityFacultiesPage = () => {
  const { id } = useParams();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await universityService.listFaculties(id, { page: 1, pageSize: 100 });
    setFaculties(res.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleStatus = async (faculty) => {
    const nextStatus = faculty.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await universityService.updateFacultyStatus(faculty.id, nextStatus);
    load();
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Universities', to: '/admin/universities' },
          { label: 'University', to: `/admin/universities/${id}` },
          { label: 'Faculties' },
        ]}
        title="Faculties"
        actions={
          <Can permission="FACULTY_CREATE">
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? 'Close' : 'New Faculty'}
            </button>
          </Can>
        }
      />

      {showForm && (
        <CreateFacultyForm
          universityId={id}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <LoadingSpinner label="Loading faculties…" />
      ) : faculties.length === 0 ? (
        <EmptyState title="No faculties yet" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
                <Can permission="FACULTY_STATUS_UPDATE">
                  <th className="px-4 py-2" />
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {faculties.map((faculty) => (
                <tr key={faculty.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{faculty.name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={faculty.status} />
                  </td>
                  <Can permission="FACULTY_STATUS_UPDATE">
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleStatus(faculty)}
                        className="text-sm font-medium text-brand-700"
                      >
                        {faculty.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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

export default UniversityFacultiesPage;
