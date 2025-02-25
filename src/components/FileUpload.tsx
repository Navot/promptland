import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Button } from '@mui/material';
import { TrashIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
  projectId: string;
}

interface FileStatus {
  id: string;
  filename: string;
  status: 'processing' | 'completed' | 'error';
  currentChunk?: number;
  totalChunks?: number;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ projectId }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedModel = useSelector((state: RootState) => state.settings.selectedModel);
  const [renderCount, setRenderCount] = useState(0);
  const [processingFiles, setProcessingFiles] = useState<Record<string, boolean>>({});
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});

  // Use this for debugging only, remove in production
  useEffect(() => {
    // Limit logging to prevent console spam
    if (renderCount < 5) {
      console.log(`FileUpload component rendering, projectId: ${projectId}`);
      setRenderCount(prev => prev + 1);
    }
  }, [projectId]);

  // Fetch files only once when component mounts or projectId changes
  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files`);
        if (!response.ok) throw new Error('Failed to fetch files');
        const data = await response.json();
        setFiles(data);
        
        // Check for any processing files
        const processing = data.reduce((acc: Record<string, boolean>, file: FileStatus) => {
          if (file.status === 'processing') {
            acc[file.id] = true;
          }
          return acc;
        }, {});
        
        setProcessingFiles(processing);
      } catch (error) {
        console.error('Error fetching files:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch files');
      }
    };

    if (projectId) {
      fetchFiles();
    }
  }, [projectId]);

  // Poll for status updates on processing files
  useEffect(() => {
    const processingFileIds = Object.keys(processingFiles);
    if (processingFileIds.length === 0) return;
    
    const pollInterval = setInterval(async () => {
      for (const fileId of processingFileIds) {
        try {
          const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files/${fileId}/status`);
          if (!response.ok) continue;
          
          const status = await response.json();
          console.log(`File ${fileId} status:`, status); // Add debugging
          
          // Only update if the status has meaningful progress information
          if (status.totalChunks > 0) {
            // Update file status in the files array
            setFiles(prevFiles => 
              prevFiles.map(file => 
                file.id === fileId 
                  ? { 
                      ...file, 
                      status: status.status,
                      currentChunk: status.currentChunk,
                      totalChunks: status.totalChunks,
                      error: status.error
                    } 
                  : file
              )
            );
          }
          
          // Remove from processing if complete or error
          if (status.status !== 'processing') {
            setProcessingFiles(prev => {
              const updated = { ...prev };
              delete updated[fileId];
              return updated;
            });
          }
        } catch (error) {
          console.error(`Error polling status for file ${fileId}:`, error);
        }
      }
    }, 1000);
    
    return () => clearInterval(pollInterval);
  }, [processingFiles, projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsUploading(true);
    setError(null);
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', selectedModel || 'llama2');

    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }
      
      const newFile = await response.json();
      setFiles(prev => [newFile, ...prev]);
      
      // Add to processing files
      if (newFile.status === 'processing') {
        setProcessingFiles(prev => ({
          ...prev,
          [newFile.id]: true
        }));
      }
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    setIsDeleting(prev => ({ ...prev, [fileId]: true }));
    
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      // Remove file from list
      setFiles(prev => prev.filter(file => file.id !== fileId));
      
      // Remove from processing if it was processing
      setProcessingFiles(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete file');
    } finally {
      setIsDeleting(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    }
  };

  // Add cancel processing function
  const handleCancelProcessing = async (fileId: string) => {
    if (!confirm('Are you sure you want to cancel processing this file?')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:3002/api/projects/${projectId}/files/${fileId}/cancel`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cancel processing');
      }
      
      // Update file status locally
      setFiles(prevFiles => 
        prevFiles.map(file => 
          file.id === fileId 
            ? { 
                ...file, 
                status: 'error',
                error: 'Processing cancelled by user'
              } 
            : file
        )
      );
      
      // Remove from processing files
      setProcessingFiles(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        return updated;
      });
    } catch (error) {
      console.error('Error cancelling processing:', error);
      setError(error instanceof Error ? error.message : 'Failed to cancel processing');
    }
  };

  return (
    <div className="mb-4">
      <h2 className="text-lg font-medium mb-2">Upload Documents</h2>
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 p-3 mb-3 rounded text-red-800 dark:text-red-200">
          <strong>Error:</strong> {error}
          <button 
            className="float-right text-red-800 dark:text-red-200 hover:text-red-600"
            onClick={() => setError(null)}
          >
            ×
          </button>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <input
          type="file"
          accept=".pdf,.txt,.md,.doc,.docx"
          onChange={handleFileUpload}
          disabled={isUploading}
          ref={fileInputRef}
          className="hidden"
          id="file-upload"
        />
        <label 
          htmlFor="file-upload"
          className={`btn ${isUploading ? 'btn-disabled' : 'btn-primary'} cursor-pointer`}
        >
          {isUploading ? 'Uploading...' : 'Upload File'}
        </label>
        <span className="text-sm text-gray-500">
          Supported formats: PDF, TXT, MD, DOC, DOCX
        </span>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4">
          <h3 className="text-md font-medium mb-2">Uploaded Files</h3>
          <div className="space-y-4">
            {files.map(file => (
              <div 
                key={file.id} 
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{file.filename}</span>
                  <div className="flex items-center space-x-3">
                    <span className={`text-sm ${
                      file.status === 'completed' ? 'text-green-500' : 
                      file.status === 'error' ? 'text-red-500' : 'text-yellow-500'
                    }`}>
                      {file.status === 'processing' ? 'Processing...' : 
                       file.status === 'completed' ? 'Completed' : 'Error'}
                    </span>
                    
                    {file.status === 'processing' && (
                      <button
                        onClick={() => handleCancelProcessing(file.id)}
                        className="text-yellow-500 hover:text-yellow-700"
                        title="Cancel processing"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={isDeleting[file.id] || file.status === 'processing'}
                      className={`text-red-500 hover:text-red-700 ${
                        isDeleting[file.id] || file.status === 'processing' ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title="Delete file"
                    >
                      {isDeleting[file.id] ? (
                        <span className="text-sm">Deleting...</span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                
                {file.status === 'processing' && (
                  <>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      {file.currentChunk !== undefined && file.totalChunks !== undefined && file.totalChunks > 0 ? (
                        `Processing chunk ${file.currentChunk} of ${file.totalChunks}`
                      ) : (
                        'Preparing file for processing...'
                      )}
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                        style={{ 
                          width: file.currentChunk !== undefined && file.totalChunks !== undefined && file.totalChunks > 0 
                            ? `${Math.min((file.currentChunk / Math.max(file.totalChunks, 1)) * 100, 100)}%`
                            : '5%' // Show a small progress indicator when we don't have chunk info yet
                        }}
                      />
                    </div>
                  </>
                )}
                
                {file.status === 'error' && file.error && (
                  <div className="text-sm text-red-500 mt-1">
                    {file.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 