import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { saveSystemPrompt, setActiveSystemPrompt, updateModelParameters } from '../store/settingsSlice';

export const SettingsPanel: React.FC = () => {
  const dispatch = useDispatch();
  const settings = useSelector((state: RootState) => state.settings);
  const [draftSystemPrompt, setDraftSystemPrompt] = useState(settings.systemPrompt || '');
  const [promptName, setPromptName] = useState('');

  const handleSaveSystemPrompt = () => {
    if (!draftSystemPrompt.trim()) {
      return; // Don't save empty prompts
    }
    
    dispatch(saveSystemPrompt({ 
      content: draftSystemPrompt,
      name: promptName || `Prompt ${(settings.systemPromptHistory || []).length + 1}`
    }));
    setPromptName('');
    // Don't clear draftSystemPrompt as it's now the active prompt
  };

  const handleSelectPrompt = (content: string) => {
    setDraftSystemPrompt(content);
    dispatch(setActiveSystemPrompt(content));
  };

  const handleParameterChange = (
    parameter: string,
    value: number
  ) => {
    dispatch(updateModelParameters({ [parameter]: value }));
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      
      {/* System Prompt Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium">System Prompt</label>
          <span className="text-xs text-gray-500">
            {settings.systemPrompt ? 'Active prompt set' : 'No active prompt'}
          </span>
        </div>
        
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            placeholder="Prompt name (optional)"
            className="input text-sm"
          />
        </div>
        
        <textarea
          value={draftSystemPrompt}
          onChange={(e) => setDraftSystemPrompt(e.target.value)}
          className="input h-32 text-sm"
          placeholder="Enter system prompt..."
        />
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {draftSystemPrompt !== settings.systemPrompt ? 
              '* Changes not saved' : ''}
          </span>
          <button
            onClick={handleSaveSystemPrompt}
            className="btn btn-primary text-sm"
            disabled={!draftSystemPrompt.trim() || draftSystemPrompt === settings.systemPrompt}
          >
            Save Prompt
          </button>
        </div>
        
        {/* System Prompt History */}
        {settings.systemPromptHistory && settings.systemPromptHistory.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Saved Prompts</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {settings.systemPromptHistory.slice().reverse().map((prompt) => (
                <div
                  key={prompt.id}
                  className={`p-2 rounded cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700
                    ${prompt.content === settings.systemPrompt ? 
                      'bg-blue-50 dark:bg-blue-900/20' : 
                      'bg-gray-100 dark:bg-gray-800'}`}
                  onClick={() => handleSelectPrompt(prompt.content)}
                >
                  <div className="font-medium text-sm">
                    {prompt.name}
                    {prompt.content === settings.systemPrompt && 
                      <span className="ml-2 text-xs text-blue-500">(Active)</span>}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {prompt.content}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(prompt.created).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Existing Model Parameters Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Model Parameters</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">
              Temperature: {settings.modelParameters.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.modelParameters.temperature}
              onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Max Tokens: {settings.modelParameters.maxTokens}
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={settings.modelParameters.maxTokens}
              onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Top P: {settings.modelParameters.topP}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.modelParameters.topP}
              onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">
              Frequency Penalty: {settings.modelParameters.frequencyPenalty}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.modelParameters.frequencyPenalty}
              onChange={(e) => handleParameterChange('frequencyPenalty', parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 