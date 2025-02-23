import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ModelParameters } from '../types';

interface SettingsState {
  modelParameters: ModelParameters;
  systemPrompt: string;
  theme: 'light' | 'dark';
}

const initialState: SettingsState = {
  modelParameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
  },
  systemPrompt: '',
  theme: 'light',
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateParameters: (state, action: PayloadAction<Partial<ModelParameters>>) => {
      state.modelParameters = { ...state.modelParameters, ...action.payload };
    },
    setSystemPrompt: (state, action: PayloadAction<string>) => {
      state.systemPrompt = action.payload;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
  },
});

export const { updateParameters, setSystemPrompt, toggleTheme } = settingsSlice.actions;
export default settingsSlice.reducer; 