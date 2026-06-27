'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WhatsAppChannel } from '@/types'

export function useWhatsAppChannels() {
  const [channels, setChannels] = useState<WhatsAppChannel[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/inbox/channels')
      const data = await res.json()
      if (res.ok) setChannels(data.channels ?? [])
    } catch (err) {
      console.error('[useWhatsAppChannels] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createChannel = useCallback(
    async (payload: {
      name: string
      description?: string
      invite_link?: string
      follower_count?: number
    }) => {
      const res = await fetch('/api/inbox/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create channel')
      await refresh()
      return data.channel as WhatsAppChannel
    },
    [refresh],
  )

  const updateChannel = useCallback(
    async (
      id: string,
      payload: Partial<
        Pick<
          WhatsAppChannel,
          'name' | 'description' | 'invite_link' | 'follower_count' | 'is_active'
        >
      >,
    ) => {
      const res = await fetch(`/api/inbox/channels/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update channel')
      await refresh()
      return data.channel as WhatsAppChannel
    },
    [refresh],
  )

  const deleteChannel = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/inbox/channels/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to delete channel')
      }
      await refresh()
    },
    [refresh],
  )

  return {
    channels,
    loading,
    refresh,
    createChannel,
    updateChannel,
    deleteChannel,
  }
}
