import { describe, expect, it } from 'vitest'
import {
  canDeleteForEveryone,
  canDeleteForMe,
  DELETE_FOR_EVERYONE_MAX_MS,
} from './message-delete'
import type { Message } from '@/types'

const base: Message = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  sender_type: 'agent',
  content_type: 'text',
  content_text: 'hello',
  message_id: 'wamid.abc',
  status: 'sent',
  created_at: new Date().toISOString(),
}

describe('canDeleteForEveryone', () => {
  it('allows recent outbound messages with a Meta id', () => {
    expect(canDeleteForEveryone(base)).toBe(true)
  })

  it('blocks customer messages', () => {
    expect(
      canDeleteForEveryone({ ...base, sender_type: 'customer' }),
    ).toBe(false)
  })

  it('blocks messages older than 48h', () => {
    const old = new Date(Date.now() - DELETE_FOR_EVERYONE_MAX_MS - 1000)
    expect(
      canDeleteForEveryone({ ...base, created_at: old.toISOString() }),
    ).toBe(false)
  })

  it('blocks already-deleted messages', () => {
    expect(
      canDeleteForEveryone({
        ...base,
        deleted_at: new Date().toISOString(),
      }),
    ).toBe(false)
  })
})

describe('canDeleteForMe', () => {
  it('allows non-deleted messages', () => {
    expect(canDeleteForMe(base)).toBe(true)
  })

  it('blocks messages deleted for everyone', () => {
    expect(
      canDeleteForMe({ ...base, deleted_at: new Date().toISOString() }),
    ).toBe(false)
  })
})
