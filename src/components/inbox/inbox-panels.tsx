'use client'

import { CircleFadingPlus, Loader2, Phone, Video } from 'lucide-react'
import type { StatusUpdate } from '@/types'
import { Button } from '@/components/ui/button'
import { whatsAppChatUrl } from '@/lib/whatsapp/deep-link'
import { StatusStrip, type StatusAuthorGroup } from './status-strip'

interface UpdatesPanelProps {
  statuses: StatusUpdate[]
  loading: boolean
  onAddStatus: () => void
  onOpenGroup: (group: StatusAuthorGroup) => void
}

export function UpdatesPanel({
  statuses,
  loading,
  onAddStatus,
  onOpenGroup,
}: UpdatesPanelProps) {
  return (
    <div className="flex h-full min-w-0 flex-col bg-white dark:bg-[#111b21]">
      <div className="border-b border-[#e9edef] px-4 py-3 dark:border-[#222d34]">
        <h2 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
          Updates
        </h2>
        <p className="text-xs text-[#8696a0]">Status from your team (24h)</p>
      </div>

      <StatusStrip
        statuses={statuses}
        onAddStatus={onAddStatus}
        onOpenGroup={onOpenGroup}
      />

      <button
        type="button"
        onClick={onAddStatus}
        className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-dashed border-[#25D366]/50 bg-[#d9fdd3]/30 px-4 py-4 text-left dark:bg-[#005c4b]/20"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white">
          <CircleFadingPlus className="h-6 w-6" />
        </div>
        <div>
          <p className="font-medium text-[#008069]">Create a status</p>
          <p className="text-xs text-[#667781]">
            Share text, photo, or video with your team
          </p>
        </div>
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-[#25D366]" />
        </div>
      ) : statuses.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-[#8696a0]">
          No status updates yet. Post one to get started.
        </p>
      ) : null}

      <div className="mt-6 border-t border-[#e9edef] px-4 py-4 dark:border-[#222d34]">
        <p className="text-xs leading-relaxed text-[#8696a0]">
          To publish status to your WhatsApp contacts, use the WhatsApp Business
          app → Updates. Meta Cloud API does not support posting status yet.
        </p>
      </div>
    </div>
  )
}

export function CallsPanel() {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-[#111b21]">
      <div className="border-b border-[#e9edef] px-4 py-3 dark:border-[#222d34]">
        <h2 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
          Calls
        </h2>
        <p className="text-xs text-[#8696a0]">Voice &amp; video from WhatsApp</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d9fdd3]/60 dark:bg-[#005c4b]/30">
            <Phone className="h-7 w-7 text-[#008069]" />
          </div>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d9fdd3]/60 dark:bg-[#005c4b]/30">
            <Video className="h-7 w-7 text-[#008069]" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-[#111b21] dark:text-[#e9edef]">
          Call from WhatsApp
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#8696a0]">
          In-browser calls inside this CRM need Meta&apos;s WhatsApp Calling API
          (WebRTC setup) — not wired yet. Open a chat and use the{' '}
          <Phone className="mx-0.5 inline h-3.5 w-3.5" /> or{' '}
          <Video className="mx-0.5 inline h-3.5 w-3.5" /> buttons in the chat
          header to jump to WhatsApp on your phone, then tap call there.
        </p>
      </div>

      <div className="border-t border-[#e9edef] px-4 py-4 dark:border-[#222d34]">
        <p className="text-xs leading-relaxed text-[#8696a0]">
          Meta Cloud API calling (answer calls in the browser) requires enabling
          Calling in Meta Business Manager + webhook + WebRTC integration. We
          can add that in a follow-up if you need agents to pick up calls
          directly in the CRM.
        </p>
      </div>
    </div>
  )
}

interface ContactCallActionsProps {
  phone: string
  name?: string | null
}

/** Compact call shortcuts when a contact context is available. */
export function ContactCallActions({ phone, name }: ContactCallActionsProps) {
  const label = name || phone
  const url = whatsAppChatUrl(phone)

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 border-[#008069]/30 text-[#008069] hover:bg-[#d9fdd3]/40"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      >
        <Phone className="size-4" />
        Call {label}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="flex-1 border-[#008069]/30 text-[#008069] hover:bg-[#d9fdd3]/40"
        onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      >
        <Video className="size-4" />
        Video
      </Button>
    </div>
  )
}
