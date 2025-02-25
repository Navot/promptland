import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  activeTab: 'chat' | 'rag';
}

const initialState: UiState = {
  activeTab: 'chat'
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<'chat' | 'rag'>) => {
      state.activeTab = action.payload;
    }
  }
});

export const { setActiveTab } = uiSlice.actions;
export default uiSlice.reducer; 