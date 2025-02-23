import React from 'react';

interface ErrorDisplayProps {
  message: string;
  onDismiss?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onDismiss }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-4 rounded-lg shadow-lg">
      <div className="flex items-center space-x-3">
        <span>{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="hover:bg-red-600 rounded-full p-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}; 