import { useEffect, useRef } from 'react'

/**
 * Renders a postal address that is assembled client-side to deter naive bots.
 * Pre-hydration HTML shows a generic placeholder; after hydration the real
 * address is inserted via DOM manipulation so it never appears in static HTML.
 */
export default function ObfuscatedAddress({ className }: { className?: string }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const n = ['\u004F\u0064\u0069\u006E', '\u004D\u00FC\u0068\u006C\u0065\u006E\u0062\u0065\u0069\u006E']
    const s = ['\u0053\u006F\u006E\u006E\u0065\u006E\u0061\u006C\u006C\u0065\u0065', '50']
    const c = ['12045', '\u0042\u0065\u0072\u006C\u0069\u006E']
    ref.current.innerHTML = ''
    ref.current.append(
      `${n[0]} ${n[1]}`,
      document.createElement('br'),
      `${s[0]} ${s[1]}`,
      document.createElement('br'),
      `${c[0]} ${c[1]}`,
    )
  }, [])

  return (
    <address ref={ref} className={className}>
      [address available with JavaScript enabled]
    </address>
  )
}
