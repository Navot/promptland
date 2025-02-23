import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentSession, createSession } from '../store/chatSlice';
import { RootState } from '../store';
import { format } from 'date-fns';
import { ImportSession } from './ImportSession';
import { v4 as uuidv4 } from 'uuid';

export const SessionHistory: React.FC = () => {
  const dispatch = useDispatch();
  const sessions = useSelector((state: RootState) => state.chat.sessions);
  const currentSessionId = useSelector((state: RootState) => state.chat.currentSessionId);
  const selectedModel = useSelector((state: RootState) => 
    state.chat.sessions.find(s => s.id === currentSessionId)?.modelId
  );

  const handleExport = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const data = JSON.stringify(session, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-session-${format(session.created, 'yyyy-MM-dd-HH-mm')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };

  const handleNewChat = () => {
    const newSession = {
      id: uuidv4(),
      messages: [],
      modelId: selectedModel || '',
      created: Date.now(),
    };
    dispatch(createSession(newSession));
  };

  return (
    <div className="flex flex-col h-full">
      <button
        onClick={handleNewChat}
        className="mx-2 mt-2 mb-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
      >
        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        New Chat
      </button>
      <div className="flex-1 overflow-y-auto px-1">
        {sessions.slice().reverse().map((session) => (
          <button
            key={session.id}
            onClick={() => dispatch(setCurrentSession(session.id))}
            className={`w-full text-left py-1 px-2 mb-0.5 text-xs rounded transition-colors ${
              session.id === currentSessionId
                ? 'bg-blue-500 text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="truncate font-medium">
              {session.messages[0]?.content.slice(0, 30) || 'New Conversation'}
            </div>
            <div className="text-[10px] opacity-70">
              {format(session.created, 'MMM d, h:mm a')}
            </div>
          </button>
        ))}
      </div>
      <ImportSession />
    </div>
  );
}; 