import { useEffect, useState } from 'react';

import useMyProfile from '../../hooks/useMyProfile';
import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const AddInterestForm = ({ onAdded }) => {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [interestId, setInterestId] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      studentService.listInterests({ search, pageSize: 20 }).then((res) => setOptions(res.data));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await studentService.addMyInterest({ interest_id: interestId });
      setInterestId('');
      setSearch('');
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add interest.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <label htmlFor="interest-search" className="block text-sm font-medium text-slate-700">
          Academic Interest
        </label>
        <input
          id="interest-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search interests…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {options.length > 0 && (
          <select
            value={interestId}
            onChange={(e) => setInterestId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Choose an interest
            </option>
            {options.map((interest) => (
              <option key={interest.id} value={interest.id}>
                {interest.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!interestId}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Add Interest
      </button>
    </form>
  );
};

const StudentInterestsPage = () => {
  const { profile, loading, notFound, reload } = useMyProfile();

  const handleRemove = async (interestId) => {
    await studentService.removeMyInterest(interestId);
    reload();
  };

  if (loading) return <LoadingSpinner label="Loading…" />;
  if (notFound) {
    return (
      <div>
        <PageHeader title="Academic Interests" />
        <EmptyState title="Create your profile first" description="You need a student profile before adding interests." />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div>
      <PageHeader title="Academic Interests" />
      <AddInterestForm onAdded={reload} />

      {profile.interests.length === 0 ? (
        <EmptyState title="No interests yet" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {profile.interests.map((interest) => (
            <span
              key={interest.id}
              className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
            >
              {interest.name}
              <button
                type="button"
                onClick={() => handleRemove(interest.id)}
                className="text-slate-400 hover:text-red-600"
                aria-label={`Remove ${interest.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentInterestsPage;
