import React, { useEffect, useState } from 'react';
import { Model } from '../types';
import { ollamaApi } from '../api/ollama';

interface ModelSelectorProps {
  onModelSelect: (modelId: string) => void;
  selectedModelId?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelSelect,
  selectedModelId,
}) => {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const modelList = await ollamaApi.getModels();
        setModels(modelList);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load models';
        console.error('Failed to fetch models:', error);
        setError(`Error: ${errorMessage}. Please ensure Ollama is running.`);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="text-red-500 text-sm mb-2">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="btn btn-secondary text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="model-select" className="block text-sm font-medium mb-2">
        Select Model
      </label>
      <select
        id="model-select"
        value={selectedModelId || ''}
        onChange={(e) => onModelSelect(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="" disabled>Choose a model...</option>
        {models.map((model) => (
          <option key={model.name} value={model.name}>
            {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)
          </option>
        ))}
      </select>
    </div>
  );
}; 