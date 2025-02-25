import React from 'react';

interface RagErrorProps {
  message: string;
  onDismiss?: () => void;
}

export const RagError: React.FC<RagErrorProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-100 dark:bg-red-900 p-4 mb-4 rounded-md">
      <div className="flex justify-between">
        <h2 className="text-lg font-medium text-red-800 dark:text-red-200">Error</h2>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-red-700 dark:text-red-300"
          >
            ✕
          </button>
        )}
      </div>
      <p className="text-red-700 dark:text-red-300">{message}</p>
    </div>
  );
}; 