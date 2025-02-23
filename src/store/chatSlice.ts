import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatSession, Message } from '../types';

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
}

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    createSession: (state, action: PayloadAction<ChatSession>) => {
      state.sessions.push(action.payload);
      state.currentSessionId = action.payload.id;
    },
    addMessage: (state, action: PayloadAction<{ sessionId: string; message: Message }>) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.messages.push(action.payload.message);
      }
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    resetSession: (state, action: PayloadAction<string>) => {
      const session = state.sessions.find(s => s.id === action.payload);
      if (session) {
        session.messages = [];
      }
    },
    updateMessage: (
      state,
      action: PayloadAction<{
        sessionId: string;
        messageId: string;
        content: string;
        append?: boolean;
      }>
    ) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        const message = session.messages.find(m => m.id === action.payload.messageId);
        if (message) {
          if (action.payload.append) {
            message.content += action.payload.content;
          } else {
            message.content = action.payload.content;
          }
        }
      }
    },
  },
});

export const { createSession, addMessage, setCurrentSession, resetSession, updateMessage } = chatSlice.actions;
export default chatSlice.reducer; 