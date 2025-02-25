import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  messages: Message[];
  modelId: string;
  created: number;
  title?: string;
}

interface ChatState {
  sessions: Session[];
  currentSessionId: string | null;
  conversations: Conversation[];
  selectedConversationId: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  created: number;
  updated: number;
  modelId: string;
}

const initialState: ChatState = {
  sessions: [],
  currentSessionId: null,
  conversations: [],
  selectedConversationId: null
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    createSession: (state, action: PayloadAction<Session>) => {
      state.sessions.push(action.payload);
      state.currentSessionId = action.payload.id;
    },
    setCurrentSession: (state, action: PayloadAction<string>) => {
      state.currentSessionId = action.payload;
    },
    resetSession: (state, action: PayloadAction<string>) => {
      const sessionIndex = state.sessions.findIndex(s => s.id === action.payload);
      if (sessionIndex !== -1) {
        state.sessions[sessionIndex].messages = [];
      }
    },
    addMessage: (state, action: PayloadAction<{ sessionId: string; message: Message }>) => {
      const { sessionId, message } = action.payload;
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        // If message doesn't have an ID, generate one
        if (!message.id) {
          message.id = uuidv4();
        }
        session.messages.push(message);
      }
    },
    updateMessage: (state, action: PayloadAction<{ 
      sessionId: string; 
      messageId: string; 
      content: string;
      append?: boolean;
    }>) => {
      const { sessionId, messageId, content, append } = action.payload;
      const session = state.sessions.find(s => s.id === sessionId);
      if (session) {
        const message = session.messages.find(m => m.id === messageId);
        if (message) {
          if (append) {
            message.content += content;
          } else {
            message.content = content;
          }
        }
      }
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      state.sessions = state.sessions.filter(s => s.id !== action.payload);
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = state.sessions.length > 0 ? state.sessions[0].id : null;
      }
    },
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      state.conversations.push(action.payload);
      state.selectedConversationId = action.payload.id;
    },
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { id: string }>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = { ...state.conversations[index], ...action.payload };
      }
    },
    deleteConversation: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(c => c.id !== action.payload);
      if (state.selectedConversationId === action.payload) {
        state.selectedConversationId = state.conversations.length > 0 ? state.conversations[0].id : null;
      }
    },
    // Add this new reducer
    setSelectedConversation: (state, action: PayloadAction<string>) => {
      state.selectedConversationId = action.payload;
    }
  },
});

export const { 
  createSession, 
  setCurrentSession, 
  resetSession, 
  addMessage, 
  updateMessage, 
  deleteSession,
  setConversations,
  addConversation,
  updateConversation,
  deleteConversation,
  setSelectedConversation
} = chatSlice.actions;

export default chatSlice.reducer; 