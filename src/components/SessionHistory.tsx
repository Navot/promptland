import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setCurrentSession, createSession, deleteSession } from '../store/chatSlice';
import { RootState } from '../store';
import { format } from 'date-fns';
import { ImportSession } from './ImportSession';
import { v4 as uuidv4 } from 'uuid';
import { TrashIcon } from '@heroicons/react/24/outline';

interface SessionHistoryProps {
  onNewSession: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ onNewSession }) => {
  const dispatch = useDispatch();
  const sessions = useSelector((state: RootState) => state.chat.sessions);
  const currentSessionId = useSelector((state: RootState) => state.chat.currentSessionId);
  const selectedModel = useSelector((state: RootState) => 
    state.chat.sessions.find(s => s.id === currentSessionId)?.modelId
  );
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

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

  const handleSessionClick = (sessionId: string) => {
    dispatch(setCurrentSession(sessionId));
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation(); // Prevent session selection when clicking delete
    setSessionToDelete(sessionId);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      dispatch(deleteSession(sessionToDelete));
      setSessionToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <button
          onClick={onNewSession}
          className="w-full btn btn-primary"
        >
          New Conversation
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {sessions.slice().reverse().map((session) => (
          <div
            key={session.id}
            className={`group flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
              session.id === currentSessionId ? 'bg-gray-100 dark:bg-gray-800' : ''
            }`}
            onClick={() => handleSessionClick(session.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="sidebar-conversation p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer text-left">
                <div className="font-medium truncate">{session.title || session.messages[0]?.content.slice(0, 30) || 'New Conversation'}</div>
                <div className="text-xs text-gray-500 truncate">
                  {session.messages.length > 0 
                    ? session.messages[session.messages.length - 1].content.substring(0, 50) + '...'
                    : 'No messages'}
                </div>
              </div>
            </div>
            <button
              onClick={(e) => handleDeleteClick(e, session.id)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-500" />
            </button>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Conversation?</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete this conversation? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSessionToDelete(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn btn-primary bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ImportSession />
    </div>
  );
}; 