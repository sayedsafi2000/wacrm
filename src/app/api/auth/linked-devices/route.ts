import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface LinkedDeviceRow {
  id: string
  user_id: string
  device_key: string
  device_label: string
  user_agent: string | null
  last_seen_at: string
  created_at: string
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentKey = request.headers.get('x-device-key')

    const { data, error } = await supabase
      .from('linked_devices')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('[linked-devices] list failed:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const devices = (data ?? []).map((d) => ({
      ...d,
      is_current: currentKey ? d.device_key === currentKey : false,
    }))

    return NextResponse.json({ devices })
  } catch (err) {
    console.error('[linked-devices] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
