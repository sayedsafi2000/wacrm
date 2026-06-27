'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Copy, Laptop, Link2, Loader2, LogOut, QrCode, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateDeviceKey } from '@/lib/auth/device-id'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DeviceRow {
  id: string
  device_key: string
  device_label: string
  last_seen_at: string
  is_current?: boolean
}

interface LinkCodePayload {
  code: string
  link_url: string
  expires_at: string
  expires_in_seconds: number
}

export function LinkedDevicesCard() {
  const deviceKey = getOrCreateDeviceKey()
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkPayload, setLinkPayload] = useState<LinkCodePayload | null>(null)
  const [generating, setGenerating] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/linked-devices', {
        headers: { 'x-device-key': deviceKey },
      })
      const data = await res.json()
      if (res.ok) setDevices(data.devices ?? [])
    } catch (err) {
      console.error('[LinkedDevicesCard] load failed:', err)
    } finally {
      setLoading(false)
    }
  }, [deviceKey])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  const generateCode = useCallback(async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/auth/linked-devices/code', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate code')
      setLinkPayload(data)
      setLinkOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate code')
    } finally {
      setGenerating(false)
    }
  }, [])

  const copyCode = useCallback(() => {
    if (!linkPayload) return
    void navigator.clipboard.writeText(linkPayload.code)
    toast.success('Code copied')
  }, [linkPayload])

  const copyLink = useCallback(() => {
    if (!linkPayload) return
    void navigator.clipboard.writeText(linkPayload.link_url)
    toast.success('Link copied')
  }, [linkPayload])

  const removeDevice = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/auth/linked-devices/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Could not remove device')
        return
      }
      toast.success('Device removed from list')
      void loadDevices()
    },
    [loadDevices],
  )

  const signOutEverywhere = useCallback(async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      if (error) throw error
      window.location.href = '/login'
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign-out failed')
    } finally {
      setSigningOut(false)
    }
  }, [])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Link2 className="size-4 text-[#25D366]" />
            Linked devices
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Link this CRM in another browser — like WhatsApp Web. Generate a
            code on this device, then enter it on the other browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            onClick={() => void generateCode()}
            disabled={generating}
            className="bg-[#25D366] hover:bg-[#20bd5a]"
          >
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <QrCode className="size-4" />
            )}
            Link a device
          </Button>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">This account</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void loadDevices()}
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No linked browsers yet. This device will appear here after you
              refresh.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Laptop className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {d.device_label}
                      {d.is_current && (
                        <span className="ml-2 text-xs font-normal text-[#25D366]">
                          · This device
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last active{' '}
                      {formatDistanceToNow(new Date(d.last_seen_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  {!d.is_current && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={() => void removeDevice(d.id)}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={signingOut}
              onClick={() => void signOutEverywhere()}
            >
              {signingOut ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
              Log out of all devices
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Link a device</DialogTitle>
            <DialogDescription>
              On the other browser, open{' '}
              <strong className="text-foreground">Link device</strong> from the
              login page and enter this code. Expires in 5 minutes.
            </DialogDescription>
          </DialogHeader>

          {linkPayload && (
            <div className="space-y-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(linkPayload.link_url)}`}
                  alt="QR code to link device"
                  width={220}
                  height={220}
                  className="rounded-lg border border-border"
                />
              </div>

              <div className="rounded-xl bg-muted px-4 py-5 text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Link code
                </p>
                <p className="mt-1 font-mono text-3xl font-bold tracking-[0.35em] text-foreground">
                  {linkPayload.code}
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={copyCode}>
                  <Copy className="mr-1 size-4" />
                  Copy code
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={copyLink}>
                  <Copy className="mr-1 size-4" />
                  Copy link
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={generating}
                onClick={() => void generateCode()}
              >
                Generate new code
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
