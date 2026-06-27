import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveAccountId } from '@/lib/inbox/account-context'

export async function GET() {
  try {
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

    const { data, error } = await supabase
      .from('whatsapp_channels')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[inbox/channels] list failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ channels: data ?? [] })
  } catch (err) {
    console.error('[inbox/channels] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
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
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ error: 'Channel name is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('whatsapp_channels')
      .insert({
        account_id: accountId,
        name,
        description:
          typeof body.description === 'string' ? body.description.trim() : null,
        invite_link:
          typeof body.invite_link === 'string' ? body.invite_link.trim() : null,
        follower_count:
          typeof body.follower_count === 'number' ? body.follower_count : 0,
        created_by: user.id,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[inbox/channels] insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ channel: data })
  } catch (err) {
    console.error('[inbox/channels] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
