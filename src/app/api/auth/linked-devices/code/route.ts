import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/flows/admin-client'
import { generateLinkCode } from '@/lib/auth/link-code'

const CODE_TTL_MS = 5 * 60 * 1000

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = supabaseAdmin()
    const expires_at = new Date(Date.now() + CODE_TTL_MS).toISOString()

    // Retry on rare code collision.
    let code = generateLinkCode()
    for (let attempt = 0; attempt < 3; attempt++) {
      const { error } = await admin.from('device_link_codes').insert({
        user_id: user.id,
        code,
        expires_at,
      })
      if (!error) break
      if (error.code !== '23505') {
        console.error('[linked-devices] code insert failed:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      code = generateLinkCode()
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000')

    const link_url = `${origin}/link-device?code=${code}`

    return NextResponse.json({
      code,
      link_url,
      expires_at,
      expires_in_seconds: CODE_TTL_MS / 1000,
    })
  } catch (err) {
    console.error('[linked-devices] code error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
