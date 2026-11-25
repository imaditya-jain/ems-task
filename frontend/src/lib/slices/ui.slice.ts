import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { readInitialTheme, type Theme } from '@/lib/theme'

interface UiState {
  theme: Theme
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: (): UiState => ({ theme: readInitialTheme() }),
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
  },
})

export const { setTheme, toggleTheme } = uiSlice.actions
export default uiSlice.reducer
