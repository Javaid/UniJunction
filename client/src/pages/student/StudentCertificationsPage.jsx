import { useEffect, useState } from 'react';

import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const EMPTY_FORM = {
  name: '',
  issuing_organization: '',
  issue_date: '',
  expiry_date: '',
  credential_id: '',
  credential_url: '',
  description: '',
};

const CertificationForm = ({ initial, onSubmit, onCancel }) => {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save certification.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="name" name="name" label="Name" value={form.name} onChange={handleChange} required />
        <FormField
          id="issuing_organization"
          name="issuing_organization"
          label="Issuing Organization"
          value={form.issuing_organization}
          onChange={handleChange}
        />
        <FormField id="issue_date" name="issue_date" type="date" label="Issue Date" value={form.issue_date} onChange={handleChange} />
        <FormField id="expiry_date" name="expiry_date" type="date" label="Expiry Date" value={form.expiry_date} onChange={handleChange} />
        <FormField id="credential_id" name="credential_id" label="Credential ID" value={form.credential_id} onChange={handleChange} />
        <FormField id="credential_url" name="credential_url" label="Credential URL" value={form.credential_url} onChange={handleChange} />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md px-4 py-2 text-sm font-medium text-slate-600">
          Cancel
        </button>
      </div>
    </form>
  );
};

const StudentCertificationsPage = () => {
  const [certifications, setCertifications] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const res = await studentService.listMyCertifications();
    setCertifications(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (form) => {
    await studentService.createMyCertification(form);
    setShowForm(false);
    load();
  };

  const handleUpdate = async (form) => {
    await studentService.updateMyCertification(editing.id, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await studentService.deleteMyCertification(id);
    load();
  };

  if (certifications === null) return <LoadingSpinner label="Loading certifications…" />;

  return (
    <div>
      <PageHeader
        title="Certifications"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? 'Close' : 'Add Certification'}
          </button>
        }
      />

      {showForm && <CertificationForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {certifications.length === 0 ? (
        <EmptyState title="No certifications yet" />
      ) : (
        <div className="space-y-3">
          {certifications.map((cert) =>
            editing?.id === cert.id ? (
              <CertificationForm
                key={cert.id}
                initial={cert}
                onSubmit={handleUpdate}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div key={cert.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{cert.name}</p>
                    {cert.issuing_organization && <p className="text-sm text-slate-500">{cert.issuing_organization}</p>}
                    {(cert.issue_date || cert.expiry_date) && (
                      <p className="text-xs text-slate-400">
                        {cert.issue_date || '—'} to {cert.expiry_date || 'no expiry'}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => setEditing(cert)} className="font-medium text-brand-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(cert.id)} className="font-medium text-red-600">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default StudentCertificationsPage;
