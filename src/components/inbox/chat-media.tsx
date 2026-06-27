'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, ImageOff, Loader2, Maximize2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  downloadMediaUrl,
  fetchMediaBlob,
  isWhatsAppMediaProxy,
  triggerBlobDownload,
} from '@/lib/inbox/media-fetch'
import { VoiceNotePlayer } from './voice-note-player'

function useResolvedMediaUrl(url: string | undefined) {
  const [resolved, setResolved] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!url)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) {
      setResolved(null)
      setLoading(false)
      setError(false)
      return
    }

    let cancelled = false
    let blobUrl: string | null = null

    ;(async () => {
      setLoading(true)
      setError(false)
      try {
        if (isWhatsAppMediaProxy(url)) {
          const { blob } = await fetchMediaBlob(url)
          blobUrl = URL.createObjectURL(blob)
          if (!cancelled) setResolved(blobUrl)
        } else {
          if (!cancelled) setResolved(url)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [url])

  return { resolved, loading, error }
}

function MediaLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-muted',
        className,
      )}
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  )
}

function MediaError({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <ImageOff className="h-4 w-4 shrink-0" />
      <span>{label} unavailable</span>
    </div>
  )
}

export function ChatMediaImage({
  url,
  alt,
  className,
  downloadName,
}: {
  url: string
  alt: string
  className?: string
  downloadName?: string
}) {
  const { resolved, loading, error } = useResolvedMediaUrl(url)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const saveAs = downloadName ?? `image-${Date.now()}.jpg`

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadMediaUrl(url, saveAs)
      toast.success('Image saved')
    } catch {
      toast.error('Could not save image')
    } finally {
      setDownloading(false)
    }
  }, [url, saveAs])

  if (error) return <MediaError label="Image" />
  if (loading || !resolved) {
    return <MediaLoading className={cn('h-40 w-60', className)} />
  }

  return (
    <>
      <div className={cn('group relative max-w-[min(100%,16rem)]', className)}>
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full overflow-hidden rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label="View image full size"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolved}
            alt={alt}
            className="max-h-64 w-full rounded-lg object-cover"
          />
        </button>
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm"
            aria-label="Expand image"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={() => void handleDownload()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm disabled:opacity-60"
            aria-label="Save image"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[95vh] max-w-[95vw] border-none bg-black/95 p-2 sm:max-w-3xl"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <div className="relative flex max-h-[85vh] items-center justify-center">
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              className="absolute right-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={downloading}
              onClick={() => void handleDownload()}
              className="absolute left-2 top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-60"
              aria-label="Save image"
            >
              {downloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resolved}
              alt={alt}
              className="max-h-[80vh] max-w-full rounded-md object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ChatMediaVideo({
  url,
  downloadName,
}: {
  url: string
  downloadName?: string
}) {
  const { resolved, loading, error } = useResolvedMediaUrl(url)
  const [downloading, setDownloading] = useState(false)
  const saveAs = downloadName ?? `video-${Date.now()}.mp4`

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadMediaUrl(url, saveAs)
      toast.success('Video saved')
    } catch {
      toast.error('Could not save video')
    } finally {
      setDownloading(false)
    }
  }, [url, saveAs])

  if (error) return <MediaError label="Video" />
  if (loading || !resolved) return <MediaLoading className="h-40 w-60" />

  return (
    <div className="group relative max-w-[min(100%,16rem)]">
      <video
        src={resolved}
        controls
        playsInline
        className="max-h-64 w-full rounded-lg"
      />
      <button
        type="button"
        disabled={downloading}
        onClick={() => void handleDownload()}
        className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-100 backdrop-blur-sm disabled:opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Save video"
      >
        {downloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
    </div>
  )
}

export function ChatMediaAudio({
  url,
  variant = 'inbound',
  seed,
  footer,
}: {
  url: string
  variant?: 'inbound' | 'outbound'
  seed?: string
  footer?: React.ReactNode
}) {
  const { resolved, loading, error } = useResolvedMediaUrl(url)

  if (error) return <MediaError label="Voice message" />
  if (loading || !resolved) {
    return <MediaLoading className="h-[52px] w-[min(100%,280px)] min-w-[200px]" />
  }

  return (
    <VoiceNotePlayer
      src={resolved}
      variant={variant}
      seed={seed ?? url}
      footer={footer}
    />
  )
}

export function ChatMediaDocument({
  url,
  label,
}: {
  url: string
  label: string
}) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const safeName = label.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'document'
      await downloadMediaUrl(url, safeName.includes('.') ? safeName : `${safeName}.bin`)
      toast.success('Download started')
    } catch {
      toast.error('Could not download file')
    } finally {
      setDownloading(false)
    }
  }, [url, label])

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={downloading}
      className="flex w-full max-w-xs items-center gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-left text-sm hover:bg-muted disabled:opacity-60"
    >
      {downloading ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
      ) : (
        <Download className="h-5 w-5 shrink-0 text-primary" />
      )}
      <span className="min-w-0 flex-1 truncate">{label || 'Document'}</span>
    </button>
  )
}
