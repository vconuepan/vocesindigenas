import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import HomePage from './pages/HomePage'
import StoryPage from './pages/StoryPage'
import IssuePage from './pages/IssuePage'
import IssuesIndexPage from './pages/IssuesPage'
import MethodologyPage from './pages/MethodologyPage'
import AboutPage from './pages/AboutPage'
import ImprintPage from './pages/ImprintPage'
import PrivacyPage from './pages/PrivacyPage'
import NotFoundPage from './pages/NotFoundPage'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ChunkErrorBoundary } from './components/ui/ChunkErrorBoundary'

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

/** Preload the admin layout and dashboard chunks (call from LoginPage). */
export function preloadAdminChunks() {
  import('./layouts/AdminLayout')
  import('./pages/admin/DashboardPage')
}

function AdminFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public routes — static imports for prerendering */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/stories/:slug" element={<StoryPage />} />
        <Route path="/issues" element={<IssuesIndexPage />} />
        <Route path="/issues/:slug" element={<IssuePage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/imprint" element={<ImprintPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
      </Route>

      {/* Admin routes — lazy-loaded with error boundary for chunk failures */}
      <Route
        path="/admin/login"
        element={
          <ChunkErrorBoundary>
            <Suspense fallback={<AdminFallback />}><LoginPage /></Suspense>
          </ChunkErrorBoundary>
        }
      />
      <Route
        path="/admin"
        element={
          <ChunkErrorBoundary>
            <Suspense fallback={<AdminFallback />}><AdminLayout /></Suspense>
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
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Catch-all */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
