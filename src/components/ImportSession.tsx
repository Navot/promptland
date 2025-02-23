import React, { useRef } from 'react';
import { useDispatch } from 'react-redux';
import { createSession } from '../store/chatSlice';
import { ChatSession } from '../types';

export const ImportSession: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch();

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const session: ChatSession = JSON.parse(text);
      
      // Validate the imported session
      if (!session.id || !Array.isArray(session.messages)) {
        throw new Error('Invalid session format');
      }

      dispatch(createSession(session));
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to import session:', error);
      alert('Failed to import session. Please check the file format.');
    }
  };

  return (
    <div className="p-4 border-t">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
      >
        Import Session
      </button>
    </div>
  );
}; 