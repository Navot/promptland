import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { updateParameters, setSystemPrompt } from '../store/settingsSlice';
import { RootState } from '../store';

export const SettingsPanel: React.FC = () => {
  const dispatch = useDispatch();
  const parameters = useSelector((state: RootState) => state.settings.modelParameters);
  const systemPrompt = useSelector((state: RootState) => state.settings.systemPrompt);

  const handleParameterChange = (
    parameter: string,
    value: number
  ) => {
    dispatch(updateParameters({ [parameter]: value }));
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold mb-4">Settings</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          System Prompt
        </label>
        <textarea
          value={systemPrompt}
          onChange={(e) => dispatch(setSystemPrompt(e.target.value))}
          className="input min-h-[100px]"
          placeholder="Enter system instructions..."
        />
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium">
            Temperature: {parameters.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={parameters.temperature}
            onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Max Tokens: {parameters.maxTokens}
          </label>
          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={parameters.maxTokens}
            onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Top P: {parameters.topP}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={parameters.topP}
            onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">
            Frequency Penalty: {parameters.frequencyPenalty}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={parameters.frequencyPenalty}
            onChange={(e) => handleParameterChange('frequencyPenalty', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}; 