'use client'

import { MessageCircle, Megaphone, Phone, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'

export type InboxMobileTab = 'chats' | 'updates' | 'channels' | 'calls'

interface InboxMobileTabsProps {
  active: InboxMobileTab
  onChange: (tab: InboxMobileTab) => void
  unreadCount?: number
}

const TABS: {
  id: InboxMobileTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'updates', label: 'Updates', icon: CircleDot },
  { id: 'channels', label: 'Channels', icon: Megaphone },
  { id: 'calls', label: 'Calls', icon: Phone },
]

export function InboxMobileTabs({
  active,
  onChange,
  unreadCount = 0,
}: InboxMobileTabsProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#e9edef] bg-white pb-[env(safe-area-inset-bottom)] dark:border-[#222d34] dark:bg-[#111b21] lg:hidden">
      <div className="flex h-14 items-stretch">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-[#008069] dark:text-[#25D366]'
                  : 'text-[#8696a0]',
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
              {tab.label}
              {tab.id === 'chats' && unreadCount > 0 && (
                <span className="absolute right-[calc(50%-22px)] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#25D366] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
