import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import authReducer, { setAccessToken, clearAuth } from './authSlice';
import { setAuthHandlers } from '../services/apiClient';

/**
 * Root Redux store. Feature slices register their reducers here as
 * they are built out in later chunks, e.g.:
 *   users: usersReducer,
 */
export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
  },
});

// Wires the Axios client's token refresh/auth-failure hooks to real
// Redux state now that the store exists — see apiClient.js for why this
// isn't a direct `import { store }` there (it would create an import
// cycle through authSlice -> authService -> apiClient).
setAuthHandlers({
  getAccessToken: () => store.getState().auth.accessToken,
  onTokenRefreshed: (accessToken) => store.dispatch(setAccessToken(accessToken)),
  onAuthFailure: () => store.dispatch(clearAuth()),
});
