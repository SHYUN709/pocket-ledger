import { useState } from 'react'
import TabBar, { type Tab } from './components/TabBar'
import History from './screens/History'
import QuickEntry from './screens/QuickEntry'
import Settings from './screens/Settings'

export default function App() {
  const [tab, setTab] = useState<Tab>('entry')

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col pt-[env(safe-area-inset-top)]">
      <main className="flex min-h-0 flex-1 flex-col">
        {tab === 'entry' && <QuickEntry />}
        {tab === 'history' && <History />}
        {tab === 'settings' && <Settings />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </div>
  )
}

