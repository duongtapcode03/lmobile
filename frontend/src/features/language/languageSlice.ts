import { createSlice } from '@reduxjs/toolkit';
import i18n from '../../config/i18n';

const initialState = {
  currentLanguage: localStorage.getItem('i18nextLng') || 'vi',
};

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action) => {
      const newLanguage = action.payload;
      state.currentLanguage = newLanguage;
      i18n.changeLanguage(newLanguage);
      localStorage.setItem('i18nextLng', newLanguage);
    },
  },
});

export const { setLanguage } = languageSlice.actions;
export default languageSlice.reducer;

