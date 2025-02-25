export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  messages: Message[];
  modelId: string;
  created: number;
}

export interface Project {
  id: string;
  name: string;
  created: number;
  embedding_model: string;
  chunk_size: number;
  embedding_type: 'summary' | 'direct';
}

export interface DocumentFile {
  id: string;
  project_id: string;
  filename: string;
  status: 'processing' | 'completed' | 'error';
  chunk_count?: number;
  created: number;
}

export interface Chunk {
  id: string;
  fileId: string;
  projectId: string;
  chunkText: string;
  shortDescription: string;
  embeddingVector: number[];
  created: number;
}

export interface RagQueryResult {
  answer: string;
  sourceChunks: {
    id: string;
    chunk_text: string;
    short_description: string | null;
    similarity: number;
  }[];
}

export interface RagSettings {
  chunkSize: number;
  topK: number;
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