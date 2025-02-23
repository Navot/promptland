import { Middleware } from '@reduxjs/toolkit';
import { storageService } from '../../services/storage';

export const persistMiddleware: Middleware = (store) => (next) => (action) => {
  const result = next(action);
  const state = store.getState();

  // Save sessions when they change
  if (action.type.startsWith('chat/')) {
    storageService.saveSessions(state.chat.sessions);
  }

  // Save settings when they change
  if (action.type.startsWith('settings/')) {
    storageService.saveSettings({
      modelParameters: state.settings.modelParameters,
      theme: state.settings.theme,
    });
  }

  return result;
}; 