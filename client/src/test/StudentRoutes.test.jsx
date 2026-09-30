import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import appReducer from '../store/appSlice';
import authReducer from '../store/authSlice';
import App from '../app/App';
import * as studentService from '../services/studentService';
import * as universityService from '../services/universityService';

vi.mock('../services/studentService');
vi.mock('../services/universityService');

const STUDENT_USER = {
  id: 'u-student',
  email: 'student@example.com',
  first_name: 'Stu',
  last_name: 'Dent',
  roles: ['STUDENT'],
  permissions: ['UNIVERSITY_VIEW'],
};

const FACULTY_USER = {
  id: 'u-faculty',
  email: 'faculty@example.com',
  first_name: 'Fac',
  last_name: 'Ulty',
  roles: ['FACULTY'],
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

const notFoundError = () => {
  const error = new Error('Not found');
  error.response = { status: 404, data: { success: false, message: 'You do not have a student profile yet.' } };
  return error;
};

describe('Student profile section routing', () => {
  it('redirects an unauthenticated visitor away from /student/profile to /login', async () => {
    const store = configureStore({ reducer: { app: appReducer, auth: authReducer } });

    renderAt(store, '/student/profile');

    expect(await screen.findByRole('heading', { name: 'Log In' })).toBeInTheDocument();
  });

  it('redirects an authenticated non-STUDENT away from /student/profile to /dashboard', async () => {
    const store = buildAuthenticatedStore(FACULTY_USER);

    renderAt(store, '/student/profile');

    expect(await screen.findByText(/Hi, Fac/)).toBeInTheDocument();
    expect(screen.queryByText('Create your student profile')).not.toBeInTheDocument();
  });

  it('shows the create-profile form for a STUDENT with an active membership and no profile yet, and the "My Profile" nav link', async () => {
    studentService.getMyProfile.mockRejectedValue(notFoundError());
    universityService.listMyUniversities.mockResolvedValue({
      data: [{ university_id: 'uni-1', membership_type: 'STUDENT', status: 'ACTIVE' }],
    });
    universityService.getUniversity.mockResolvedValue({ data: { id: 'uni-1', name: 'Test University' } });
    universityService.listPrograms.mockResolvedValue({ data: [] });

    const store = buildAuthenticatedStore(STUDENT_USER);
    renderAt(store, '/student/profile');

    expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument();
    expect(await screen.findByText('Create your student profile')).toBeInTheDocument();
  });

  it("renders an existing profile's headline and university", async () => {
    studentService.getMyProfile.mockResolvedValue({
      data: {
        id: 'profile-1',
        user: { first_name: 'Stu', last_name: 'Dent', display_name: null },
        university: { id: 'uni-1', name: 'Test University', status: 'ACTIVE' },
        program: null,
        headline: 'Computer Science Student',
        bio: null,
        academic_status: 'ACTIVE',
        availability_status: 'NOT_SPECIFIED',
        skills: [],
        interests: [],
        research_interests: [],
        languages: [],
        certifications: [],
        achievements: [],
        goals: [],
        profile_completeness: { score: 20, missing: [{ label: 'Add a headline', points: 10 }] },
      },
    });

    const store = buildAuthenticatedStore(STUDENT_USER);
    renderAt(store, '/student/profile');

    expect(await screen.findByText('Computer Science Student')).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument();
  });
});
