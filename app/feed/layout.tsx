'use client'

import { Sidebar, TopNav, BottomNav } from '@/components/ui/Navigation'
import type { TabId } from '@/components/ui/Navigation'
import { usePathname, useRouter } from 'next/navigation'

export default function FeedLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  // Map pathname to active tab
  let activeTab: TabId = 'home'
  if (pathname === '/feed/discover') {
    activeTab = 'discover'
  } else if (pathname === '/feed/kanban') {
    activeTab = 'kanban'
  } else if (pathname === '/feed/saved') {
    activeTab = 'saved'
  } else if (pathname === '/feed/profile') {
    activeTab = 'profile'
  }

  const handleTabChange = (tab: string) => {
    if (tab === 'home') {
      router.push('/feed')
    } else {
      router.push(`/feed/${tab}`)
    }
  }

  return (
    <div
      className="min-h-screen flex transition-colors duration-300"
      style={{ background: 'var(--surface)' }}
    >
      {/* Desktop sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Main content area — offset by sidebar on desktop */}
      <div className="flex-1 flex flex-col md:ml-[240px]">
        <TopNav activeTab={activeTab} onTabChange={handleTabChange} />

        <main
          className={`flex-1 pt-16 pb-24 md:pb-8 ${
            activeTab === 'saved' || activeTab === 'kanban'
              ? 'px-4 md:px-8'
              : 'px-4 md:px-8 max-w-[1100px] mx-auto w-full'
          }`}
        >
          <div className="h-full pt-4">
            {children}
          </div>
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
  )
}
