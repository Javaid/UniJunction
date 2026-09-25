import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { checkStarted, checkSucceeded, checkFailed } from '../store/appSlice';
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

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      dispatch(checkStarted());
      try {
        const data = await fetchHealth();
        if (isMounted) dispatch(checkSucceeded(data.message));
      } catch (error) {
        if (isMounted) dispatch(checkFailed());
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Placeholder page reserved for the authenticated home experience.
        </p>
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
