import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  canDeleteForEveryone,
  canDeleteForMe,
} from '@/lib/inbox/message-delete'
import type { Message } from '@/types'

type DeleteScope = 'me' | 'everyone'

/**
 * POST /api/whatsapp/messages/[id]/delete
 *
 * Body: { scope: 'me' | 'everyone' }
 *
 * • me — hide the message for the calling agent only
 * • everyone — soft-delete for the whole account (WhatsApp-style
 *   placeholder). Only outbound agent/bot messages within 48h.
 *
 * Note: Meta WhatsApp Cloud API does not expose a public "delete for
 * everyone on the customer's phone" endpoint; this removes the message
 * from the shared CRM inbox for all teammates.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: messageId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_id, account_role')
      .eq('user_id', user.id)
      .maybeSingle()

    const accountId = profile?.account_id as string | undefined
    if (!accountId) {
      return NextResponse.json(
        { error: 'Your profile is not linked to an account.' },
        { status: 403 },
      )
    }

    const role = profile?.account_role as string | undefined
    if (role === 'viewer') {
      return NextResponse.json(
        { error: 'Your role cannot delete messages.' },
        { status: 403 },
      )
    }

    const body = (await request.json()) as { scope?: DeleteScope }
    const scope = body.scope
    if (scope !== 'me' && scope !== 'everyone') {
      return NextResponse.json(
        { error: 'scope must be "me" or "everyone"' },
        { status: 400 },
      )
    }

    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select(
        'id, conversation_id, sender_type, message_id, created_at, deleted_at, conversation:conversations!inner(account_id)',
      )
      .eq('id', messageId)
      .maybeSingle()

    if (msgError || !message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const conv = message.conversation as { account_id: string } | null
    if (!conv || conv.account_id !== accountId) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const row = message as Message

    if (scope === 'me') {
      if (!canDeleteForMe(row)) {
        return NextResponse.json(
          { error: 'Message already deleted for everyone.' },
          { status: 400 },
        )
      }

      const { error: hideErr } = await supabase
        .from('message_user_hides')
        .insert({ message_id: messageId, user_id: user.id })

      if (hideErr && !/duplicate|23505/i.test(hideErr.message)) {
        return NextResponse.json(
          { error: hideErr.message || 'Failed to hide message' },
          { status: 500 },
        )
      }

      return NextResponse.json({ ok: true, scope: 'me' })
    }

    if (!canDeleteForEveryone(row)) {
      return NextResponse.json(
        {
          error:
            'Delete for everyone is only available on messages you sent within the last 48 hours.',
        },
        { status: 400 },
      )
    }

    const deletedAt = new Date().toISOString()
    const { data: updated, error: updErr } = await supabase
      .from('messages')
      .update({
        deleted_at: deletedAt,
        deleted_by: user.id,
        content_text: null,
        media_url: null,
        template_name: null,
      })
      .eq('id', messageId)
      .select('id, deleted_at')
      .single()

    if (updErr || !updated) {
      return NextResponse.json(
        { error: updErr?.message || 'Failed to delete message' },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      scope: 'everyone',
      deleted_at: updated.deleted_at,
    })
  } catch (err) {
    console.error('[messages/delete]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    )
  }
}
