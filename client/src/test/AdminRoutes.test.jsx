import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import appReducer from '../store/appSlice';
import authReducer from '../store/authSlice';
import App from '../app/App';
import * as universityService from '../services/universityService';
import * as adminService from '../services/adminService';

vi.mock('../services/universityService');
vi.mock('../services/adminService');

const SUPER_ADMIN_USER = {
  id: 'u-super',
  email: 'super@example.com',
  first_name: 'Sam',
  last_name: 'Admin',
  roles: ['SUPER_ADMIN'],
  permissions: ['UNIVERSITY_CREATE', 'UNIVERSITY_VIEW'],
};

const STUDENT_USER = {
  id: 'u-student',
  email: 'student@example.com',
  first_name: 'Stu',
  last_name: 'Dent',
  roles: ['STUDENT'],
  permissions: ['UNIVERSITY_VIEW'],
};

const buildAuthenticatedStore = (user) =>
  configureStore({
    reducer: { app: appReducer, auth: authReducer },
    preloadedState: {
      app: { apiStatus: 'idle', apiMessage: '' },
      auth: { user, accessToken: 'test-token', isAuthenticated: true, loading: false, error: null },
    },
  });

const renderAt = (store, initialEntry) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <App />
      </MemoryRouter>
    </Provider>
  );

describe('Admin section routing', () => {
  it('redirects an unauthenticated visitor away from /admin to /login', async () => {
    const store = configureStore({
      reducer: { app: appReducer, auth: authReducer },
    });

    renderAt(store, '/admin');

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });

  it('redirects an authenticated non-admin user away from /admin to /dashboard', async () => {
    const store = buildAuthenticatedStore(STUDENT_USER);

    renderAt(store, '/admin');

    expect(await screen.findByText(/Hi, Stu/)).toBeInTheDocument();
    expect(screen.queryByText('Administration Dashboard')).not.toBeInTheDocument();
  });

  it('renders the Super Admin dashboard for a SUPER_ADMIN user and shows the Admin nav link', async () => {
    universityService.listUniversities.mockResolvedValue({ data: [], pagination: { total: 3 } });
    universityService.listMyUniversities.mockResolvedValue({ data: [] });
    adminService.listUsers.mockResolvedValue({ data: [], pagination: { total: 10 } });

    const store = buildAuthenticatedStore(SUPER_ADMIN_USER);

    renderAt(store, '/admin');

    expect(await screen.findByText('Administration Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
    expect(await screen.findAllByText('3')).not.toHaveLength(0);
  });

  it('renders the universities list page at /admin/universities for a SUPER_ADMIN user', async () => {
    universityService.listUniversities.mockResolvedValue({
      data: [{ id: 'uni-1', name: 'Test University', status: 'ACTIVE', country: 'US', city: 'Metropolis' }],
      pagination: { total: 1, page: 1, totalPages: 1 },
    });

    const store = buildAuthenticatedStore(SUPER_ADMIN_USER);

    renderAt(store, '/admin/universities');

    expect(await screen.findByText('Test University')).toBeInTheDocument();
  });
});
