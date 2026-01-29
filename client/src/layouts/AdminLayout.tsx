import { Fragment, useState } from 'react'
import { NavLink, Outlet, Navigate } from 'react-router-dom'
import { Dialog, DialogPanel } from '@headlessui/react'
import {
  Bars3Icon,
  XMarkIcon,
  HomeIcon,
  DocumentTextIcon,
  RssIcon,
  TagIcon,
  EnvelopeIcon,
  MicrophoneIcon,
  ClockIcon,
  UsersIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../lib/auth'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ToastProvider } from '../components/ui/Toast'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon, end: true },
  { name: 'Stories', href: '/admin/stories', icon: DocumentTextIcon },
  { name: 'Feeds', href: '/admin/feeds', icon: RssIcon },
  { name: 'Issues', href: '/admin/issues', icon: TagIcon },
  { name: 'Newsletters', href: '/admin/newsletters', icon: EnvelopeIcon },
  { name: 'Podcasts', href: '/admin/podcasts', icon: MicrophoneIcon },
  { name: 'Jobs', href: '/admin/jobs', icon: ClockIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
]

function NavItems({ onClick }: { onClick?: () => void }) {
  return (
    <>
      {navigation.map(item => (
        <NavLink
          key={item.name}
          to={item.href}
          end={item.end}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
            ${isActive
              ? 'bg-brand-50 text-brand-700'
              : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
            }`
          }
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {item.name}
        </NavLink>
      ))}
    </>
  )
}

function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5 border-b border-neutral-200">
        <span className="text-lg font-bold text-neutral-900">Admin</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin navigation">
        <NavItems />
      </nav>
      <div className="border-t border-neutral-200 px-3 py-3">
        {user && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-neutral-900 truncate">{user.name}</p>
            <p className="text-xs text-neutral-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { isAuthenticated, isLoading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-neutral-50">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-neutral-200 lg:bg-white">
          <Sidebar />
        </aside>

        {/* Mobile sidebar */}
        <Dialog as={Fragment} open={mobileOpen} onClose={setMobileOpen}>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" aria-hidden="true" />
          <DialogPanel className="fixed inset-y-0 left-0 z-50 w-60 bg-white shadow-xl lg:hidden">
            <div className="absolute right-2 top-2">
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-md p-2 text-neutral-500 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label="Close menu"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <Sidebar />
          </DialogPanel>
        </Dialog>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Mobile top bar */}
          <div className="flex items-center border-b border-neutral-200 bg-white px-4 py-3 lg:hidden">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-neutral-500 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <span className="ml-3 text-lg font-bold text-neutral-900">Admin</span>
          </div>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
      </ToastProvider>
  )
}
