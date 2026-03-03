function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
const KOFI_URL = "https://ko-fi.com/impactoindigena";
export default function SupportBanner() {
  return (
    <div className="py-8 md:py-10 text-center max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-4 mb-5">
        <span
          className="flex-1 border-t border-neutral-200"
          aria-hidden="true"
        />
        <HeartIcon className="w-5 h-5 text-brand-300" />
        <span
          className="flex-1 border-t border-neutral-200"
          aria-hidden="true"
        />
      </div>
      <p className="text-lg text-neutral-600 leading-relaxed mb-4">
        Gratuito. Independiente. Sin publicidad.
        <br /> Ayúdanos a mantenerlo así.
      </p>
      
        href={KOFI_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-neutral-800 rounded-lg hover:bg-neutral-700 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
      >
        <HeartIcon className="w-4 h-4" />
        Apóyanos
        <span className="sr-only">(abre en nueva pestaña)</span>
      </a>
    </div>
  );
}
