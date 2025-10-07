import { configureStore } from '@reduxjs/toolkit';
// import authReducer from '../features/auth/authSlice';
// import productReducer from '../features/products/productSlice';
// import cartReducer from '../features/cart/cartSlice';

// Temporary reducer until we have actual reducers
const tempReducer = (state = {}) => {
  return state;
};

export const store = configureStore({
  reducer: {
    temp: tempReducer,
    // auth: authReducer,
    // products: productReducer,
    // cart: cartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
