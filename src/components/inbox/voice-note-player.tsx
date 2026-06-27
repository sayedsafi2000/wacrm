'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Mic, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Only one voice note plays at a time (WhatsApp behaviour). */
let activeAudio: HTMLAudioElement | null = null

function seedBars(seed: string, count: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0
  }
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345 + i) | 0
    return 0.2 + (Math.abs(h) % 80) / 100
  })
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export interface VoiceNotePlayerProps {
  src: string
  variant?: 'inbound' | 'outbound'
  /** Stable id used to seed the decorative waveform. */
  seed?: string
  className?: string
  footer?: React.ReactNode
}

export function VoiceNotePlayer({
  src,
  variant = 'inbound',
  seed = src,
  className,
  footer,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [ready, setReady] = useState(false)

  const bars = useMemo(() => seedBars(seed, 32), [seed])
  const isOutbound = variant === 'outbound'

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      return
    }

    if (activeAudio && activeAudio !== audio) {
      activeAudio.pause()
    }
    activeAudio = audio
    try {
      await audio.play()
    } catch {
      // Autoplay blocked or decode error — ignore.
    }
  }, [playing])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onPlay = () => {
      if (activeAudio && activeAudio !== audio) activeAudio.pause()
      activeAudio = audio
      setPlaying(true)
    }
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      setPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }
    const onLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration)
        setReady(true)
      }
    }
    const onTimeUpdate = () => {
      const t = audio.currentTime
      const d = audio.duration
      setCurrentTime(t)
      if (Number.isFinite(d) && d > 0) setProgress(t / d)
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('durationchange', onLoaded)
    audio.addEventListener('timeupdate', onTimeUpdate)

    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('durationchange', onLoaded)
      audio.removeEventListener('timeupdate', onTimeUpdate)
      if (activeAudio === audio) activeAudio = null
    }
  }, [src])

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current
      if (!audio || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const pct = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
      audio.currentTime = pct * duration
    },
    [duration],
  )

  const displayDuration = playing
    ? formatAudioTime(currentTime)
    : formatAudioTime(duration)

  return (
    <div
      className={cn(
        'relative w-[min(100%,280px)] min-w-[200px] select-none',
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />

      <div className="flex items-center gap-2.5">
        {!isOutbound && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7] dark:bg-[#2a3942]">
            <Mic className="h-4 w-4 text-[#8696a0]" />
          </div>
        )}

        <button
          type="button"
          onClick={() => void togglePlay()}
          disabled={!ready}
          aria-label={playing ? 'Pause voice message' : 'Play voice message'}
          className={cn(
            'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-colors',
            isOutbound
              ? 'bg-[#008069] text-white hover:bg-[#006e5a] dark:bg-[#008069]'
              : 'bg-[#8696a0] text-white hover:bg-[#667781]',
            !ready && 'opacity-60',
          )}
        >
          {!ready ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : playing ? (
            <Pause className="h-4 w-4 fill-current" />
          ) : (
            <Play className="ml-0.5 h-4 w-4 fill-current" />
          )}
        </button>

        <div
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          tabIndex={0}
          onClick={seek}
          onKeyDown={(e) => {
            const audio = audioRef.current
            if (!audio || !duration) return
            if (e.key === 'ArrowRight') audio.currentTime = Math.min(duration, audio.currentTime + 2)
            if (e.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 2)
          }}
          className="flex h-9 min-w-0 flex-1 cursor-pointer items-center gap-[2px] px-0.5"
        >
          {bars.map((h, i) => {
            const barProgress = i / bars.length
            const played = barProgress <= progress
            return (
              <span
                key={i}
                className={cn(
                  'w-[3px] shrink-0 rounded-full transition-colors',
                  played
                    ? isOutbound
                      ? 'bg-[#008069]/80 dark:bg-[#53bdeb]'
                      : 'bg-[#8696a0]'
                    : isOutbound
                      ? 'bg-[#008069]/35 dark:bg-[#53bdeb]/40'
                      : 'bg-[#c5cdd0] dark:bg-[#3b4a54]',
                )}
                style={{ height: `${Math.max(4, h * 28)}px` }}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-0.5 flex items-center justify-end gap-1 pr-0.5">
        <span className="text-[11px] tabular-nums text-[#667781] dark:text-[#8696a0]">
          {displayDuration}
        </span>
        {footer}
      </div>
    </div>
  )
}
