import { useEffect, useState } from 'react';

import useMyProfile from '../../hooks/useMyProfile';
import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const PROFICIENCY_LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const AddSkillForm = ({ onAdded }) => {
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState([]);
  const [skillId, setSkillId] = useState('');
  const [proficiency, setProficiency] = useState('BEGINNER');
  const [years, setYears] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      studentService.listSkills({ search, pageSize: 20 }).then((res) => setOptions(res.data));
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    try {
      await studentService.addMySkill({
        skill_id: skillId,
        proficiency_level: proficiency,
        years_experience: years ? Number(years) : undefined,
      });
      setSkillId('');
      setSearch('');
      setYears('');
      onAdded();
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to add skill.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex-1">
        <label htmlFor="skill-search" className="block text-sm font-medium text-slate-700">
          Skill
        </label>
        <input
          id="skill-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search skills…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {options.length > 0 && (
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Choose a skill
            </option>
            {options.map((skill) => (
              <option key={skill.id} value={skill.id}>
                {skill.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label htmlFor="proficiency" className="block text-sm font-medium text-slate-700">
          Proficiency
        </label>
        <select
          id="proficiency"
          value={proficiency}
          onChange={(e) => setProficiency(e.target.value)}
          className="mt-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {PROFICIENCY_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>
      <div className="w-28">
        <label htmlFor="years" className="block text-sm font-medium text-slate-700">
          Years
        </label>
        <input
          id="years"
          type="number"
          min={0}
          max={60}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={!skillId}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        Add Skill
      </button>
    </form>
  );
};

const StudentSkillsPage = () => {
  const { profile, loading, notFound, reload } = useMyProfile();

  const handleProficiencyChange = async (skillId, proficiency_level) => {
    await studentService.updateMySkill(skillId, { proficiency_level });
    reload();
  };

  const handleRemove = async (skillId) => {
    await studentService.removeMySkill(skillId);
    reload();
  };

  if (loading) return <LoadingSpinner label="Loading…" />;
  if (notFound) {
    return (
      <div>
        <PageHeader title="Skills" />
        <EmptyState title="Create your profile first" description="You need a student profile before adding skills." />
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div>
      <PageHeader title="Skills" />
      <AddSkillForm onAdded={reload} />

      {profile.skills.length === 0 ? (
        <EmptyState title="No skills yet" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Skill</th>
                <th className="px-4 py-2">Proficiency</th>
                <th className="px-4 py-2">Years</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {profile.skills.map((skill) => (
                <tr key={skill.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{skill.name}</td>
                  <td className="px-4 py-3">
                    <select
                      value={skill.proficiency_level}
                      onChange={(e) => handleProficiencyChange(skill.id, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {PROFICIENCY_LEVELS.map((level) => (
                        <option key={level} value={level}>
                          {level}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{skill.years_experience ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(skill.id)}
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

export default StudentSkillsPage;
