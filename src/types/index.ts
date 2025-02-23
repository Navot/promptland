export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  messages: Message[];
  modelId: string;
  created: number;
  title?: string;
}

export interface Model {
  id: string;
  name: string;
  description?: string;
  parameters?: ModelParameters;
}

export interface ModelParameters {
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
}

export interface SystemPrompt {
  id: string;
  content: string;
  created: number;
  name?: string;
}

export interface SettingsState {
  modelParameters: ModelParameters;
  systemPrompt: string;
  systemPromptHistory: SystemPrompt[];
} 