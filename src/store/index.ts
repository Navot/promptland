import { configureStore } from '@reduxjs/toolkit';
import chatReducer from './chatSlice';
import settingsReducer from './settingsSlice';
import { persistMiddleware } from './middleware/persistMiddleware';
import { storageService } from '../services/storage';

// Load initial state from storage
const savedSettings = storageService.getSettings();
const savedSessions = storageService.getSessions();

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    settings: settingsReducer,
  },
  preloadedState: {
    chat: {
      sessions: savedSessions,
      currentSessionId: savedSessions[0]?.id || null,
    },
    settings: savedSettings || undefined,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(persistMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 