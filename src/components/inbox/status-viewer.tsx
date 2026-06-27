'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { StatusUpdate } from '@/types'
import type { StatusAuthorGroup } from './status-strip'
import { useAuth } from '@/hooks/use-auth'

interface StatusViewerProps {
  group: StatusAuthorGroup | null
  onClose: () => void
  onDelete?: (id: string) => Promise<void>
}

export function StatusViewer({ group, onClose, onDelete }: StatusViewerProps) {
  const { user } = useAuth()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [group?.authorId])

  const current = group?.items[index]

  const goNext = useCallback(() => {
    if (!group) return
    if (index < group.items.length - 1) setIndex((i) => i + 1)
    else onClose()
  }, [group, index, onClose])

  const goPrev = useCallback(() => {
    if (index > 0) setIndex((i) => i - 1)
  }, [index])

  if (!group || !current) return null

  const canDelete = onDelete && current.author_id === user?.id

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-3 py-3 text-white">
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10">
          <X className="h-6 w-6" />
        </button>
        <div className="text-center">
          <p className="text-sm font-medium">{group.label}</p>
          <p className="text-xs text-white/70">
            {formatDistanceToNow(new Date(current.created_at), { addSuffix: true })}
          </p>
        </div>
        {canDelete ? (
          <button
            type="button"
            onClick={() => {
              void onDelete(current.id)
                .then(() => {
                  toast.success('Status deleted')
                  if (group.items.length <= 1) onClose()
                  else setIndex((i) => Math.max(0, i - 1))
                })
                .catch((err) =>
                  toast.error(err instanceof Error ? err.message : 'Delete failed'),
                )
            }}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Progress bars */}
      <div className="flex gap-1 px-3">
        {group.items.map((item, i) => (
          <div
            key={item.id}
            className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
          >
            <div
              className={cn(
                'h-full bg-white transition-all',
                i < index ? 'w-full' : i === index ? 'w-full animate-pulse' : 'w-0',
              )}
            />
          </div>
        ))}
      </div>

      <div className="relative flex flex-1 items-center justify-center px-2">
        <button
          type="button"
          aria-label="Previous"
          onClick={goPrev}
          className="absolute left-0 z-10 hidden h-full w-1/4 sm:block"
        />
        <StatusSlide status={current} />
        <button
          type="button"
          aria-label="Next"
          onClick={goNext}
          className="absolute right-0 z-10 hidden h-full w-1/4 sm:block"
        />
      </div>

      <div className="flex items-center justify-between px-4 pb-6 pt-2 sm:hidden">
        <button type="button" onClick={goPrev} disabled={index === 0} className="rounded-full p-2 text-white disabled:opacity-30">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <span className="text-xs text-white/70">
          {index + 1} / {group.items.length}
        </span>
        <button type="button" onClick={goNext} className="rounded-full p-2 text-white">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}

function StatusSlide({ status }: { status: StatusUpdate }) {
  if (status.content_type === 'text') {
    return (
      <div
        className="flex max-h-[70vh] min-h-[50vh] w-full max-w-md items-center justify-center rounded-lg p-8 text-center text-2xl font-medium text-white"
        style={{ backgroundColor: status.background_color || '#075E54' }}
      >
        {status.content_text}
      </div>
    )
  }

  if (status.content_type === 'video' && status.media_url) {
    return (
      <video
        src={status.media_url}
        controls
        autoPlay
        playsInline
        className="max-h-[75vh] max-w-full rounded-lg"
      />
    )
  }

  if (status.media_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={status.media_url}
        alt=""
        className="max-h-[75vh] max-w-full rounded-lg object-contain"
      />
    )
  }

  return null
}
