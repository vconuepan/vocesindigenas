import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ChunkErrorBoundary } from './components/ui/ChunkErrorBoundary'

// Public pages — lazy-loaded to reduce homepage bundle size
// Puppeteer prerenderer waits for chunks to load, so prerendering still works
const StoryPage = lazy(() => import('./pages/StoryPage'))
const IssuePage = lazy(() => import('./pages/IssuePage'))
const IssuesIndexPage = lazy(() => import('./pages/IssuesPage'))
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'))
const AboutPage = lazy(() => import('./pages/AboutPage'))
const ImprintPage = lazy(() => import('./pages/ImprintPage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const SubscribedPage = lazy(() => import('./pages/SubscribedPage'))
const DevelopersPage = lazy(() => import('./pages/DevelopersPage'))
const EmbedPage = lazy(() => import('./pages/EmbedPage'))
const WidgetGeneratorPage = lazy(() => import('./pages/WidgetGeneratorPage'))
const SavedPage = lazy(() => import('./pages/SavedPage'))

// Admin pages — lazy-loaded so public visitors never download admin code
const AdminLayout = lazy(() => import('./layouts/AdminLayout'))
const LoginPage = lazy(() => import('./pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const StoriesPage = lazy(() => import('./pages/admin/StoriesPage'))
const StoryDetailPage = lazy(() => import('./pages/admin/StoryDetailPage'))
const FeedsPage = lazy(() => import('./pages/admin/FeedsPage'))
const IssuesPage = lazy(() => import('./pages/admin/IssuesPage'))
const IssueEditPage = lazy(() => import('./pages/admin/IssueEditPage'))
const NewslettersPage = lazy(() => import('./pages/admin/NewslettersPage'))
const NewsletterDetailPage = lazy(() => import('./pages/admin/NewsletterDetailPage'))
const PodcastsPage = lazy(() => import('./pages/admin/PodcastsPage'))
const PodcastDetailPage = lazy(() => import('./pages/admin/PodcastDetailPage'))
const JobsPage = lazy(() => import('./pages/admin/JobsPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const ClustersPage = lazy(() => import('./pages/admin/ClustersPage'))

/** Preload the admin layout and dashboard chunks (call from LoginPage). */
export function preloadAdminChunks() {
  import('./layouts/AdminLayout')
  import('./pages/admin/DashboardPage')
}

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}

/** Wrap lazy-loaded page in Suspense with error boundary */
function LazyPage({ children }: { children: React.ReactNode }) {
  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </ChunkErrorBoundary>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes — homepage static, others lazy-loaded */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/stories/:slug" element={<LazyPage><StoryPage /></LazyPage>} />
        <Route path="/issues" element={<LazyPage><IssuesIndexPage /></LazyPage>} />
        <Route path="/issues/:slug" element={<LazyPage><IssuePage /></LazyPage>} />
        <Route path="/methodology" element={<LazyPage><MethodologyPage /></LazyPage>} />
        <Route path="/about" element={<LazyPage><AboutPage /></LazyPage>} />
        <Route path="/imprint" element={<LazyPage><ImprintPage /></LazyPage>} />
        <Route path="/privacy" element={<LazyPage><PrivacyPage /></LazyPage>} />
        <Route path="/search" element={<LazyPage><SearchPage /></LazyPage>} />
        <Route path="/subscribed" element={<LazyPage><SubscribedPage /></LazyPage>} />
        {/* DevelopersPage moved outside PublicLayout — Scalar styles clash with site theme */}
        <Route path="/widgets" element={<LazyPage><WidgetGeneratorPage /></LazyPage>} />
        <Route path="/embed-widget" element={<LazyPage><WidgetGeneratorPage /></LazyPage>} />
        <Route path="/saved" element={<LazyPage><SavedPage /></LazyPage>} />
      </Route>

      {/* Embed page — no layout wrapper */}
      <Route
        path="/embed"
        element={<LazyPage><EmbedPage /></LazyPage>}
      />

      {/* Developers page — standalone to avoid site theme clashing with Scalar styles */}
      <Route
        path="/developers"
        element={<LazyPage><DevelopersPage /></LazyPage>}
      />

      {/* Admin routes — lazy-loaded with error boundary for chunk failures */}
      <Route
        path="/admin/login"
        element={
          <ChunkErrorBoundary>
            <Suspense fallback={<PageFallback />}><LoginPage /></Suspense>
          </ChunkErrorBoundary>
        }
      />
      <Route
        path="/admin"
        element={
          <ChunkErrorBoundary>
            <Suspense fallback={<PageFallback />}><AdminLayout /></Suspense>
          </ChunkErrorBoundary>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="stories" element={<StoriesPage />} />
        <Route path="stories/:id" element={<StoryDetailPage />} />
        <Route path="feeds" element={<FeedsPage />} />
        <Route path="issues" element={<IssuesPage />} />
        <Route path="issues/new" element={<IssueEditPage />} />
        <Route path="issues/:id/edit" element={<IssueEditPage />} />
        <Route path="newsletters" element={<NewslettersPage />} />
        <Route path="newsletters/:id" element={<NewsletterDetailPage />} />
        <Route path="podcasts" element={<PodcastsPage />} />
        <Route path="podcasts/:id" element={<PodcastDetailPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="clusters" element={<ClustersPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Catch-all */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
