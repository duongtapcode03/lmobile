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

// Persistent config for filter (giống như auth, hoạt động cả khi chưa đăng nhập)
export const filterPersistConfig = {
  key: 'filter',
  storage: storage, // Lưu vào localStorage['persist:filter']
};

export { persistStore, persistReducer };

