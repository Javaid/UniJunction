import authReducer, {
  loginUser,
  logoutUser,
  registerUser,
  setAccessToken,
  clearAuth,
} from '../store/authSlice';

const initialState = { user: null, accessToken: null, isAuthenticated: false, loading: false, error: null };

describe('authSlice reducer', () => {
  it('returns the initial state', () => {
    expect(authReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('sets loading on loginUser.pending', () => {
    const state = authReducer(initialState, { type: loginUser.pending.type });
    expect(state.loading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores the user, access token, and marks authenticated on loginUser.fulfilled', () => {
    const payload = {
      access_token: 'token-123',
      user: { id: 'u1', email: 'a@b.com', first_name: 'A', last_name: 'B', roles: ['STUDENT'] },
    };
    const state = authReducer(initialState, { type: loginUser.fulfilled.type, payload });

    expect(state.isAuthenticated).toBe(true);
    expect(state.accessToken).toBe('token-123');
    expect(state.user).toEqual(payload.user);
    expect(state.loading).toBe(false);
  });

  it('stores the error message on loginUser.rejected without authenticating', () => {
    const state = authReducer(initialState, {
      type: loginUser.rejected.type,
      payload: 'Invalid email or password.',
    });

    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid email or password.');
  });

  it('clears everything on logoutUser.fulfilled', () => {
    const authenticated = { ...initialState, isAuthenticated: true, accessToken: 't', user: { id: 'u1' } };
    const state = authReducer(authenticated, { type: logoutUser.fulfilled.type });

    expect(state).toEqual({ ...initialState, error: null });
  });

  it('does not set isAuthenticated on a successful registration (verification still pending)', () => {
    const state = authReducer(initialState, {
      type: registerUser.fulfilled.type,
      payload: { user: { id: 'u1' } },
    });
    expect(state.isAuthenticated).toBe(false);
  });

  it('setAccessToken updates only the token', () => {
    const state = authReducer(initialState, setAccessToken('new-token'));
    expect(state.accessToken).toBe('new-token');
  });

  it('clearAuth resets authentication fields', () => {
    const authenticated = { ...initialState, isAuthenticated: true, accessToken: 't', user: { id: 'u1' } };
    const state = authReducer(authenticated, clearAuth());
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
