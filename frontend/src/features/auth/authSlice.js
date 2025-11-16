// @ts-nocheck
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  isLogin: false, // Trạng thái đăng nhập
  token: null,
  refreshToken: null, // Store refreshToken in state
  role: null, // Store user role: 'user', 'seller', 'admin'
  rememberMe: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken, role, rememberMe } = action.payload;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthSlice] setCredentials called:', {
          hasUser: !!user,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          role: role || null,
          rememberMe: rememberMe || false,
        });
      }
      
      state.user = user;
      state.token = accessToken;
      state.refreshToken = refreshToken; // Store refreshToken in state for Redux Persist
      state.role = role || user?.role || null; // Store role from payload or user object
      state.isAuthenticated = true;
      state.isLogin = true; // Đánh dấu người dùng đã đăng nhập
      state.rememberMe = rememberMe || false;
      
      // Redux Persist will automatically save to localStorage['persist:auth']
      if (process.env.NODE_ENV === 'development') {
        console.log('[AuthSlice] Credentials saved to Redux state. Redux Persist will auto-save to persist:auth');
      }
    },
    
    logout: (state) => {
      // Clear all auth state - Xóa toàn bộ thông tin người dùng
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isLogin = false; // Đánh dấu người dùng đã đăng xuất
      state.rememberMe = false;
      
      // Note: Redux Persist will automatically sync cleared state to persist:auth
      // However, for complete cleanup, persistor.purge() should be called in the component
      // (see Header.tsx for example)
    },
    
    updateUser: (state, action) => {
      state.user = action.payload;
      // Redux Persist will automatically save updated user to persist:auth
    },
    
  },
  // Handle REHYDRATE action from redux-persist
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action) => {
        // When Redux Persist rehydrates, parse and restore state
      if (action.payload && action.payload.auth) {
        const { token, refreshToken, user, role, isAuthenticated, isLogin } = action.payload.auth;
        
        // Handle token - Redux Persist might store it as a JSON string
        let actualToken = token;
        if (token && typeof token === 'string') {
          // If token is a JSON string (wrapped in quotes), parse it
          if (token.startsWith('"') && token.endsWith('"')) {
            try {
              actualToken = JSON.parse(token);
            } catch (e) {
              console.warn('[AuthSlice] Error parsing token from persist:', e);
            }
          }
        }
        
        // Handle refreshToken - same as token
        let actualRefreshToken = refreshToken;
        if (refreshToken && typeof refreshToken === 'string') {
          if (refreshToken.startsWith('"') && refreshToken.endsWith('"')) {
            try {
              actualRefreshToken = JSON.parse(refreshToken);
            } catch (e) {
              console.warn('[AuthSlice] Error parsing refreshToken from persist:', e);
            }
          }
        }
        
        // Handle user - might be stored as JSON string
        let actualUser = user;
        if (user && typeof user === 'string') {
          try {
            actualUser = JSON.parse(user);
          } catch (e) {
            // If parsing fails, user might already be an object
            actualUser = user;
          }
        }
        
        // Update state with parsed values
        if (actualToken && actualToken !== 'null' && actualToken !== 'undefined') {
          state.token = actualToken;
        }
        if (actualRefreshToken && actualRefreshToken !== 'null' && actualRefreshToken !== 'undefined') {
          state.refreshToken = actualRefreshToken;
        }
        if (actualUser && typeof actualUser === 'object') {
          state.user = actualUser;
        }
        if (role && role !== 'null' && role !== 'undefined') {
          state.role = role;
        } else if (actualUser?.role) {
          state.role = actualUser.role;
        }
        if (isAuthenticated !== undefined) {
          state.isAuthenticated = isAuthenticated;
        }
        if (isLogin !== undefined) {
          state.isLogin = isLogin;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log('[AuthSlice] State rehydrated from Redux Persist');
        }
      }
    });
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;

