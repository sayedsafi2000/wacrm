'use client'

import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusUpdate } from '@/types'
import { useAuth } from '@/hooks/use-auth'

export interface StatusAuthorGroup {
  authorId: string
  label: string
  avatarUrl?: string | null
  items: StatusUpdate[]
  isMine: boolean
}

export function groupStatusesByAuthor(
  statuses: StatusUpdate[],
  currentUserId?: string | null,
  myName?: string | null,
): StatusAuthorGroup[] {
  const map = new Map<string, StatusUpdate[]>()
  for (const s of statuses) {
    const list = map.get(s.author_id) ?? []
    list.push(s)
    map.set(s.author_id, list)
  }

  return Array.from(map.entries())
    .map(([authorId, items]) => {
      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      const isMine = authorId === currentUserId
      return {
        authorId,
        label: isMine ? 'My status' : 'Team status',
        items: sorted,
        isMine,
      }
    })
    .sort((a, b) => {
      if (a.isMine) return -1
      if (b.isMine) return 1
      return (
        new Date(b.items[0].created_at).getTime() -
        new Date(a.items[0].created_at).getTime()
      )
    })
}

interface StatusStripProps {
  statuses: StatusUpdate[]
  onAddStatus: () => void
  onOpenGroup: (group: StatusAuthorGroup) => void
  compact?: boolean
}

export function StatusStrip({
  statuses,
  onAddStatus,
  onOpenGroup,
  compact = false,
}: StatusStripProps) {
  const { user, profile } = useAuth()
  const groups = useMemo(
    () => groupStatusesByAuthor(statuses, user?.id, profile?.full_name),
    [statuses, user?.id, profile?.full_name],
  )

  const myGroup = groups.find((g) => g.isMine)
  const otherGroups = groups.filter((g) => !g.isMine)

  return (
    <div
      className={cn(
        'shrink-0 border-b border-[#e9edef] bg-white dark:border-[#222d34] dark:bg-[#111b21]',
        compact ? 'py-2' : 'py-3',
      )}
    >
      <div className="flex gap-3 overflow-x-auto px-3 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <StatusRingButton
          label={myGroup ? 'My status' : 'Add status'}
          sublabel={myGroup ? 'Tap to view' : 'Tap to add'}
          variant={myGroup ? 'view' : 'add'}
          onClick={() => {
            if (myGroup) onOpenGroup(myGroup)
            else onAddStatus()
          }}
          avatarInitial={
            profile?.full_name?.charAt(0) ||
            profile?.email?.charAt(0) ||
            'Y'
          }
          avatarUrl={profile?.avatar_url}
        />

        {otherGroups.map((group) => (
          <StatusRingButton
            key={group.authorId}
            label={group.label}
            sublabel="Tap to view"
            variant="view"
            onClick={() => onOpenGroup(group)}
            avatarInitial="T"
          />
        ))}
      </div>
    </div>
  )
}

function StatusRingButton({
  label,
  sublabel,
  variant,
  onClick,
  avatarInitial,
  avatarUrl,
}: {
  label: string
  sublabel: string
  variant: 'add' | 'view'
  onClick: () => void
  avatarInitial: string
  avatarUrl?: string | null
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 text-center"
    >
      <div
        className={cn(
          'relative flex h-[54px] w-[54px] items-center justify-center rounded-full p-[2px]',
          variant === 'view'
            ? 'bg-gradient-to-tr from-[#25D366] via-[#53BDEB] to-[#7c3aed]'
            : 'border-2 border-dashed border-[#8696a0]/60 bg-transparent',
        )}
      >
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[#dfe5e7] dark:bg-[#2a3942]">
          {variant === 'add' ? (
            <Plus className="h-6 w-6 text-[#8696a0]" />
          ) : avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg font-medium text-[#54656f] dark:text-[#aebac1]">
              {avatarInitial}
            </span>
          )}
        </div>
      </div>
      <div className="w-full">
        <p className="truncate text-[11px] font-medium text-[#111b21] dark:text-[#e9edef]">
          {label}
        </p>
        <p className="truncate text-[10px] text-[#8696a0]">{sublabel}</p>
      </div>
    </button>
  )
}
