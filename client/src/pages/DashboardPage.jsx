import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { checkStarted, checkSucceeded, checkFailed } from '../store/appSlice';
import { fetchCurrentUser } from '../store/authSlice';
import { fetchHealth } from '../services/healthService';
import LoadingSpinner from '../components/LoadingSpinner';

const statusStyles = {
  checking: 'text-slate-500',
  online: 'text-emerald-600',
  offline: 'text-red-600',
  idle: 'text-slate-500',
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const { apiStatus, apiMessage } = useSelector((state) => state.app);
  const { user, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      dispatch(checkStarted());
      try {
        const data = await fetchHealth();
        if (isMounted) dispatch(checkSucceeded(data.api === 'ok' ? 'API is running' : 'API responded'));
      } catch (error) {
        if (isMounted) dispatch(checkFailed());
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchCurrentUser());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Temporary authenticated shell — the real Academic Connect dashboard arrives in a later chunk.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-900">Signed in as</h2>
        <div className="mt-3">
          {loading && !user ? (
            <LoadingSpinner label="Loading your account…" />
          ) : user ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Name</dt>
                <dd className="text-sm text-slate-900">
                  {user.display_name || `${user.first_name} ${user.last_name}`}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Email</dt>
                <dd className="text-sm text-slate-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
                <dd className="text-sm text-slate-900">{user.status}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Roles</dt>
                <dd className="text-sm text-slate-900">{user.roles?.join(', ') || 'None'}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">Unable to load your account.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-medium text-slate-900">API Connectivity</h2>
        <div className="mt-3">
          {apiStatus === 'checking' && <LoadingSpinner label="Checking API connection…" />}
          {apiStatus !== 'checking' && (
            <p className={`text-sm ${statusStyles[apiStatus]}`}>
              {apiStatus === 'online' && `Connected — ${apiMessage}`}
              {apiStatus === 'offline' && 'Unable to reach the API. Is the server running?'}
              {apiStatus === 'idle' && 'Not checked yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
