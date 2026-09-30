import { useEffect, useState } from 'react';

import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const EMPTY_FORM = { title: '', description: '', organization: '', achievement_date: '', url: '' };

const AchievementForm = ({ initial, onSubmit, onCancel }) => {
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
      setError(err.response?.data?.message || 'Unable to save achievement.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField id="title" name="title" label="Title" value={form.title} onChange={handleChange} required />
        <FormField id="organization" name="organization" label="Organization" value={form.organization} onChange={handleChange} />
        <FormField
          id="achievement_date"
          name="achievement_date"
          type="date"
          label="Date"
          value={form.achievement_date}
          onChange={handleChange}
        />
        <FormField id="url" name="url" label="URL" value={form.url} onChange={handleChange} />
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

const StudentAchievementsPage = () => {
  const [achievements, setAchievements] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const res = await studentService.listMyAchievements();
    setAchievements(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (form) => {
    await studentService.createMyAchievement(form);
    setShowForm(false);
    load();
  };

  const handleUpdate = async (form) => {
    await studentService.updateMyAchievement(editing.id, form);
    setEditing(null);
    load();
  };

  const handleDelete = async (id) => {
    await studentService.deleteMyAchievement(id);
    load();
  };

  if (achievements === null) return <LoadingSpinner label="Loading achievements…" />;

  return (
    <div>
      <PageHeader
        title="Achievements"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? 'Close' : 'Add Achievement'}
          </button>
        }
      />

      {showForm && <AchievementForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {achievements.length === 0 ? (
        <EmptyState title="No achievements yet" />
      ) : (
        <div className="space-y-3">
          {achievements.map((achievement) =>
            editing?.id === achievement.id ? (
              <AchievementForm
                key={achievement.id}
                initial={achievement}
                onSubmit={handleUpdate}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <div key={achievement.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{achievement.title}</p>
                    {achievement.organization && <p className="text-sm text-slate-500">{achievement.organization}</p>}
                    {achievement.achievement_date && <p className="text-xs text-slate-400">{achievement.achievement_date}</p>}
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button type="button" onClick={() => setEditing(achievement)} className="font-medium text-brand-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(achievement.id)} className="font-medium text-red-600">
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

export default StudentAchievementsPage;
