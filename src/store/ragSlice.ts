import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Project } from '../types';

interface RagState {
  projects: Project[];
  selectedProjectId: string | null;
}

const initialState: RagState = {
  projects: [],
  selectedProjectId: null
};

const ragSlice = createSlice({
  name: 'rag',
  initialState,
  reducers: {
    setProjects: (state, action: PayloadAction<Project[]>) => {
      state.projects = action.payload;
    },
    addProject: (state, action: PayloadAction<Project>) => {
      state.projects = [action.payload, ...state.projects];
    },
    setSelectedProject: (state, action: PayloadAction<string>) => {
      state.selectedProjectId = action.payload;
    }
  }
});

export const { setProjects, addProject, setSelectedProject } = ragSlice.actions;
export default ragSlice.reducer; 