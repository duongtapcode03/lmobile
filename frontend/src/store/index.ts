import { configureStore } from '@reduxjs/toolkit';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import { persistStore, persistReducer, authPersistConfig, filterPersistConfig } from './persist';
import languageReducer from '../features/language/languageSlice';
import authReducer from '../features/auth/authSlice';
import filterReducer from '../features/filter/filterSlice';
import cartReducer from '../features/cart/cartSlice';

// Temporary reducer until we have actual reducers
const tempReducer = (state = {}) => {
  return state;
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);
const persistedFilterReducer = persistReducer(filterPersistConfig, filterReducer);

export const store = configureStore({
  reducer: {
    temp: tempReducer,
    language: languageReducer,
    auth: persistedAuthReducer,
    filter: persistedFilterReducer,
    cart: cartReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Export RootState type for use in components
export type RootState = ReturnType<typeof store.getState>;

