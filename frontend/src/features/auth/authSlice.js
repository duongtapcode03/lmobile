// @ts-nocheck
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  token: null,
  rememberMe: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken, rememberMe } = action.payload;
      state.user = user;
      state.token = accessToken;
      state.isAuthenticated = true;
      state.rememberMe = rememberMe || false;
      
      // Also store refreshToken in localStorage for API calls
      localStorage.setItem('refreshToken', refreshToken);
      
      // Store rememberMe in localStorage
      localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
    },
    
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.rememberMe = false;
      
      // Clear tokens and rememberMe from localStorage
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('rememberMe');
    },
    
    updateUser: (state, action) => {
      state.user = action.payload;
    },
    
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;

