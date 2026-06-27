import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deviceLabelFromUserAgent } from '@/lib/auth/device-label'

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

    const body = await request.json().catch(() => ({}))
    const device_key =
      typeof body.device_key === 'string' ? body.device_key.trim() : ''
    if (!device_key || device_key.length > 128) {
      return NextResponse.json({ error: 'device_key required' }, { status: 400 })
    }

    const ua = request.headers.get('user-agent')
    const device_label =
      typeof body.device_label === 'string' && body.device_label.trim()
        ? body.device_label.trim().slice(0, 120)
        : deviceLabelFromUserAgent(ua)

    const { data, error } = await supabase
      .from('linked_devices')
      .upsert(
        {
          user_id: user.id,
          device_key,
          device_label,
          user_agent: ua,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_key' },
      )
      .select('*')
      .single()

    if (error) {
      console.error('[linked-devices] ping failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ device: data })
  } catch (err) {
    console.error('[linked-devices] ping error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
