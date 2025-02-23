import { ChatSession, ModelParameters } from '../types';

const STORAGE_KEYS = {
  SESSIONS: 'ollama_sessions',
  SETTINGS: 'ollama_settings',
};

export const storageService = {
  saveSessions(sessions: ChatSession[]) {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  getSessions(): ChatSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return data ? JSON.parse(data) : [];
  },

  saveSettings(settings: { modelParameters: ModelParameters; theme: string }) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  getSettings() {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? JSON.parse(data) : null;
  },

  clearAll() {
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  },
}; 