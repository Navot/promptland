export interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface Model {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[] | null;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ModelParameters {
  temperature?: number;
  top_k?: number;
  top_p?: number;
  repeat_penalty?: number;
  seed?: number;
  num_predict?: number;
  stop?: string[];
  num_ctx?: number;
} 