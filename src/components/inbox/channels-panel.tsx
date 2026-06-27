'use client'

import { useEffect, useState } from 'react'
import {
  ExternalLink,
  Loader2,
  Megaphone,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { WhatsAppChannel } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ChannelsPanelProps {
  channels: WhatsAppChannel[]
  loading: boolean
  onCreate: (payload: {
    name: string
    description?: string
    invite_link?: string
    follower_count?: number
  }) => Promise<void>
  onUpdate: (
    id: string,
    payload: Partial<
      Pick<
        WhatsAppChannel,
        'name' | 'description' | 'invite_link' | 'follower_count' | 'is_active'
      >
    >,
  ) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function ChannelsPanel({
  channels,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: ChannelsPanelProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<WhatsAppChannel | null>(null)

  const active = channels.filter((c) => c.is_active)
  const archived = channels.filter((c) => !c.is_active)

  return (
    <div className="flex h-full min-w-0 flex-col bg-white dark:bg-[#111b21]">
      <div className="flex items-center justify-between border-b border-[#e9edef] px-4 py-3 dark:border-[#222d34]">
        <div>
          <h2 className="text-base font-semibold text-[#111b21] dark:text-[#e9edef]">
            Channels
          </h2>
          <p className="text-xs text-[#8696a0]">
            Manage your WhatsApp broadcast channels
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
          className="bg-[#25D366] hover:bg-[#20bd5a]"
        >
          <Plus className="mr-1 h-4 w-4" />
          New
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#25D366]" />
          </div>
        ) : active.length === 0 && archived.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Megaphone className="mx-auto mb-3 h-12 w-12 text-[#8696a0]" />
            <p className="font-medium text-[#111b21] dark:text-[#e9edef]">
              No channels yet
            </p>
            <p className="mt-2 text-sm text-[#8696a0]">
              Create a channel in WhatsApp Business, then add its invite link
              here so your team can open and manage it from the CRM.
            </p>
            <Button
              className="mt-4 bg-[#25D366] hover:bg-[#20bd5a]"
              onClick={() => setFormOpen(true)}
            >
              Add channel
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#e9edef] dark:divide-[#222d34]">
            {active.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                onEdit={() => {
                  setEditing(ch)
                  setFormOpen(true)
                }}
                onArchive={() =>
                  void onUpdate(ch.id, { is_active: false }).catch((e) =>
                    toast.error(e.message),
                  )
                }
                onDelete={() =>
                  void onDelete(ch.id).catch((e) => toast.error(e.message))
                }
              />
            ))}
            {archived.length > 0 && (
              <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#8696a0]">
                Archived
              </p>
            )}
            {archived.map((ch) => (
              <ChannelRow
                key={ch.id}
                channel={ch}
                muted
                onEdit={() => {
                  setEditing(ch)
                  setFormOpen(true)
                }}
                onRestore={() =>
                  void onUpdate(ch.id, { is_active: true }).catch((e) =>
                    toast.error(e.message),
                  )
                }
                onDelete={() =>
                  void onDelete(ch.id).catch((e) => toast.error(e.message))
                }
              />
            ))}
          </div>
        )}
      </div>

      <ChannelFormDialog
        open={formOpen}
        channel={editing}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) setEditing(null)
        }}
        onSave={async (payload) => {
          if (editing) await onUpdate(editing.id, payload)
          else await onCreate(payload)
          toast.success(editing ? 'Channel updated' : 'Channel added')
        }}
      />
    </div>
  )
}

function ChannelRow({
  channel,
  muted,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
}: {
  channel: WhatsAppChannel
  muted?: boolean
  onEdit: () => void
  onArchive?: () => void
  onRestore?: () => void
  onDelete: () => void
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        muted && 'opacity-60',
      )}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#008069]">
        <Megaphone className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-[#111b21] dark:text-[#e9edef]">
          {channel.name}
        </p>
        {channel.description && (
          <p className="truncate text-sm text-[#667781]">{channel.description}</p>
        )}
        <div className="mt-0.5 flex items-center gap-2 text-xs text-[#8696a0]">
          <Users className="h-3 w-3" />
          {channel.follower_count.toLocaleString()} followers
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {channel.invite_link && (
          <a
            href={channel.invite_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#008069] hover:bg-[#f0f2f5]"
            aria-label="Open channel"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#f0f2f5]">
            <MoreVertical className="h-4 w-4 text-[#54656f]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            {onArchive && (
              <DropdownMenuItem onClick={onArchive}>Archive</DropdownMenuItem>
            )}
            {onRestore && (
              <DropdownMenuItem onClick={onRestore}>Restore</DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function ChannelFormDialog({
  open,
  channel,
  onOpenChange,
  onSave,
}: {
  open: boolean
  channel: WhatsAppChannel | null
  onOpenChange: (open: boolean) => void
  onSave: (payload: {
    name: string
    description?: string
    invite_link?: string
    follower_count?: number
  }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [followers, setFollowers] = useState('0')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setName(channel?.name ?? '')
      setDescription(channel?.description ?? '')
      setInviteLink(channel?.invite_link ?? '')
      setFollowers(String(channel?.follower_count ?? 0))
    }
  }, [open, channel])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{channel ? 'Edit channel' : 'Add channel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Channel name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Description
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Invite link (from WhatsApp → Channel → Share)
            </label>
            <Input
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              placeholder="https://whatsapp.com/channel/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Follower count (optional)
            </label>
            <Input
              type="number"
              min={0}
              value={followers}
              onChange={(e) => setFollowers(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy || !name.trim()}
            onClick={() => {
              setBusy(true)
              void onSave({
                name: name.trim(),
                description: description.trim() || undefined,
                invite_link: inviteLink.trim() || undefined,
                follower_count: Number(followers) || 0,
              })
                .then(() => onOpenChange(false))
                .catch((e) => toast.error(e.message))
                .finally(() => setBusy(false))
            }}
            className="bg-[#25D366] hover:bg-[#20bd5a]"
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
