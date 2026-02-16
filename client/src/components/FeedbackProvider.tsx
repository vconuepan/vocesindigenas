import { createContext, useContext, useState } from 'react'
import FeedbackModal from './FeedbackModal'

const FeedbackContext = createContext<{ openFeedback: () => void }>({
  openFeedback: () => {},
})

export const useFeedback = () => useContext(FeedbackContext)

export default function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <FeedbackContext.Provider value={{ openFeedback: () => setOpen(true) }}>
      {children}
      <FeedbackModal open={open} onClose={() => setOpen(false)} />
    </FeedbackContext.Provider>
  )
}
