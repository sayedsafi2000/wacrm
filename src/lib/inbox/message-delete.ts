import type { Message } from '@/types'

/** WhatsApp Business delete-for-everyone window (approx.). */
export const DELETE_FOR_EVERYONE_MAX_MS = 48 * 60 * 60 * 1000

export function isMessageDeleted(message: Pick<Message, 'deleted_at'>): boolean {
  return message.deleted_at != null
}

/** Outbound messages you sent can be revoked for the whole team within the window. */
export function canDeleteForEveryone(
  message: Pick<
    Message,
    'id' | 'sender_type' | 'message_id' | 'created_at' | 'deleted_at'
  >,
): boolean {
  if (isMessageDeleted(message)) return false
  if (message.sender_type !== 'agent' && message.sender_type !== 'bot') {
    return false
  }
  if (!message.message_id || message.id.startsWith('temp-')) return false
  const age = Date.now() - new Date(message.created_at).getTime()
  return age <= DELETE_FOR_EVERYONE_MAX_MS
}

export function canDeleteForMe(
  message: Pick<Message, 'deleted_at'>,
): boolean {
  return !isMessageDeleted(message)
}
