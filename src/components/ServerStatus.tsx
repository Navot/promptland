import React from 'react';

interface ServerStatusProps {
  isRunning: boolean;
}

export const ServerStatus: React.FC<ServerStatusProps> = ({ isRunning }) => {
  if (isRunning) return null;

  return (
    <div className="bg-yellow-100 dark:bg-yellow-900 p-4 mb-4 rounded-md">
      <h2 className="text-lg font-medium text-yellow-800 dark:text-yellow-200">
        RAG Server Not Running
      </h2>
      <p className="text-yellow-700 dark:text-yellow-300">
        Please start the RAG server with: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-1 rounded">npm run rag-server</code>
      </p>
    </div>
  );
}; 