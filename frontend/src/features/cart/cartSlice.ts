import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { userService } from '../../api/userService';
import type { Cart, CartItem } from '../../api/cartService.types';

interface CartState {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  totalItems: number;
  totalAmount: number;
}

const initialState: CartState = {
  cart: null,
  loading: false,
  error: null,
  totalItems: 0,
  totalAmount: 0,
};

// Async thunks
export const fetchCart = createAsyncThunk('cart/fetchCart', async (_, { rejectWithValue }) => {
  try {
    const cart = await userService.getCart();
    return cart;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Không thể tải giỏ hàng');
  }
});

export const addToCart = createAsyncThunk(
  'cart/addToCart',
  async (
    data: { productId: string | number; quantity: number; variantId?: number },
    { rejectWithValue }
  ) => {
    try {
      const result = await userService.addToCart({
        productId: data.productId,
        quantity: data.quantity,
        variantId: data.variantId,
      });
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Không thể thêm sản phẩm vào giỏ hàng');
    }
  }
);

export const updateCartItem = createAsyncThunk(
  'cart/updateCartItem',
  async (
    { itemId, quantity }: { itemId: string; quantity: number },
    { rejectWithValue }
  ) => {
    try {
      const result = await userService.updateCartItem(itemId, quantity);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Không thể cập nhật giỏ hàng');
    }
  }
);

export const removeFromCart = createAsyncThunk(
  'cart/removeFromCart',
  async (itemId: string, { rejectWithValue }) => {
    try {
      await userService.removeFromCart(itemId);
      return itemId;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Không thể xóa sản phẩm khỏi giỏ hàng');
    }
  }
);

export const clearCart = createAsyncThunk('cart/clearCart', async (_, { rejectWithValue }) => {
  try {
    await userService.clearCart();
    return null;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Không thể xóa giỏ hàng');
  }
});

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCart: (state) => {
      state.cart = null;
      state.totalItems = 0;
      state.totalAmount = 0;
      state.error = null;
    },
    setCart: (state, action) => {
      state.cart = action.payload;
      state.totalItems = action.payload?.totalItems || 0;
      state.totalAmount = action.payload?.totalAmount || 0;
    },
  },
  extraReducers: (builder) => {
    // Fetch cart
    builder
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action) => {
        state.loading = false;
        state.cart = action.payload;
        state.totalItems = action.payload?.totalItems || action.payload?.items?.length || 0;
        state.totalAmount = action.payload?.totalAmount || 0;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Add to cart
    builder
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        state.loading = false;
        // Update cart with new data
        if (action.payload) {
          state.cart = action.payload;
          state.totalItems = action.payload?.totalItems || action.payload?.items?.length || 0;
          state.totalAmount = action.payload?.totalAmount || 0;
        }
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update cart item
    builder
      .addCase(updateCartItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCartItem.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload) {
          state.cart = action.payload;
          state.totalItems = action.payload?.totalItems || action.payload?.items?.length || 0;
          state.totalAmount = action.payload?.totalAmount || 0;
        }
      })
      .addCase(updateCartItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Remove from cart
    builder
      .addCase(removeFromCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        state.loading = false;
        // Update cart locally by removing the item
        if (state.cart && state.cart.items) {
          state.cart.items = state.cart.items.filter(
            (item) => item._id !== action.payload
          );
          state.totalItems = state.cart.items.length;
          state.totalAmount = state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
          // Update cart totals
          if (state.cart.totalItems !== undefined) {
            state.cart.totalItems = state.totalItems;
          }
          if (state.cart.totalAmount !== undefined) {
            state.cart.totalAmount = state.totalAmount;
          }
        }
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Clear cart
    builder
      .addCase(clearCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(clearCart.fulfilled, (state) => {
        state.loading = false;
        state.cart = null;
        state.totalItems = 0;
        state.totalAmount = 0;
      })
      .addCase(clearCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;

