import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// Auth slice for managing authentication state
interface User {
  _id?: string;
  name?: string;
  email?: string;
  role?: 'user' | 'seller' | 'admin';
  phone?: string;
  address?: string;
  avatar?: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLogin: boolean;
  token: string | null;
  refreshToken: string | null;
  role: 'user' | 'seller' | 'admin' | null;
  rememberMe: boolean;
}

interface SetCredentialsPayload {
  user: User;
  accessToken: string;
  refreshToken?: string;
  role?: 'user' | 'seller' | 'admin';
  rememberMe?: boolean;
}


const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLogin: false,
  token: null,
  refreshToken: null,
  role: null,
  rememberMe: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<SetCredentialsPayload>) => {
      const { user, accessToken, refreshToken, role, rememberMe } = action.payload;
      
      if (import.meta.env.DEV) {
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
      state.refreshToken = refreshToken || null;
      state.role = role || user?.role || null;
      state.isAuthenticated = true;
      state.isLogin = true;
      state.rememberMe = rememberMe || false;
      
      if (import.meta.env.DEV) {
        console.log('[AuthSlice] Credentials saved to Redux state. Redux Persist will auto-save to persist:auth');
      }
    },
    
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.role = null;
      state.isAuthenticated = false;
      state.isLogin = false;
      state.rememberMe = false;
    },
    
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase('persist/REHYDRATE', (state, action: any) => {
      const payload = action.payload as { auth?: AuthState } | undefined;
      if (payload && payload.auth) {
        const { token, refreshToken, user, role, isAuthenticated, isLogin } = payload.auth;
        
        let actualToken = token;
        if (token && typeof token === 'string') {
          if (token.startsWith('"') && token.endsWith('"')) {
            try {
              actualToken = JSON.parse(token);
            } catch (e) {
              console.warn('[AuthSlice] Error parsing token from persist:', e);
            }
          }
        }
        
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
        
        let actualUser = user;
        if (user && typeof user === 'string') {
          try {
            actualUser = JSON.parse(user);
          } catch (e) {
            actualUser = user;
          }
        }
        
        if (actualToken && actualToken !== 'null' && actualToken !== 'undefined') {
          state.token = actualToken;
        }
        if (actualRefreshToken && actualRefreshToken !== 'null' && actualRefreshToken !== 'undefined') {
          state.refreshToken = actualRefreshToken;
        }
        if (actualUser && typeof actualUser === 'object') {
          state.user = actualUser;
        }
        if (role && typeof role === 'string' && (role === 'user' || role === 'seller' || role === 'admin')) {
          state.role = role as 'user' | 'seller' | 'admin';
        } else if (actualUser?.role) {
          state.role = actualUser.role;
        }
        if (isAuthenticated !== undefined) {
          state.isAuthenticated = isAuthenticated;
        }
        if (isLogin !== undefined) {
          state.isLogin = isLogin;
        }
        
        if (import.meta.env.DEV) {
          console.log('[AuthSlice] State rehydrated from Redux Persist');
        }
      }
    });
  },
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;

export type { AuthState, User };

