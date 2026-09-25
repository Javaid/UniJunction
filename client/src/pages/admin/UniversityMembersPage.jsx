import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/Pagination';
import Can from '../../components/Can';

const MEMBERSHIP_TYPES = ['STUDENT', 'FACULTY', 'RESEARCHER', 'STAFF', 'ADMIN'];
const MEMBERSHIP_STATUSES = ['PENDING', 'ACTIVE', 'SUSPENDED', 'ENDED'];

const CreateMembershipForm = ({ universityId, onCreated, onCancel }) => {
  const [form, setForm] = useState({ user_id: '', membership_type: 'STUDENT' });
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await universityService.createMembership(universityId, form);
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create membership.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <FormField
          id="user_id"
          label="User ID"
          value={form.user_id}
          onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
          placeholder="User's ID"
          required
        />
      </div>
      <div>
        <label htmlFor="membership_type" className="block text-sm font-medium text-slate-700">
          Membership Type
        </label>
        <select
          id="membership_type"
          value={form.membership_type}
          onChange={(e) => setForm((prev) => ({ ...prev, membership_type: e.target.value }))}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {MEMBERSHIP_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
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
        {saving ? 'Adding…' : 'Add Member'}
      </button>
      <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600">
        Cancel
      </button>
    </form>
  );
};

const UniversityMembersPage = () => {
  const { id } = useParams();
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async (page = 1) => {
    setLoading(true);
    const res = await universityService.listMembers(id, { page, pageSize: 20 });
    setMembers(res.data);
    setPagination(res.pagination);
    setLoading(false);
  };

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleStatusChange = async (membership, status) => {
    await universityService.updateMembership(id, membership.id, { status });
    load(pagination.page);
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Universities', to: '/admin/universities' },
          { label: 'University', to: `/admin/universities/${id}` },
          { label: 'Members' },
        ]}
        title="Members"
        actions={
          <Can permission="UNIVERSITY_MEMBER_CREATE">
            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showForm ? 'Close' : 'Add Member'}
            </button>
          </Can>
        }
      />

      {showForm && (
        <CreateMembershipForm
          universityId={id}
          onCreated={() => {
            setShowForm(false);
            load(1);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <LoadingSpinner label="Loading members…" />
      ) : members.length === 0 ? (
        <EmptyState title="No members yet" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Status</th>
                <Can permission="UNIVERSITY_MEMBER_UPDATE">
                  <th className="px-4 py-2">Update Status</th>
                </Can>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((membership) => (
                <tr key={membership.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {membership.user?.first_name} {membership.user?.last_name}
                    </div>
                    <div className="text-xs text-slate-500">{membership.user?.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{membership.membership_type}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={membership.status} />
                    {membership.is_primary && (
                      <span className="ml-2 text-xs font-medium text-brand-700">Primary</span>
                    )}
                  </td>
                  <Can permission="UNIVERSITY_MEMBER_UPDATE">
                    <td className="px-4 py-3">
                      <select
                        value={membership.status}
                        onChange={(e) => handleStatusChange(membership, e.target.value)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        {MEMBERSHIP_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </Can>
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

export default UniversityMembersPage;
