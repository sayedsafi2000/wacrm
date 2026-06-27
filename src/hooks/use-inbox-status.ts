'use client'

import { useCallback, useEffect, useState } from 'react'
import type { StatusUpdate } from '@/types'

export function useInboxStatus() {
  const [statuses, setStatuses] = useState<StatusUpdate[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/status')
      const data = await res.json()
      if (res.ok) setStatuses(data.statuses ?? [])
    } catch (err) {
      console.error('[useInboxStatus] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createStatus = useCallback(
    async (payload: {
      content_type: 'text' | 'image' | 'video'
      content_text?: string
      media_url?: string
      background_color?: string
    }) => {
      const res = await fetch('/api/inbox/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to post status')
      await refresh()
      return data.status as StatusUpdate
    },
    [refresh],
  )

  const deleteStatus = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/inbox/status/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete status')
      }
      await refresh()
    },
    [refresh],
  )

  return { statuses, loading, refresh, createStatus, deleteStatus }
}
