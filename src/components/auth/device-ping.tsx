'use client'

import { useEffect } from 'react'
import { getOrCreateDeviceKey } from '@/lib/auth/device-id'
import { deviceLabelFromUserAgent } from '@/lib/auth/device-label'

/** Registers this browser in linked_devices (Settings → Linked devices). */
export function DevicePing() {
  useEffect(() => {
    const device_key = getOrCreateDeviceKey()
    void fetch('/api/auth/linked-devices/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_key,
        device_label: deviceLabelFromUserAgent(navigator.userAgent),
      }),
    }).catch(() => {})
  }, [])

  return null
}
