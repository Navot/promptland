import axios from 'axios';
import { Message, Model, ModelParameters } from '../types';

const API_BASE_URL = 'http://localhost:11434/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const ollamaApi = {
  // Get list of available models
  getModels: async (): Promise<Model[]> => {
    const response = await api.get('/tags');
    return response.data.models;
  },

  // Get specific model details
  getModel: async (modelId: string): Promise<Model> => {
    const response = await api.post('/show', {
      model: modelId
    });
    return response.data;
  },

  // Send a query to the model
  query: async (
    prompt: string,
    modelId: string,
    parameters?: ModelParameters,
    previousMessages: Message[] = []
  ) => {
    const messages = [
      ...previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await api.post('/chat', {
      model: modelId,
      messages,
      stream: false,
      options: parameters
    });
    return {
      response: response.data.message.content
    };
  },

  // Send a streaming query to the model
  queryStream: async (
    prompt: string,
    model: string,
    onChunk: (chunk: string) => void,
    parameters: ModelParameters,
    context: Message[],
    systemPrompt: string,
    signal?: AbortSignal
  ) => {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...context.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: prompt
      }
    ];

    // Log the complete conversation being sent to the model
    console.log('Sending to model:', {
      model,
      systemPrompt,
      messages,
      parameters
    });

    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages,
        stream: true,
        options: parameters
      }),
      signal: signal
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to create stream reader');
    }

    let fullResponse = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(Boolean);
      
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            onChunk(parsed.message.content);
            fullResponse += parsed.message.content;
          }
        } catch (e) {
          console.error('Failed to parse chunk:', e);
        }
      }
    }

    return {
      response: fullResponse
    };
  },
}; 