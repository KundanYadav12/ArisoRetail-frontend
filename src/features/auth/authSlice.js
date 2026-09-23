import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('turf_token');
const user = localStorage.getItem('turf_user') ? JSON.parse(localStorage.getItem('turf_user')) : null;

const initialState = {
  token: token || null,
  user: user || null,
  isAuthenticated: !!token
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload;
      state.token = token;
      state.user = user;
      state.isAuthenticated = true;
      localStorage.setItem('turf_token', token);
      localStorage.setItem('turf_user', JSON.stringify(user));
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('turf_token');
      localStorage.removeItem('turf_user');
    }
  }
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
