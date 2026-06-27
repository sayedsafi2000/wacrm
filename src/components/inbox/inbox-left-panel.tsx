'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'
import { ConversationList } from './conversation-list'
import { StatusStrip, type StatusAuthorGroup } from './status-strip'
import { StatusComposer } from './status-composer'
import { StatusViewer } from './status-viewer'
import { ChannelsPanel } from './channels-panel'
import { UpdatesPanel, CallsPanel } from './inbox-panels'
import { InboxFabPrimary, type InboxFabAction } from './inbox-fab'
import { InboxMobileTabs, type InboxMobileTab } from './inbox-mobile-tabs'
import { useInboxStatus } from '@/hooks/use-inbox-status'
import { useWhatsAppChannels } from '@/hooks/use-whatsapp-channels'

interface InboxLeftPanelProps {
  activeConversationId: string | null
  onSelect: (conversation: Conversation) => void
  conversations: Conversation[]
  onConversationsLoaded: (conversations: Conversation[]) => void
  resyncToken?: number
}

export function InboxLeftPanel({
  activeConversationId,
  onSelect,
  conversations,
  onConversationsLoaded,
  resyncToken = 0,
}: InboxLeftPanelProps) {
  const router = useRouter()
  const [mobileTab, setMobileTab] = useState<InboxMobileTab>('chats')
  const [fabOpen, setFabOpen] = useState(false)
  const [statusComposerOpen, setStatusComposerOpen] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<StatusAuthorGroup | null>(
    null,
  )

  const {
    statuses,
    loading: statusLoading,
    createStatus,
    deleteStatus,
  } = useInboxStatus()

  const {
    channels,
    loading: channelsLoading,
    createChannel,
    updateChannel,
    deleteChannel,
  } = useWhatsAppChannels()

  const unreadTotal = useMemo(
    () => conversations.filter((c) => c.unread_count > 0).length,
    [conversations],
  )

  const openStatusComposer = useCallback(() => {
    setStatusComposerOpen(true)
    setMobileTab('updates')
  }, [])

  const handleFabAction = useCallback(
    (action: InboxFabAction) => {
      switch (action) {
        case 'new-status':
          openStatusComposer()
          break
        case 'new-channel':
          setMobileTab('channels')
          break
        case 'new-chat':
          router.push('/contacts')
          break
        default:
          break
      }
    },
    [openStatusComposer, router],
  )

  const showListChrome = !activeConversationId

  return (
    <>
      <div className="relative flex h-full w-full flex-col pb-14 lg:pb-0">
        {/* Chats tab (mobile) + always on desktop */}
        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            mobileTab !== 'chats' && 'hidden lg:flex',
          )}
        >
          <StatusStrip
            statuses={statuses}
            compact
            onAddStatus={openStatusComposer}
            onOpenGroup={setViewingGroup}
          />
          <ConversationList
            activeConversationId={activeConversationId}
            onSelect={onSelect}
            conversations={conversations}
            onConversationsLoaded={onConversationsLoaded}
            resyncToken={resyncToken}
          />
        </div>

        {mobileTab === 'updates' && (
          <div className="min-h-0 flex-1 lg:hidden">
            <UpdatesPanel
              statuses={statuses}
              loading={statusLoading}
              onAddStatus={openStatusComposer}
              onOpenGroup={setViewingGroup}
            />
          </div>
        )}
        {mobileTab === 'channels' && (
          <div className="min-h-0 flex-1 lg:hidden">
            <ChannelsPanel
              channels={channels}
              loading={channelsLoading}
              onCreate={async (p) => {
                await createChannel(p)
              }}
              onUpdate={async (id, p) => {
                await updateChannel(id, p)
              }}
              onDelete={async (id) => {
                await deleteChannel(id)
              }}
            />
          </div>
        )}
        {mobileTab === 'calls' && (
          <div className="min-h-0 flex-1 lg:hidden">
            <CallsPanel />
          </div>
        )}
      </div>

      {showListChrome && (
        <>
          <InboxMobileTabs
            active={mobileTab}
            onChange={setMobileTab}
            unreadCount={unreadTotal}
          />
          <InboxFabPrimary
            expanded={fabOpen}
            onToggle={() => setFabOpen((o) => !o)}
            onAction={handleFabAction}
          />
        </>
      )}

      <StatusComposer
        open={statusComposerOpen}
        onOpenChange={setStatusComposerOpen}
        onSubmit={async (p) => {
          await createStatus(p)
        }}
      />

      {viewingGroup && (
        <StatusViewer
          group={viewingGroup}
          onClose={() => setViewingGroup(null)}
          onDelete={deleteStatus}
        />
      )}
    </>
  )
}
