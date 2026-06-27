'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Link2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getOrCreateDeviceKey } from '@/lib/auth/device-id'
import { deviceLabelFromUserAgent } from '@/lib/auth/device-label'

export default function LinkDevicePage() {
  return (
    <Suspense fallback={null}>
      <LinkDevicePageInner />
    </Suspense>
  )
}

function LinkDevicePageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [code, setCode] = useState(searchParams.get('code')?.toUpperCase() ?? '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const redeem = useCallback(async (linkCode: string) => {
    setError(null)
    setLoading(true)
    try {
      const device_key = getOrCreateDeviceKey()
      const res = await fetch('/api/auth/linked-devices/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: linkCode.trim().toUpperCase(),
          device_key,
          device_label: deviceLabelFromUserAgent(navigator.userAgent),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Link failed')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link failed')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    const fromUrl = searchParams.get('code')
    if (fromUrl && fromUrl.length >= 6) {
      void redeem(fromUrl.toUpperCase())
    }
    // Auto-link once when opened via QR / copied URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length < 6) {
      setError('Enter the 8-character code from your other device.')
      return
    }
    void redeem(code)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10">
            <Link2 className="h-6 w-6 text-[#25D366]" />
          </div>
          <CardTitle className="text-xl text-foreground">Link device</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter the code shown on your phone or primary browser to log in here
            — like WhatsApp Web.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="code" className="text-muted-foreground">
                Link code
              </Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3D4"
                maxLength={12}
                autoComplete="one-time-code"
                className="border-border bg-muted text-center font-mono text-lg tracking-widest text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full bg-[#25D366] text-white hover:bg-[#20bd5a]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Linking…
                </>
              ) : (
                'Link this browser'
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:text-primary/80">
              Sign in with email instead
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
