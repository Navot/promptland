import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  isOpen: boolean
  systemPrompt: string
  setIsOpen: (isOpen: boolean) => void
  setSystemPrompt: (prompt: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isOpen: false,
      systemPrompt: '',
      setIsOpen: (isOpen) => set({ isOpen }),
      setSystemPrompt: (systemPrompt) => set({ systemPrompt })
    }),
    {
      name: 'settings'
    }
  )
) 