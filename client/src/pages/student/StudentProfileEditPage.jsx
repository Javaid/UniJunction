import { useEffect, useState } from 'react';

import useMyProfile from '../../hooks/useMyProfile';
import * as studentService from '../../services/studentService';
import * as universityService from '../../services/universityService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const AVAILABILITY_OPTIONS = ['NOT_SPECIFIED', 'AVAILABLE', 'LIMITED', 'NOT_AVAILABLE'];
const ACADEMIC_STATUS_OPTIONS = ['ACTIVE', 'ON_LEAVE', 'GRADUATED', 'SUSPENDED', 'WITHDRAWN'];

// §50: explained plainly, and never implying these settings override
// institutional/legal access (see docs/student-profiles.md, "Visibility").
const VISIBILITY_OPTIONS = [
  { value: 'PUBLIC', label: 'Public', description: 'Anyone, including visitors who are not signed in.' },
  { value: 'ACADEMIC_NETWORK', label: 'Academic Network', description: 'Any signed-in Academic Connect member.' },
  { value: 'UNIVERSITY_ONLY', label: 'University Only', description: 'Members of your own university only.' },
  { value: 'CONNECTIONS_ONLY', label: 'Connections Only', description: 'Reserved for a future release — treated as Private for now.' },
  { value: 'PRIVATE', label: 'Private', description: 'Only you. Your university’s administrators can still see institutional details.' },
];

const StudentProfileEditPage = () => {
  const { profile, loading, notFound, reload } = useMyProfile();
  const [form, setForm] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      program_id: profile.program?.id || '',
      admission_year: profile.admission_year || '',
      expected_graduation_year: profile.expected_graduation_year || '',
      current_semester: profile.current_semester || '',
      headline: profile.headline || '',
      bio: profile.bio || '',
      availability_status: profile.availability_status,
      profile_visibility: profile.profile_visibility,
    });
    universityService
      .listPrograms(profile.university.id, { page: 1, pageSize: 100, status: 'ACTIVE' })
      .then((res) => setPrograms(res.data));
  }, [profile]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await studentService.updateMyProfile({
        program_id: form.program_id || null,
        admission_year: form.admission_year ? Number(form.admission_year) : null,
        expected_graduation_year: form.expected_graduation_year ? Number(form.expected_graduation_year) : null,
        current_semester: form.current_semester ? Number(form.current_semester) : null,
        headline: form.headline,
        bio: form.bio,
        availability_status: form.availability_status,
        profile_visibility: form.profile_visibility,
      });
      setMessage('Saved.');
      reload();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (event) => {
    const status = event.target.value;
    setStatusMessage(null);
    try {
      await studentService.updateMyProfileStatus(status);
      reload();
    } catch (err) {
      setStatusMessage(err.response?.data?.message || 'Unable to change status.');
    }
  };

  if (loading) return <LoadingSpinner label="Loading your profile…" />;

  if (notFound) {
    return (
      <div>
        <PageHeader title="Edit Profile" />
        <EmptyState
          title="Create your profile first"
          description="You need a student profile before you can edit it."
        />
      </div>
    );
  }

  if (!profile || !form) return null;

  return (
    <div className="space-y-6">
      <PageHeader title="Edit Profile" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Academic Information</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="program_id" className="block text-sm font-medium text-slate-700">
                Program
              </label>
              <select
                id="program_id"
                name="program_id"
                value={form.program_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">No program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name} ({program.degree_level})
                  </option>
                ))}
              </select>
            </div>
            <FormField
              id="current_semester"
              name="current_semester"
              type="number"
              min={1}
              max={20}
              label="Current Semester"
              value={form.current_semester}
              onChange={handleChange}
            />
            <FormField
              id="admission_year"
              name="admission_year"
              type="number"
              label="Admission Year"
              value={form.admission_year}
              onChange={handleChange}
            />
            <FormField
              id="expected_graduation_year"
              name="expected_graduation_year"
              type="number"
              label="Expected Graduation Year"
              value={form.expected_graduation_year}
              onChange={handleChange}
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">About</h2>
          <div className="mt-3 space-y-4">
            <FormField
              id="headline"
              name="headline"
              label="Headline"
              value={form.headline}
              onChange={handleChange}
              maxLength={150}
              placeholder="Computer Science Student | AI & Healthcare Research"
            />
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-slate-700">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                maxLength={2000}
                value={form.bio}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Availability</h2>
          <p className="mt-1 text-sm text-slate-500">Let others know if you&rsquo;re open to collaboration.</p>
          <select
            name="availability_status"
            value={form.availability_status}
            onChange={handleChange}
            className="mt-2 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-900">Privacy</h2>
          <p className="mt-1 text-sm text-slate-500">Who can view my profile?</p>
          <div className="mt-3 space-y-2">
            {VISIBILITY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-start gap-2 text-sm">
                <input
                  type="radio"
                  name="profile_visibility"
                  value={option.value}
                  checked={form.profile_visibility === option.value}
                  onChange={handleChange}
                  className="mt-1"
                />
                <span>
                  <span className="font-medium text-slate-800">{option.label}</span>
                  <span className="block text-slate-500">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Privacy settings never override institutional administration, platform moderation, or legal requirements.
          </p>
        </section>

        {message && <p className="text-sm text-slate-600">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-900">Academic Status</h2>
        <p className="mt-1 text-sm text-slate-500">
          Your current enrollment status. Changing this is audited on your institutional record.
        </p>
        <select
          value={profile.academic_status}
          onChange={handleStatusChange}
          className="mt-2 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {ACADEMIC_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        {statusMessage && <p className="mt-2 text-sm text-red-600">{statusMessage}</p>}
      </section>
    </div>
  );
};

export default StudentProfileEditPage;
