import { Routes, Route } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout'
import AdminLayout from './layouts/AdminLayout'
import HomePage from './pages/HomePage'
import StoryPage from './pages/StoryPage'
import IssuePage from './pages/IssuePage'
import IssuesIndexPage from './pages/IssuesPage'
import MethodologyPage from './pages/MethodologyPage'
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import NotFoundPage from './pages/NotFoundPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import StoriesPage from './pages/admin/StoriesPage'
import StoryDetailPage from './pages/admin/StoryDetailPage'
import FeedsPage from './pages/admin/FeedsPage'
import IssuesPage from './pages/admin/IssuesPage'
import IssueEditPage from './pages/admin/IssueEditPage'
import NewslettersPage from './pages/admin/NewslettersPage'
import NewsletterDetailPage from './pages/admin/NewsletterDetailPage'
import PodcastsPage from './pages/admin/PodcastsPage'
import PodcastDetailPage from './pages/admin/PodcastDetailPage'
import JobsPage from './pages/admin/JobsPage'
import UsersPage from './pages/admin/UsersPage'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/stories/:id" element={<StoryPage />} />
        <Route path="/issues" element={<IssuesIndexPage />} />
        <Route path="/issues/:slug" element={<IssuePage />} />
        <Route path="/methodology" element={<MethodologyPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<AdminLayout />}>
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
