import { useState } from 'react'
import { Helmet } from 'react-helmet-async'

const ISSUES = [
  { label: 'All issues', value: '' },
  { label: 'Human Development', value: 'human-development' },
  { label: 'Planet & Climate', value: 'planet-climate' },
  { label: 'Existential Threats', value: 'existential-threats' },
  { label: 'Science & Technology', value: 'science-technology' },
]

const WIDGET_URL = 'https://actuallyrelevant.news/widget.js'
const EMBED_URL = 'https://actuallyrelevant.news/embed'

export default function WidgetGeneratorPage() {
  const [issue, setIssue] = useState('')
  const [count, setCount] = useState(3)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [copied, setCopied] = useState<'script' | 'iframe' | null>(null)

  const scriptAttrs = [
    `src="${WIDGET_URL}"`,
    issue && `data-issue="${issue}"`,
    count !== 3 && `data-count="${count}"`,
    theme !== 'light' && `data-theme="${theme}"`,
  ].filter(Boolean).join(' ')

  const scriptCode = `<script ${scriptAttrs}></script>`

  const iframeParams = new URLSearchParams()
  if (issue) iframeParams.set('issue', issue)
  if (count !== 3) iframeParams.set('count', String(count))
  if (theme !== 'light') iframeParams.set('theme', theme)
  const qs = iframeParams.toString()
  const iframeCode = `<iframe src="${EMBED_URL}${qs ? '?' + qs : ''}" width="100%" height="400" frameborder="0" title="Actually Relevant stories"></iframe>`

  function copyToClipboard(text: string, type: 'script' | 'iframe') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <>
      <Helmet>
        <title>Embed Widget - Actually Relevant</title>
        <meta
          name="description"
          content="Add an Actually Relevant news widget to your website. Shows AI-curated stories relevant to humanity."
        />
      </Helmet>

      <div className="page-section py-12">
        <h1 className="page-title mb-2">Embed Widget</h1>
        <p className="page-intro mb-10">
          Add a curated news widget to your website.
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Configuration */}
          <div className="space-y-6">
            <h2 className="section-heading">Configure</h2>

            <div>
              <label htmlFor="widget-issue" className="block text-sm font-medium text-neutral-700 mb-1">
                Issue
              </label>
              <select
                id="widget-issue"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-brand-200 focus:border-brand-400 outline-none"
              >
                {ISSUES.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="widget-count" className="block text-sm font-medium text-neutral-700 mb-1">
                Number of stories
              </label>
              <input
                id="widget-count"
                type="range"
                min={1}
                max={5}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600"
                aria-valuemin={1}
                aria-valuemax={5}
                aria-valuenow={count}
              />
              <div className="flex justify-between text-xs text-neutral-500 mt-1">
                <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-neutral-700 mb-2">Theme</span>
              <div className="flex gap-3">
                {(['light', 'dark'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-4 py-2 text-sm rounded-lg border transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 ${
                      theme === t
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview */}
          <div>
            <h2 className="section-heading mb-4">Preview</h2>
            <div className={`rounded-lg border p-4 ${theme === 'dark' ? 'bg-neutral-800 border-neutral-700' : 'bg-neutral-50 border-neutral-200'}`}>
              <iframe
                src={`/embed${qs ? '?' + qs : ''}`}
                width="100%"
                height="350"
                className="rounded border-0"
                title="Widget preview"
              />
            </div>
          </div>
        </div>

        {/* Embed codes */}
        <div className="mt-10 space-y-6">
          <h2 className="section-heading">Embed Code</h2>

          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-2">Script embed (recommended)</h3>
            <div className="relative">
              <pre className="bg-neutral-900 text-green-400 text-sm p-4 rounded-lg overflow-x-auto">
                <code>{scriptCode}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(scriptCode, 'script')}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-neutral-700 text-neutral-200 rounded hover:bg-neutral-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {copied === 'script' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-neutral-700 mb-2">iframe embed (fallback)</h3>
            <div className="relative">
              <pre className="bg-neutral-900 text-green-400 text-sm p-4 rounded-lg overflow-x-auto">
                <code>{iframeCode}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(iframeCode, 'iframe')}
                className="absolute top-2 right-2 px-3 py-1 text-xs bg-neutral-700 text-neutral-200 rounded hover:bg-neutral-600 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                {copied === 'iframe' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
