import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import Can from '../../components/Can';

const STATUS_OPTIONS = ['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'];
const VERIFICATION_OPTIONS = ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'];

const SUB_PAGES = [
  { label: 'Faculties', path: 'faculties' },
  { label: 'Departments', path: 'departments' },
  { label: 'Programs', path: 'programs' },
  { label: 'Members', path: 'members' },
];

const UniversityDetailPage = () => {
  const { id } = useParams();
  const [university, setUniversity] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await universityService.getUniversity(id);
      setUniversity(res.data);
      setForm({
        name: res.data.name || '',
        short_name: res.data.short_name || '',
        description: res.data.description || '',
        website_url: res.data.website_url || '',
        country: res.data.country || '',
        state_province: res.data.state_province || '',
        city: res.data.city || '',
      });
    } catch (err) {
      setError('Unable to load this university.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleChange = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await universityService.updateUniversity(id, form);
      setUniversity(res.data);
      setMessage('Saved.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    const res = await universityService.updateUniversityStatus(id, status);
    setUniversity(res.data);
  };

  const handleVerificationChange = async (status) => {
    const res = await universityService.updateUniversityVerification(id, status);
    setUniversity(res.data);
  };

  if (loading) return <LoadingSpinner label="Loading university…" />;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!university) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Admin', to: '/admin' },
          { label: 'Universities', to: '/admin/universities' },
          { label: university.name },
        ]}
        title={university.name}
        actions={<StatusBadge status={university.status} />}
      />

      <nav className="flex gap-4 border-b border-slate-200 pb-2 text-sm">
        {SUB_PAGES.map((sub) => (
          <Link key={sub.path} to={`/admin/universities/${id}/${sub.path}`} className="font-medium text-brand-700">
            {sub.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form onSubmit={handleSave} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <h2 className="text-sm font-medium text-slate-900">Institution Information</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField id="name" name="name" label="Name" value={form.name} onChange={handleChange} />
            <FormField id="short_name" name="short_name" label="Short Name" value={form.short_name} onChange={handleChange} />
            <FormField id="website_url" name="website_url" label="Website" value={form.website_url} onChange={handleChange} />
            <FormField id="country" name="country" label="Country" value={form.country} onChange={handleChange} />
            <FormField
              id="state_province"
              name="state_province"
              label="State / Province"
              value={form.state_province}
              onChange={handleChange}
            />
            <FormField id="city" name="city" label="City" value={form.city} onChange={handleChange} />
          </div>
          <FormField id="description" name="description" label="Description" value={form.description} onChange={handleChange} />
          {message && <p className="text-sm text-slate-600">{message}</p>}
          <Can permission="UNIVERSITY_UPDATE">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </Can>
        </form>

        <div className="space-y-4">
          <Can permission="UNIVERSITY_STATUS_UPDATE">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-medium text-slate-900">Operational Status</h2>
              <select
                value={university.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </Can>

          <Can permission="UNIVERSITY_VERIFY">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-medium text-slate-900">Verification</h2>
              <select
                value={university.verification_status}
                onChange={(e) => handleVerificationChange(e.target.value)}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                {VERIFICATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </Can>
        </div>
      </div>
    </div>
  );
};

export default UniversityDetailPage;
