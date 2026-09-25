import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import * as authService from '../services/authService';
import { getRefreshToken, setRefreshToken, clearRefreshToken } from '../services/tokenStore';

const extractErrorMessage = (error, fallback) =>
  error.response?.data?.message || fallback;

export const registerUser = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    return await authService.register(payload);
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Registration failed.'));
  }
});

export const loginUser = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const data = await authService.login(payload);
    setRefreshToken(data.refresh_token);
    return data;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Invalid email or password.'));
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await authService.logout(refreshToken);
    } catch (error) {
      // Logout should never fail the UI action — proceed to clear state regardless.
    }
  }
  clearRefreshToken();
});

export const fetchCurrentUser = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const data = await authService.fetchCurrentUser();
    return data.user;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error, 'Unable to load the current user.'));
  }
});

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken(state, action) {
      state.accessToken = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.accessToken = action.payload.access_token;
        state.user = action.payload.user;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isAuthenticated = false;
      })

      .addCase(fetchCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
      });
  },
});

export const { setAccessToken, clearAuth, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
