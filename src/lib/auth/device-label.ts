/** Parse a readable device label from User-Agent (best-effort). */
export function deviceLabelFromUserAgent(ua: string | null | undefined): string {
  if (!ua) return 'Browser'

  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua)
  let browser = 'Browser'
  if (/Edg\//i.test(ua)) browser = 'Edge'
  else if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome'
  else if (/Firefox/i.test(ua)) browser = 'Firefox'
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari'

  let os = ''
  if (/Windows/i.test(ua)) os = 'Windows'
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'Mac'
  else if (/Android/i.test(ua)) os = 'Android'
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS'
  else if (/Linux/i.test(ua)) os = 'Linux'

  const form = isMobile ? 'Mobile' : 'Desktop'
  return os ? `${browser} · ${os} (${form})` : `${browser} (${form})`
}
