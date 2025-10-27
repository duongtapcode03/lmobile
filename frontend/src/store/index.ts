// @ts-nocheck
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import createTransform from 'redux-persist/lib/createTransform';
import languageReducer from '../features/language/languageSlice';
import authReducer from '../features/auth/authSlice';

// Custom transform to handle rememberMe
const rememberMeTransform = createTransform(
  // Transform state on its way to being serialized and persisted
  (inboundState, key) => {
    // Only persist auth state if rememberMe is true
    if (key === 'auth' && inboundState.rememberMe === false) {
      return {}; // Return empty object to not persist
    }
    return inboundState;
  },
  // Transform state being rehydrated
  (outboundState, key) => {
    return outboundState;
  },
  { whitelist: ['auth'] } // Only apply to auth reducer
);

// Persistent config for auth
const authPersistConfig = {
  key: 'auth',
  storage: storage,
  whitelist: ['user', 'token', 'isAuthenticated', 'rememberMe'], // Only persist these fields
  transforms: [rememberMeTransform],
};

// Temporary reducer until we have actual reducers
const tempReducer = (state = {}) => {
  return state;
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    temp: tempReducer,
    language: languageReducer,
    auth: persistedAuthReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

