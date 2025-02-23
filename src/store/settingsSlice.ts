import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SystemPrompt, SettingsState, ModelParameters } from '../types';
import { v4 as uuidv4 } from 'uuid';

const initialState: SettingsState = {
  modelParameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0,
  },
  systemPrompt: '',
  systemPromptHistory: [],
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    updateModelParameters: (state, action: PayloadAction<Partial<ModelParameters>>) => {
      state.modelParameters = { ...state.modelParameters, ...action.payload };
    },
    saveSystemPrompt: (state, action: PayloadAction<{ content: string; name?: string }>) => {
      if (!state.systemPromptHistory) {
        state.systemPromptHistory = [];
      }
      const newPrompt: SystemPrompt = {
        id: uuidv4(),
        content: action.payload.content,
        created: Date.now(),
        name: action.payload.name,
      };
      state.systemPromptHistory.push(newPrompt);
      state.systemPrompt = action.payload.content;
    },
    setActiveSystemPrompt: (state, action: PayloadAction<string>) => {
      state.systemPrompt = action.payload;
    },
  },
});

export const { updateModelParameters, saveSystemPrompt, setActiveSystemPrompt } = settingsSlice.actions;
export default settingsSlice.reducer; 