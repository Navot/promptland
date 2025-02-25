import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project } from '../types';
import { ProjectCreationDialog } from './ProjectCreationDialog';
import { ServerStatus } from './ServerStatus';
import { useDispatch } from 'react-redux';
import { addProject, setSelectedProject } from '../store/ragSlice';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId?: string;
  onProjectSelect: (project: Project) => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  selectedProjectId,
  onProjectSelect
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [serverRunning, setServerRunning] = useState(false);
  const dispatch = useDispatch();

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/tags');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        const modelNames = data.models?.map((m: any) => m.name) || [];
        setAvailableModels(modelNames);
      } catch (error) {
        console.error('Failed to fetch models:', error);
        // You might want to show this error to the user
        setAvailableModels([]); // Set empty array on error
      }
    };
    fetchModels();
  }, []);

  // Add server check
  useEffect(() => {
    const checkServer = async () => {
      try {
        // Change to ping the root endpoint instead of /health
        const response = await fetch('http://localhost:3002/api/projects');
        setServerRunning(response.ok);
      } catch {
        setServerRunning(false);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateProject = async (settings: {
    name: string;
    embeddingModel: string;
    chunkSize: number;
    embeddingType: 'summary' | 'direct';
  }) => {
    try {
      // Convert camelCase to snake_case for server
      const serverSettings = {
        name: settings.name,
        embedding_model: settings.embeddingModel,
        chunk_size: settings.chunkSize,
        embedding_type: settings.embeddingType
      };

      console.log('Creating project with settings:', serverSettings);

      const response = await fetch('http://localhost:3002/api/projects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(serverSettings)
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project');
      }

      // Dispatch the new project to Redux store
      dispatch(addProject(data));
      dispatch(setSelectedProject(data.id));
      setDialogOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert(error instanceof Error ? error.message : 'Failed to create project');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ServerStatus isRunning={serverRunning} />
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-medium">Projects</h2>
        <button
          onClick={() => setDialogOpen(true)}
          className="btn btn-primary btn-sm"
        >
          New Project
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projects.map(project => (
          <div
            key={project.id}
            className={`p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
              project.id === selectedProjectId ? 'bg-gray-100 dark:bg-gray-800' : ''
            }`}
            onClick={() => onProjectSelect(project)}
          >
            <div className="font-medium">{project.name}</div>
            <div className="text-sm text-gray-500">
              {new Date(project.created).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <ProjectCreationDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleCreateProject}
        availableModels={availableModels}
      />
    </div>
  );
}; 