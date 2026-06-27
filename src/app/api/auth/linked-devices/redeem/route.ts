import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { deviceLabelFromUserAgent } from '@/lib/auth/device-label'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const code =
      typeof body.code === 'string' ? body.code.trim().toUpperCase() : ''
    const device_key =
      typeof body.device_key === 'string' ? body.device_key.trim() : ''

    if (!code || code.length < 6 || code.length > 12) {
      return NextResponse.json({ error: 'Invalid link code' }, { status: 400 })
    }
    if (!device_key) {
      return NextResponse.json({ error: 'device_key required' }, { status: 400 })
    }

    const admin = supabaseAdmin()
    const now = new Date().toISOString()

    const { data: linkRow, error: fetchErr } = await admin
      .from('device_link_codes')
      .select('*')
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', now)
      .maybeSingle()

    if (fetchErr) {
      console.error('[linked-devices] redeem lookup failed:', fetchErr)
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }
    if (!linkRow) {
      return NextResponse.json(
        { error: 'Code expired or invalid. Generate a new code on your phone.' },
        { status: 400 },
      )
    }

    const { data: userData, error: userErr } =
      await admin.auth.admin.getUserById(linkRow.user_id)

    if (userErr || !userData.user?.email) {
      console.error('[linked-devices] getUserById failed:', userErr)
      return NextResponse.json({ error: 'User not found' }, { status: 500 })
    }

    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: userData.user.email,
      })

    const tokenHash = linkData?.properties?.hashed_token
    if (linkErr || !tokenHash) {
      console.error('[linked-devices] generateLink failed:', linkErr)
      return NextResponse.json(
        { error: 'Could not create login session' },
        { status: 500 },
      )
    }

    await admin
      .from('device_link_codes')
      .update({ used_at: now })
      .eq('id', linkRow.id)

    const ua = request.headers.get('user-agent')
    const device_label = deviceLabelFromUserAgent(ua)

    await admin.from('linked_devices').upsert(
      {
        user_id: linkRow.user_id,
        device_key,
        device_label,
        user_agent: ua,
        last_seen_at: now,
      },
      { onConflict: 'user_id,device_key' },
    )

    const supabase = await createClient()
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash,
    })

    if (verifyErr) {
      console.error('[linked-devices] verifyOtp failed:', verifyErr)
      return NextResponse.json({ error: verifyErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[linked-devices] redeem error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
