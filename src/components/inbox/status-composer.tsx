'use client'

import { useCallback, useRef, useState } from 'react'
import { Image as ImageIcon, Loader2, Type, Video, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  uploadAccountMedia,
  MEDIA_MAX_BYTES_BY_KIND,
} from '@/lib/storage/upload-media'
import { CHAT_MEDIA_BUCKET } from './message-composer'

const TEXT_BACKGROUNDS = [
  '#075E54',
  '#128C7E',
  '#25D366',
  '#34B7F1',
  '#7c3aed',
  '#e11d48',
  '#ea580c',
  '#111b21',
]

interface StatusComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: {
    content_type: 'text' | 'image' | 'video'
    content_text?: string
    media_url?: string
    background_color?: string
  }) => Promise<void>
}

export function StatusComposer({
  open,
  onOpenChange,
  onSubmit,
}: StatusComposerProps) {
  const [mode, setMode] = useState<'text' | 'image' | 'video'>('text')
  const [text, setText] = useState('')
  const [bg, setBg] = useState(TEXT_BACKGROUNDS[0])
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setMode('text')
    setText('')
    setBg(TEXT_BACKGROUNDS[0])
    setMediaUrl(null)
    setMediaPreview(null)
    setBusy(false)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset],
  )

  const uploadFile = useCallback(async (file: File, kind: 'image' | 'video') => {
    const max = MEDIA_MAX_BYTES_BY_KIND[kind]
    if (file.size > max) {
      toast.error(`File too large for ${kind}.`)
      return
    }
    setBusy(true)
    try {
      const { publicUrl } = await uploadAccountMedia(CHAT_MEDIA_BUCKET, file)
      setMediaUrl(publicUrl)
      setMediaPreview(URL.createObjectURL(file))
      setMode(kind)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }, [])

  const handlePost = useCallback(async () => {
    setBusy(true)
    try {
      if (mode === 'text') {
        if (!text.trim()) {
          toast.error('Write something for your status.')
          return
        }
        await onSubmit({
          content_type: 'text',
          content_text: text.trim(),
          background_color: bg,
        })
      } else if (mode === 'image' && mediaUrl) {
        await onSubmit({
          content_type: 'image',
          content_text: text.trim() || undefined,
          media_url: mediaUrl,
        })
      } else if (mode === 'video' && mediaUrl) {
        await onSubmit({
          content_type: 'video',
          content_text: text.trim() || undefined,
          media_url: mediaUrl,
        })
      } else {
        toast.error('Add media first.')
        return
      }
      toast.success('Status posted (visible to your team for 24h)')
      handleOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post status')
    } finally {
      setBusy(false)
    }
  }, [mode, text, bg, mediaUrl, onSubmit, handleOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            {(
              [
                { id: 'text', icon: Type, label: 'Text' },
                { id: 'image', icon: ImageIcon, label: 'Photo' },
                { id: 'video', icon: Video, label: 'Video' },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id)
                  if (id === 'image') imageRef.current?.click()
                  if (id === 'video') videoRef.current?.click()
                }}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs',
                  mode === id
                    ? 'border-[#25D366] bg-[#d9fdd3]/40 text-[#008069]'
                    : 'border-border text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>

          <input
            ref={imageRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void uploadFile(f, 'image')
              e.target.value = ''
            }}
          />
          <input
            ref={videoRef}
            type="file"
            accept="video/mp4,video/3gpp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void uploadFile(f, 'video')
              e.target.value = ''
            }}
          />

          {mode === 'text' && (
            <>
              <div
                className="flex min-h-[160px] items-center justify-center rounded-xl p-4 text-center text-lg font-medium text-white"
                style={{ backgroundColor: bg }}
              >
                {text || 'Type your status…'}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind?"
                maxLength={700}
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-[#25D366]/50"
              />
              <div className="flex flex-wrap gap-2">
                {TEXT_BACKGROUNDS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={`Background ${color}`}
                    onClick={() => setBg(color)}
                    className={cn(
                      'h-8 w-8 rounded-full border-2',
                      bg === color ? 'border-[#25D366]' : 'border-transparent',
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </>
          )}

          {(mode === 'image' || mode === 'video') && (
            <div className="relative overflow-hidden rounded-xl bg-muted">
              {busy && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {mediaPreview ? (
                mode === 'video' ? (
                  <video src={mediaPreview} controls className="max-h-64 w-full" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaPreview} alt="" className="max-h-64 w-full object-cover" />
                )
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Pick {mode} to preview
                </div>
              )}
              {mediaPreview && (
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl(null)
                    setMediaPreview(null)
                    setMode('text')
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Optional caption"
                className="rounded-none border-0 border-t"
              />
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Status is saved in your CRM for 24 hours. To publish to WhatsApp
            contacts, open the WhatsApp Business app → Updates → create status
            there (Meta Cloud API does not support status posting yet).
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => void handlePost()}
            className="bg-[#25D366] hover:bg-[#20bd5a]"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
