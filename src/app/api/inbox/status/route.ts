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

    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('status_updates')
      .select('*')
      .eq('account_id', accountId)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[inbox/status] list failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ statuses: data ?? [] })
  } catch (err) {
    console.error('[inbox/status] GET error:', err)
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
    const content_type = body.content_type as string
    if (!['text', 'image', 'video'].includes(content_type)) {
      return NextResponse.json({ error: 'Invalid content_type' }, { status: 400 })
    }

    const content_text =
      typeof body.content_text === 'string' ? body.content_text.trim() : null
    const media_url =
      typeof body.media_url === 'string' ? body.media_url.trim() : null
    const background_color =
      typeof body.background_color === 'string' ? body.background_color : null

    if (content_type === 'text' && !content_text) {
      return NextResponse.json({ error: 'Text status requires content_text' }, { status: 400 })
    }
    if ((content_type === 'image' || content_type === 'video') && !media_url) {
      return NextResponse.json({ error: 'Media status requires media_url' }, { status: 400 })
    }

    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('status_updates')
      .insert({
        account_id: accountId,
        author_id: user.id,
        content_type,
        content_text,
        media_url,
        background_color,
        expires_at,
      })
      .select('*')
      .single()

    if (error) {
      console.error('[inbox/status] insert failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ status: data })
  } catch (err) {
    console.error('[inbox/status] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
