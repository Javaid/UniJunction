import { useEffect, useState } from 'react';

import * as universityService from '../../services/universityService';
import * as studentService from '../../services/studentService';
import FormField from '../../components/FormField';
import LoadingSpinner from '../../components/LoadingSpinner';

/**
 * §39: a profile can only be created against a university where the
 * caller holds an active STUDENT membership — the backend is the real
 * enforcement, but the picker only offers memberships that could
 * possibly succeed, rather than a raw free-text university id.
 */
const CreateProfileForm = ({ onCreated }) => {
  const [memberships, setMemberships] = useState(null);
  const [universityId, setUniversityId] = useState('');
  const [programId, setProgramId] = useState('');
  const [programs, setPrograms] = useState([]);
  const [headline, setHeadline] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await universityService.listMyUniversities();
      const activeStudentMemberships = res.data.filter(
        (m) => m.membership_type === 'STUDENT' && m.status === 'ACTIVE'
      );
      // The membership record only carries university_id — fetch each
      // university's public name for a readable picker.
      const withUniversity = await Promise.all(
        activeStudentMemberships.map(async (m) => ({
          ...m,
          university: await universityService.getUniversity(m.university_id).then((r) => r.data),
        }))
      );
      setMemberships(withUniversity);
      if (withUniversity.length === 1) {
        setUniversityId(withUniversity[0].university_id);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!universityId) {
      setPrograms([]);
      return;
    }
    universityService.listPrograms(universityId, { page: 1, pageSize: 100, status: 'ACTIVE' }).then((res) => {
      setPrograms(res.data);
    });
  }, [universityId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await studentService.createMyProfile({
        university_id: universityId,
        program_id: programId || undefined,
        headline: headline || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to create your profile.');
    } finally {
      setSaving(false);
    }
  };

  if (memberships === null) {
    return <LoadingSpinner label="Checking your institutional memberships…" />;
  }

  if (memberships.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 px-6 py-10 text-center">
        <p className="text-sm font-medium text-slate-700">No active student membership found</p>
        <p className="mt-1 text-sm text-slate-500">
          You need an active STUDENT membership at a university before you can create a student profile. Contact your
          institution&rsquo;s administrator.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-medium text-slate-900">Create your student profile</h2>

      <div>
        <label htmlFor="university" className="block text-sm font-medium text-slate-700">
          University
        </label>
        <select
          id="university"
          value={universityId}
          onChange={(e) => {
            setUniversityId(e.target.value);
            setProgramId('');
          }}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            Select a university
          </option>
          {memberships.map((m) => (
            <option key={m.university_id} value={m.university_id}>
              {m.university?.name || m.university_id}
            </option>
          ))}
        </select>
      </div>

      {universityId && (
        <div>
          <label htmlFor="program" className="block text-sm font-medium text-slate-700">
            Program (optional)
          </label>
          <select
            id="program"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">No program yet</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.name} ({program.degree_level})
              </option>
            ))}
          </select>
        </div>
      )}

      <FormField
        id="headline"
        label="Headline (optional)"
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder="Computer Science Student | AI & Healthcare Research"
        maxLength={150}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving || !universityId}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? 'Creating…' : 'Create Profile'}
      </button>
    </form>
  );
};

export default CreateProfileForm;
