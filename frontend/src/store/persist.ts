/**
 * Redux Persist Configuration
 */

import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

// Persistent config for auth
export const authPersistConfig = {
  key: 'auth',
  storage: storage, // Lưu vào localStorage['persist:auth']
  whitelist: ['user', 'token', 'refreshToken', 'role', 'isAuthenticated', 'isLogin', 'rememberMe'],
};

export { persistStore, persistReducer };

