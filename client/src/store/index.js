import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';

/**
 * Root Redux store. Feature slices register their reducers here as
 * they are built out in later chunks, e.g.:
 *   auth: authReducer,
 *   users: usersReducer,
 */
export const store = configureStore({
  reducer: {
    app: appReducer,
  },
});
