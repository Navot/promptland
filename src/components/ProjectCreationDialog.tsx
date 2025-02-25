import React, { useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';

interface ProjectCreationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (settings: {
    name: string;
    embeddingModel: string;
    chunkSize: number;
    embeddingType: 'summary' | 'direct';
  }) => void;
  availableModels: string[];
}

export const ProjectCreationDialog: React.FC<ProjectCreationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  availableModels
}) => {
  const [name, setName] = React.useState('');
  const [embeddingModel, setEmbeddingModel] = React.useState('');
  const [chunkSize, setChunkSize] = React.useState(1000);
  const [embeddingType, setEmbeddingType] = React.useState<'summary' | 'direct'>('direct');
  const initialFocusRef = useRef<HTMLInputElement>(null);

  // Set default model when models are loaded
  useEffect(() => {
    if (availableModels.length > 0 && !embeddingModel) {
      setEmbeddingModel(availableModels[0]);
    }
  }, [availableModels, embeddingModel]);

  useEffect(() => {
    if (open && initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
  }, [open]);

  const handleConfirm = () => {
    if (!name || !embeddingModel || !chunkSize || !embeddingType) {
      alert('Please fill in all fields');
      return;
    }

    onConfirm({
      name,
      embeddingModel,
      chunkSize,
      embeddingType
    });
    setName('');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm" 
      fullWidth
      aria-labelledby="project-creation-dialog-title"
    >
      <DialogTitle id="project-creation-dialog-title">Create New Project</DialogTitle>
      <DialogContent>
        <div className="space-y-4 mt-2">
          <TextField
            fullWidth
            required
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            inputRef={initialFocusRef}
            autoFocus
          />

          <FormControl fullWidth required>
            <InputLabel id="embedding-model-label">Embedding Model</InputLabel>
            <Select
              labelId="embedding-model-label"
              value={embeddingModel}
              label="Embedding Model"
              onChange={(e) => setEmbeddingModel(e.target.value)}
            >
              {availableModels.map(model => (
                <MenuItem key={model} value={model}>{model}</MenuItem>
              ))}
            </Select>
            <FormHelperText>
              This model will be used for generating embeddings and cannot be changed later
            </FormHelperText>
          </FormControl>

          <FormControl fullWidth required>
            <TextField
              label="Chunk Size"
              type="number"
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              helperText="Number of characters per chunk (cannot be changed later)"
              InputProps={{
                inputProps: { min: 100, max: 5000 }
              }}
            />
          </FormControl>

          <FormControl fullWidth required>
            <InputLabel id="embedding-type-label">Embedding Type</InputLabel>
            <Select
              labelId="embedding-type-label"
              value={embeddingType}
              label="Embedding Type"
              onChange={(e) => setEmbeddingType(e.target.value as 'summary' | 'direct')}
            >
              <MenuItem value="summary">Summarize Chunks</MenuItem>
              <MenuItem value="direct">Direct Chunk Text</MenuItem>
            </Select>
            <FormHelperText>
              {embeddingType === 'summary' 
                ? 'Generate embeddings from chunk summaries (slower but may be more semantic)'
                : 'Generate embeddings directly from chunks (faster)'}
            </FormHelperText>
          </FormControl>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          disabled={!name || !embeddingModel || !chunkSize || !embeddingType}
        >
          Create Project
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 