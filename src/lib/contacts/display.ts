/** Display-friendly phone formatting (E.164-ish). */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length >= 12) {
    const local = digits.slice(3)
    return `+880 ${local.slice(0, 4)} ${local.slice(4)}`.trim()
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+880 ${digits.slice(1, 5)} ${digits.slice(5)}`.trim()
  }
  if (phone.startsWith('+')) return phone
  return digits ? `+${digits}` : phone
}

export function contactInitials(name?: string | null, phone?: string): string {
  const n = name?.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return n.charAt(0).toUpperCase()
  }
  return phone?.replace(/\D/g, '').slice(-2) || '?'
}

export function contactStatusPreview(
  statusText?: string | null,
  lastMessage?: string | null,
): string | null {
  const status = statusText?.trim()
  if (status) return status
  const msg = lastMessage?.trim()
  if (msg) return msg
  return null
}

export function hasRecentStatus(
  statusUpdatedAt?: string | null,
  hours = 24,
): boolean {
  if (!statusUpdatedAt) return false
  const t = new Date(statusUpdatedAt).getTime()
  return Date.now() - t < hours * 60 * 60 * 1000
}
