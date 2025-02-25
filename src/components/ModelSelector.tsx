import React, { useEffect, useState } from 'react';

interface ModelSelectorProps {
  onModelSelect: (modelId: string) => void;
  selectedModelId: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelSelect,
  selectedModelId
}) => {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('ModelSelector render:', { selectedModelId, models }); // Debug log

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (response.ok) {
          const data = await response.json();
          const modelNames = data.models?.map((m: any) => m.name) || [];
          setModels(modelNames);
          
          // If no model is selected and we have models, select the first one
          if (!selectedModelId && modelNames.length > 0) {
            onModelSelect(modelNames[0]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch models:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [selectedModelId, onModelSelect]);

  if (loading) {
    return <div>Loading models...</div>;
  }

  return (
    <select
      value={selectedModelId}
      onChange={(e) => onModelSelect(e.target.value)}
      className="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
    >
      {models.map(model => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
}; 