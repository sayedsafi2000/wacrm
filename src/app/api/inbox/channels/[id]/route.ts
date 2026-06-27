import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/inbox/account-context'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'No account linked' }, { status: 403 })
    }

    const body = await request.json()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

    if (typeof body.name === 'string' && body.name.trim()) {
      update.name = body.name.trim()
    }
    if (typeof body.description === 'string') {
      update.description = body.description.trim() || null
    }
    if (typeof body.invite_link === 'string') {
      update.invite_link = body.invite_link.trim() || null
    }
    if (typeof body.follower_count === 'number') {
      update.follower_count = body.follower_count
    }
    if (typeof body.is_active === 'boolean') {
      update.is_active = body.is_active
    }

    const { data, error } = await supabase
      .from('whatsapp_channels')
      .update(update)
      .eq('id', id)
      .eq('account_id', accountId)
      .select('*')
      .single()

    if (error) {
      console.error('[inbox/channels] update failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ channel: data })
  } catch (err) {
    console.error('[inbox/channels] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = await resolveAccountId(supabase, user.id)
    if (!accountId) {
      return NextResponse.json({ error: 'No account linked' }, { status: 403 })
    }

    const { error } = await supabase
      .from('whatsapp_channels')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId)

    if (error) {
      console.error('[inbox/channels] delete failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[inbox/channels] DELETE error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
