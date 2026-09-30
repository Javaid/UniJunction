import { useEffect, useState } from 'react';

import useMyProfile from '../../hooks/useMyProfile';
import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const INTEREST_LEVELS = ['CURIOUS', 'INTERESTED', 'ACTIVE', 'ADVANCED'];

const AddResearchInterestForm = ({ onAdded }) => {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [areaId, setAreaId] = useState('');
  const [level, setLevel] = useState('CURIOUS');
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      studentService.listResearchAreas({ search }).then((res) => setOptions(res.data));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await studentService.addMyResearchInterest({ research_area_id: areaId, interest_level: level });
      setAreaId('');
      setSearch('');
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add research interest.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <label htmlFor="research-search" className="block text-sm font-medium text-slate-700">
          Research Area
        </label>
        <input
          id="research-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search research areas…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {options.length > 0 && (
          <select
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Choose a research area
            </option>
            {options.map((area) => (
              <option key={area.id} value={area.id}>
                {area.parent_id ? `— ${area.name}` : area.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label htmlFor="interest-level" className="block text-sm font-medium text-slate-700">
          Interest Level
        </label>
        <select
          id="interest-level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {INTEREST_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!areaId}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Add Research Interest
      </button>
    </form>
  );
};

const StudentResearchPage = () => {
  const { profile, loading, notFound, reload } = useMyProfile();

  const handleRemove = async (areaId) => {
    await studentService.removeMyResearchInterest(areaId);
    reload();
  };

  if (loading) return <LoadingSpinner label="Loading…" />;
  if (notFound) {
    return (
      <div>
        <PageHeader title="Research Interests" />
        <EmptyState
          title="Create your profile first"
          description="You need a student profile before adding research interests."
        />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div>
      <PageHeader title="Research Interests" />
      <AddResearchInterestForm onAdded={reload} />

      {profile.research_interests.length === 0 ? (
        <EmptyState title="No research interests yet" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Research Area</th>
                <th className="px-4 py-2">Interest Level</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.research_interests.map((area) => (
                <tr key={area.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{area.name}</td>
                  <td className="px-4 py-3 text-slate-600">{area.interest_level}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(area.id)}
                      className="text-sm font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StudentResearchPage;
