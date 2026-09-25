import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import Can from '../../components/Can';

const STATUS_OPTIONS = ['', 'PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];

const CreateUniversityForm = ({ onCreated, onCancel }) => {
  const [form, setForm] = useState({ name: '', slug: '', country: '', city: '' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await universityService.createUniversity(form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create university.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="name" name="name" label="Name" value={form.name} onChange={handleChange} required />
        <FormField id="slug" name="slug" label="Slug" value={form.slug} onChange={handleChange} required />
        <FormField id="country" name="country" label="Country" value={form.country} onChange={handleChange} />
        <FormField id="city" name="city" label="City" value={form.city} onChange={handleChange} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create University'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
};

const UniversitiesListPage = () => {
  const [universities, setUniversities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, pageSize: pagination.pageSize };
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      const res = await universityService.listUniversities(params);
      setUniversities(res.data);
      setPagination(res.pagination);
    } catch (err) {
      setError('Unable to load universities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: 'Universities' }]}
        title="Universities"
        actions={
          <Can permission="UNIVERSITY_CREATE">
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showCreateForm ? 'Close' : 'New University'}
            </button>
          </Can>
        }
      />

      {showCreateForm && (
        <CreateUniversityForm
          onCreated={() => {
            setShowCreateForm(false);
            load(1);
          }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by name, city, country…"
          value={filters.search}
          onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option || 'All statuses'}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <LoadingSpinner label="Loading universities…" />
      ) : universities.length === 0 ? (
        <EmptyState title="No universities found" description="Try adjusting your search or filters." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {universities.map((university) => (
                <tr key={university.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link to={`/admin/universities/${university.id}`} className="font-medium text-brand-700">
                      {university.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {[university.city, university.country].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={university.status} />
                  </td>
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

export default UniversitiesListPage;
