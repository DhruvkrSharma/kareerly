'use client'

import {
  Search, Bell, Moon, Sun, Home, Compass, Bookmark, User,
  LogOut, Settings, Briefcase, LayoutGrid, Archive, HelpCircle,
  ChevronRight, Plus
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

export type TabId = 'home' | 'discover' | 'kanban' | 'saved' | 'profile'

/* ── Generic Modal Component ────────────────────────────────── */
function Modal({ title, isOpen, onClose, children }: { title: string, isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface w-full max-w-md rounded-3xl shadow-2xl p-6 border border-outline-variant/50"
      >
        <h2 className="text-xl font-display font-black text-on-surface mb-4">{title}</h2>
        <div className="text-on-surface-variant text-sm space-y-4">
          {children}
        </div>
        <button onClick={onClose} className="mt-6 w-full btn-primary py-2.5">Close</button>
      </motion.div>
    </div>
  )
}

interface NavProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

/* ── Dark-mode hook ─────────────────────────────────────────── */
export function useDarkMode() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('kareerly-theme')
    const dark = stored ? stored === 'dark' : true
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('kareerly-theme', next ? 'dark' : 'light')
  }

  return { isDark, toggle }
}

/* ── Desktop Sidebar ────────────────────────────────────────── */
export function Sidebar({ activeTab, onTabChange }: NavProps) {
  const { isDark, toggle } = useDarkMode()
  const router = useRouter()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  const mainNav = [
    { id: 'home',     icon: Briefcase,  label: 'Job Feed' },
    { id: 'discover', icon: Compass,    label: 'Swipe Deck' },
    { id: 'kanban',   icon: LayoutGrid, label: 'Kanban Board' },
    { id: 'saved',    icon: Bookmark,   label: 'Saved Jobs' },
  ]

  const bottomNav = [
    { id: 'settings', icon: Settings,    label: 'Settings' },
    { id: 'help',     icon: HelpCircle,  label: 'Help' },
  ]

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 h-screen z-50 p-4"
      style={{
        width: '240px',
        background: 'var(--surface-container-lowest)',
        borderRight: '1px solid var(--outline-variant)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2 mt-2">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-display font-black text-lg">
          K
        </div>
        <div>
          <h1 className="font-display text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
            Kareerly
          </h1>
          <p className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
            Career Hub
          </p>
        </div>
      </div>

      {/* Add New Job button */}
      <button 
        onClick={() => alert('Custom job uploads coming soon!')}
        className="w-full bg-primary-container text-on-primary-container font-display font-bold text-xs py-3 rounded-xl mb-6 hover:brightness-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-container/20 border-0 cursor-pointer"
      >
        <Plus className="w-4 h-4" /> Add New Job
      </button>

      {/* Main nav */}
      <nav className="flex-1 space-y-1">
        {mainNav.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`sidebar-item ${activeTab === id ? 'active' : ''}`}
          >
            <Icon className="w-[18px] h-[18px]" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="pb-2 space-y-1 border-t border-outline-variant pt-3 mt-auto">
        <button onClick={() => setSettingsOpen(true)} className="sidebar-item">
          <Settings className="w-[18px] h-[18px]" />
          <span>Settings</span>
        </button>
        <button onClick={() => setHelpOpen(true)} className="sidebar-item">
          <HelpCircle className="w-[18px] h-[18px]" />
          <span>Help</span>
        </button>

        {/* Modals */}
        <Modal title="Settings" isOpen={settingsOpen} onClose={() => setSettingsOpen(false)}>
          <p>This is a placeholder for your account settings, notification preferences, and application privacy options.</p>
        </Modal>
        <Modal title="Help Center" isOpen={helpOpen} onClose={() => setHelpOpen(false)}>
          <p>Need help? You can contact our support team or view the frequently asked questions here.</p>
        </Modal>

        {/* Theme toggle */}
        <button onClick={toggle} className="sidebar-item">
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  )
}

/* ── Top Bar (desktop: inside main area) ────────────────────── */
export function TopNav({ activeTab, onTabChange }: NavProps) {
  const { isDark, toggle } = useDarkMode()
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const topTabs = [
    { id: 'home',     label: 'Feed' },
    { id: 'discover', label: 'Swipe' },
    { id: 'kanban',   label: 'Kanban Board' },
    { id: 'saved',    label: 'Saved' },
    { id: 'profile',  label: 'Profile' },
  ]

  return (
    <header
      className="fixed top-0 right-0 z-40 flex justify-between items-center
                 px-6 h-14 border-b border-outline-variant md:left-[240px] left-0"
      style={{
        background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Mobile logo */}
      <div className="md:hidden">
        <h1 className="font-display text-lg font-bold" style={{ color: 'var(--on-surface)' }}>
          <span style={{ color: 'var(--primary-container)' }}>K</span>areerly
        </h1>
      </div>

      {/* Desktop tabs */}
      <nav className="hidden md:flex gap-1 h-full items-center">
        {topTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative text-sm font-semibold px-4 h-14 flex items-center transition-colors ${
              activeTab === tab.id
                ? 'text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                style={{ background: 'var(--primary-container)' }}
              />
            )}
          </button>
        ))}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Search — desktop */}
        <div
          className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-outline-variant text-sm"
          style={{ background: 'var(--surface-container)' }}
        >
          <Search className="w-4 h-4 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search roles..."
            className="bg-transparent outline-none w-36 text-on-surface placeholder:text-on-surface-variant/50 text-sm"
          />
        </div>

        {/* Dark mode toggle (mobile only, desktop is in sidebar) */}
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-full text-on-surface-variant hover:text-primary transition-colors"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notifications */}
        <button onClick={() => setNotificationsOpen(true)} className="relative p-2 rounded-full text-on-surface-variant hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full border-2"
            style={{ background: 'var(--primary-container)', borderColor: 'var(--surface)' }}
          />
        </button>

        <Modal title="Notifications" isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)}>
          <div className="space-y-3">
            <div className="p-3 bg-surface-container rounded-xl text-xs">
              <span className="font-bold block mb-1">New AI Match</span>
              We found 3 new software engineering roles matching your profile.
            </div>
            <div className="p-3 bg-surface-container rounded-xl text-xs">
              <span className="font-bold block mb-1">Resume Tailored</span>
              Your resume was successfully tailored for Google.
            </div>
          </div>
        </Modal>

        {/* Profile avatar */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-xs border-2 transition-all"
            style={{
              background: 'var(--primary-container)',
              color: 'var(--on-primary-container)',
              borderColor: activeTab === 'profile' ? 'var(--primary)' : 'transparent',
            }}
          >
            D
          </button>

          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-52 glass-card rounded-2xl overflow-hidden shadow-2xl z-50"
              >
                <div className="px-4 py-3 border-b border-outline-variant">
                  <p className="font-display font-bold text-sm text-on-surface">Dhruv Kumar</p>
                  <p className="text-xs text-on-surface-variant truncate">dhruv258.kumar@gmail.com</p>
                </div>
                <button
                  onClick={() => { onTabChange('profile'); setProfileOpen(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
                >
                  <User className="w-4 h-4" /> Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-surface-container-high transition-colors border-t border-outline-variant"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

/* ── Bottom Navigation (mobile only) ────────────────────────── */
export function BottomNav({ activeTab, onTabChange }: NavProps) {
  const tabs = [
    { id: 'home',     icon: Briefcase, label: 'Feed' },
    { id: 'discover', icon: Compass,   label: 'Swipe' },
    { id: 'kanban',   icon: LayoutGrid, label: 'Board' },
    { id: 'saved',    icon: Bookmark,  label: 'Saved' },
    { id: 'profile',  icon: User,      label: 'Profile' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center
                 py-2 px-4 md:hidden border-t border-outline-variant"
      style={{
        background: 'color-mix(in srgb, var(--surface-container) 95%, transparent)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {tabs.map(({ id, icon: Icon, label }) => {
        const active = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className="flex flex-col items-center justify-center gap-1 transition-all"
            style={{ color: active ? 'var(--primary-container)' : 'var(--on-surface-variant)' }}
          >
            <div
              className="p-1.5 rounded-xl transition-all"
              style={{
                background: active
                  ? 'color-mix(in srgb, var(--primary-container) 15%, transparent)'
                  : 'transparent',
              }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-body font-bold uppercase tracking-wider">{label}</span>
          </button>
        )
      })}
    </nav>
  )
}

/* ── Toast ───────────────────────────────────────────────────── */
export function Toast({ message, type }: { message: string; type: 'success' | 'info' }) {
  return (
    <div
      className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[100]
                 px-5 py-3 rounded-full border shadow-2xl flex items-center gap-3 min-w-[260px] max-w-sm"
      style={{
        background: 'var(--surface-container-highest)',
        borderColor: type === 'success'
          ? 'color-mix(in srgb, var(--tertiary) 40%, transparent)'
          : 'color-mix(in srgb, var(--primary) 40%, transparent)',
      }}
    >
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: type === 'success' ? 'var(--tertiary)' : 'var(--primary-container)' }}
      />
      <p className="text-sm font-display font-semibold text-on-surface">{message}</p>
    </div>
  )
}
