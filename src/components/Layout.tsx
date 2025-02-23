import { useSettingsStore } from '../store/settings'
import Chat from './Chat'
import Settings from './Settings'

function Layout() {
  const isSettingsOpen = useSettingsStore(state => state.isOpen)

  return (
    <div className="flex h-screen">
      <main className={`flex-1 transition-all duration-300 ${
        isSettingsOpen ? 'mr-[300px]' : ''
      }`}>
        <Chat />
      </main>
      <div className={`fixed right-0 top-0 h-full w-[300px] bg-white border-l transform transition-transform duration-300 ${
        isSettingsOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <Settings />
      </div>
    </div>
  )
}

export default Layout 