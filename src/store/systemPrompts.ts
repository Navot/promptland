import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SystemPrompt {
  id: string
  name: string
  content: string
  createdAt: number
}

interface SystemPromptsState {
  prompts: SystemPrompt[]
  addPrompt: (name: string, content: string) => void
  deletePrompt: (id: string) => void
}

export const useSystemPromptsStore = create<SystemPromptsState>()(
  persist(
    (set) => ({
      prompts: [],
      addPrompt: (name, content) => set((state) => ({
        prompts: [...state.prompts, {
          id: crypto.randomUUID(),
          name,
          content,
          createdAt: Date.now()
        }]
      })),
      deletePrompt: (id) => set((state) => ({
        prompts: state.prompts.filter(prompt => prompt.id !== id)
      }))
    }),
    {
      name: 'system-prompts'
    }
  )
) 