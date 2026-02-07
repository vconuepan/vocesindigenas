import { Helmet } from 'react-helmet-async'
import { ApiReferenceReact } from '@scalar/api-reference-react'
import type { AnyApiReferenceConfiguration } from '@scalar/api-reference-react'
import { API_BASE } from '../lib/api'

const scalarConfig: AnyApiReferenceConfiguration = {
  url: `${API_BASE}/docs/openapi.json`,
  hideDownloadButton: false,
  hideModels: false,
  defaultHttpClient: { targetKey: 'js', clientKey: 'fetch' },
}

export default function DevelopersPage() {
  return (
    <>
      <Helmet>
        <title>API Documentation - Actually Relevant</title>
        <meta
          name="description"
          content="Public API documentation for Actually Relevant. Access published stories, issues, and RSS feeds programmatically."
        />
      </Helmet>
      <div className="min-h-[80vh]">
        <ApiReferenceReact configuration={scalarConfig} />
      </div>
    </>
  )
}
