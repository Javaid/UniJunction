import { useEffect, useState } from 'react';

import * as studentService from '../../services/studentService';
import PageHeader from '../../components/PageHeader';
import FormField from '../../components/FormField';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';

const GOAL_TYPES = [
  'RESEARCH',
  'MENTORSHIP',
  'INTERNSHIP',
  'PROJECT',
  'SCHOLARSHIP',
  'GRADUATE_STUDY',
  'CAREER',
  'COMPETITION',
  'OTHER',
];
const GOAL_STATUSES = ['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED'];

const EMPTY_FORM = { goal_type: 'RESEARCH', title: '', description: '', target_date: '' };

const GoalForm = ({ initial, onSubmit, onCancel }) => {
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
      setError(err.response?.data?.message || 'Unable to save goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="goal_type" className="block text-sm font-medium text-slate-700">
            Goal Type
          </label>
          <select
            id="goal_type"
            name="goal_type"
            value={form.goal_type}
            onChange={handleChange}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            {GOAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
        <FormField id="title" name="title" label="Title" value={form.title} onChange={handleChange} required />
        <FormField id="target_date" name="target_date" type="date" label="Target Date" value={form.target_date} onChange={handleChange} />
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

const StudentGoalsPage = () => {
  const [goals, setGoals] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const res = await studentService.listMyGoals();
    setGoals(res.data);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (form) => {
    await studentService.createMyGoal(form);
    setShowForm(false);
    load();
  };

  const handleUpdate = async (form) => {
    await studentService.updateMyGoal(editing.id, form);
    setEditing(null);
    load();
  };

  const handleStatusChange = async (goal, status) => {
    await studentService.updateMyGoal(goal.id, { status });
    load();
  };

  const handleDelete = async (id) => {
    await studentService.deleteMyGoal(id);
    load();
  };

  if (goals === null) return <LoadingSpinner label="Loading goals…" />;

  return (
    <div>
      <PageHeader
        title="Academic Goals"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {showForm ? 'Close' : 'Add Goal'}
          </button>
        }
      />

      {showForm && <GoalForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      {goals.length === 0 ? (
        <EmptyState title="No goals yet" />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) =>
            editing?.id === goal.id ? (
              <GoalForm key={goal.id} initial={goal} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
            ) : (
              <div key={goal.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{goal.title}</p>
                    <p className="text-sm text-slate-500">{goal.goal_type.replace(/_/g, ' ')}</p>
                    {goal.target_date && <p className="text-xs text-slate-400">Target: {goal.target_date}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={goal.status}
                      onChange={(e) => handleStatusChange(goal, e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      {GOAL_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <StatusBadge status={goal.status} />
                    <button type="button" onClick={() => setEditing(goal)} className="text-sm font-medium text-brand-700">
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(goal.id)} className="text-sm font-medium text-red-600">
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

export default StudentGoalsPage;
