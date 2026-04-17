import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Fires a lightweight page view hit on every route change.
 * No cookies, no PII — just path + day counter on the server.
 */
export function usePageTracking() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Don't track admin routes
    if (pathname.startsWith('/admin')) return

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      // keepalive ensures the request completes even if the page unloads
      keepalive: true,
    }).catch(() => {
      // Silently ignore — analytics should never affect UX
    })
  }, [pathname])
}
