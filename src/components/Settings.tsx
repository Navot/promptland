import { useState } from 'react'
import { useSystemPromptsStore } from '../store/systemPrompts'
import { useSettingsStore } from '../store/settings'

function Settings() {
  const { prompts, addPrompt } = useSystemPromptsStore()
  const [promptName, setPromptName] = useState('')
  const systemPrompt = useSettingsStore(state => state.systemPrompt)
  const setSystemPrompt = useSettingsStore(state => state.setSystemPrompt)

  const handleSavePrompt = () => {
    if (!promptName || !systemPrompt) return
    addPrompt(promptName, systemPrompt)
    setPromptName('')
  }

  return (
    <div className="h-full p-4 space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-bold">System Prompt</h2>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full h-32 p-2 border rounded"
          placeholder="Enter system prompt..."
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={promptName}
            onChange={(e) => setPromptName(e.target.value)}
            placeholder="Prompt name"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleSavePrompt}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-bold">Saved Prompts</h3>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {prompts.map(prompt => (
            <div
              key={prompt.id}
              className="p-2 border rounded cursor-pointer hover:bg-gray-100"
              onClick={() => setSystemPrompt(prompt.content)}
            >
              <div className="font-medium">{prompt.name}</div>
              <div className="text-sm text-gray-500 truncate">{prompt.content}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Settings 