'use client'

import Link from 'next/link'
import {
  CircleFadingPlus,
  Megaphone,
  MessageCirclePlus,
  Radio,
  UserPlus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

export type InboxFabAction =
  | 'new-chat'
  | 'new-status'
  | 'new-channel'
  | 'broadcast'
  | 'new-contact'

const MENU_ITEMS: {
  id: InboxFabAction
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  href?: string
}[] = [
  {
    id: 'new-chat',
    label: 'New chat',
    description: 'Message a contact',
    icon: MessageCirclePlus,
    color: 'bg-[#25D366]',
  },
  {
    id: 'new-status',
    label: 'New status',
    description: 'Text, photo, or video',
    icon: CircleFadingPlus,
    color: 'bg-[#128C7E]',
  },
  {
    id: 'new-channel',
    label: 'New channel',
    description: 'Add a WhatsApp channel',
    icon: Megaphone,
    color: 'bg-[#7c3aed]',
  },
  {
    id: 'broadcast',
    label: 'New broadcast',
    description: 'Send to many contacts',
    icon: Radio,
    color: 'bg-amber-500',
    href: '/broadcasts/new',
  },
  {
    id: 'new-contact',
    label: 'New contact',
    description: 'Add to your CRM',
    icon: UserPlus,
    color: 'bg-[#34B7F1]',
    href: '/contacts',
  },
]

export function InboxFabPrimary({
  expanded,
  onToggle,
  onAction,
}: {
  expanded: boolean
  onToggle: () => void
  onAction: (action: InboxFabAction) => void
}) {
  return (
    <>
      <Sheet open={expanded} onOpenChange={(o) => !o && onToggle()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden"
        >
          <SheetHeader>
            <SheetTitle>Create</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon
              const inner = (
                <>
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white',
                      item.color,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 text-left">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </>
              )
              if (item.href) {
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={onToggle}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-3 hover:bg-muted/60"
                  >
                    {inner}
                  </Link>
                )
              }
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onToggle()
                    onAction(item.id)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-3 hover:bg-muted/60"
                >
                  {inner}
                </button>
              )
            })}
          </div>
        </SheetContent>
      </Sheet>

      <button
        type="button"
        onClick={onToggle}
        aria-label={expanded ? 'Close menu' : 'Create new'}
        className={cn(
          'fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform lg:hidden',
          expanded && 'rotate-45',
        )}
      >
        {expanded ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCirclePlus className="h-6 w-6" />
        )}
      </button>
    </>
  )
}
