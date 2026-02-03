import { createContext, useContext, useState } from 'react'
import SubscribeModal from './SubscribeModal'

const SubscribeContext = createContext<{ openSubscribe: () => void }>({
  openSubscribe: () => {},
})

export const useSubscribe = () => useContext(SubscribeContext)

export default function SubscribeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <SubscribeContext.Provider value={{ openSubscribe: () => setOpen(true) }}>
      {children}
      <SubscribeModal open={open} onClose={() => setOpen(false)} />
    </SubscribeContext.Provider>
  )
}
