import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  TextField,
  FormHelperText
} from '@mui/material';

interface ModelSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (model: string, chunkSize: number, embeddingType: 'summary' | 'direct') => void;
  selectedFile?: File;
  availableModels?: string[];
}

export const ModelSelectionDialog: React.FC<ModelSelectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  selectedFile,
  availableModels = []
}) => {
  const [model, setModel] = React.useState('');
  const [chunkSize, setChunkSize] = React.useState(1000);
  const [embeddingType, setEmbeddingType] = React.useState<'summary' | 'direct'>('summary');

  React.useEffect(() => {
    if (availableModels.length > 0) {
      setModel(availableModels[0]);
    }
  }, [availableModels]);

  const handleConfirm = () => {
    onConfirm(model, chunkSize, embeddingType);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Process File</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Selected file: {selectedFile?.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Processing this file will take some time. The file will be split into chunks,
          and each chunk will be summarized using the selected model.
        </Typography>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Model</InputLabel>
          <Select
            value={model}
            label="Model"
            onChange={(e) => setModel(e.target.value)}
          >
            {availableModels.map(modelName => (
              <MenuItem key={modelName} value={modelName}>
                {modelName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <TextField
            label="Chunk Size"
            type="number"
            value={chunkSize}
            onChange={(e) => setChunkSize(Number(e.target.value))}
            helperText="Number of characters per chunk"
            InputProps={{
              inputProps: { min: 100, max: 5000 }
            }}
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Embedding Type</InputLabel>
          <Select
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained"
          disabled={!model}
        >
          Process File
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 