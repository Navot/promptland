import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import settingsReducer from './settingsSlice';
import chatReducer from './chatSlice';

const settingsPersistConfig = {
  key: 'settings',
  storage,
  whitelist: ['modelParameters', 'systemPrompt', 'systemPromptHistory'], // what to persist
};

const chatPersistConfig = {
  key: 'chat',
  storage,
  whitelist: ['sessions'], // what to persist
};

export const store = configureStore({
  reducer: {
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    chat: persistReducer(chatPersistConfig, chatReducer),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // needed for persist
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 