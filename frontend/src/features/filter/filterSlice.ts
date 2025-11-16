import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface FilterState {
  category?: number | string; // Category ID (number or string for backward compatibility)
  brands: (number | string)[]; // Brand IDs (numbers or strings for backward compatibility)
  priceRange: [number, number];
  inStock?: boolean;
  storage?: string[];
  nfc?: string[];
  screenSize?: string[];
}

interface FilterSliceState {
  filters: FilterState;
  selectedCategoryId: number | string | null; // Category ID (number or string)
}

const initialState: FilterSliceState = {
  filters: {
    category: undefined,
    brands: [],
    priceRange: [0, 50000000],
    inStock: undefined,
    storage: undefined,
    nfc: undefined,
    screenSize: undefined,
  },
  selectedCategoryId: null,
};

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setCategory: (state, action: PayloadAction<number | string | null>) => {
      state.selectedCategoryId = action.payload;
      state.filters.category = action.payload || undefined;
    },
    setFilters: (state, action: PayloadAction<FilterState>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Đồng bộ category với selectedCategoryId
      if (action.payload.category !== undefined) {
        state.selectedCategoryId = action.payload.category || null;
      }
    },
    updateFilter: (state, action: PayloadAction<Partial<FilterState>>) => {
      state.filters = { ...state.filters, ...action.payload };
      // Đồng bộ category với selectedCategoryId
      if (action.payload.category !== undefined) {
        state.selectedCategoryId = action.payload.category || null;
      }
    },
    setBrands: (state, action: PayloadAction<(number | string)[]>) => {
      state.filters.brands = action.payload;
    },
    setPriceRange: (state, action: PayloadAction<[number, number]>) => {
      state.filters.priceRange = action.payload;
    },
    setInStock: (state, action: PayloadAction<boolean | undefined>) => {
      state.filters.inStock = action.payload;
    },
    setStorage: (state, action: PayloadAction<string[] | undefined>) => {
      state.filters.storage = action.payload;
    },
    setNfc: (state, action: PayloadAction<string[] | undefined>) => {
      state.filters.nfc = action.payload;
    },
    setScreenSize: (state, action: PayloadAction<string[] | undefined>) => {
      state.filters.screenSize = action.payload;
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
      state.selectedCategoryId = null;
    },
  },
});

export const {
  setCategory,
  setFilters,
  updateFilter,
  setBrands,
  setPriceRange,
  setInStock,
  setStorage,
  setNfc,
  setScreenSize,
  resetFilters,
} = filterSlice.actions;

export default filterSlice.reducer;

