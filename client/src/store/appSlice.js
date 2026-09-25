import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  apiStatus: 'idle', // 'idle' | 'checking' | 'online' | 'offline'
  apiMessage: '',
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    checkStarted(state) {
      state.apiStatus = 'checking';
    },
    checkSucceeded(state, action) {
      state.apiStatus = 'online';
      state.apiMessage = action.payload;
    },
    checkFailed(state) {
      state.apiStatus = 'offline';
      state.apiMessage = '';
    },
  },
});

export const { checkStarted, checkSucceeded, checkFailed } = appSlice.actions;
export default appSlice.reducer;
