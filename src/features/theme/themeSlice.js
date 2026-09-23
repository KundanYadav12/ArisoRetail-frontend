import { createSlice } from '@reduxjs/toolkit';

// Persist theme across sessions
const savedTheme = localStorage.getItem('turf_theme') || 'dark';

const themeSlice = createSlice({
  name: 'theme',
  initialState: {
    mode: savedTheme, // 'dark' | 'light'
  },
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('turf_theme', state.mode);
      // Apply to <html> element immediately for instant CSS variable swap
      document.documentElement.setAttribute('data-theme', state.mode);
    },
    setTheme: (state, action) => {
      state.mode = action.payload;
      localStorage.setItem('turf_theme', state.mode);
      document.documentElement.setAttribute('data-theme', state.mode);
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
