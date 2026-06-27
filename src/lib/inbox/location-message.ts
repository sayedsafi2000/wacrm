export interface LocationPayload {
  latitude: number
  longitude: number
  name?: string
  address?: string
}

export function formatLocationContent(loc: LocationPayload): string {
  return JSON.stringify({
    latitude: loc.latitude,
    longitude: loc.longitude,
    name: loc.name || undefined,
    address: loc.address || undefined,
  })
}

/** Parse location from JSON (outbound) or legacy webhook text (inbound). */
export function parseLocationContent(
  text: string | null | undefined,
): LocationPayload | null {
  if (!text?.trim()) return null

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    const lat = Number(parsed.latitude)
    const lng = Number(parsed.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        latitude: lat,
        longitude: lng,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
        address:
          typeof parsed.address === 'string' ? parsed.address : undefined,
      }
    }
  } catch {
    // fall through — inbound webhook text format
  }

  const coordMatch = text.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/)
  if (!coordMatch) return null

  const latitude = Number(coordMatch[1])
  const longitude = Number(coordMatch[2])
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null

  const prefix = text.slice(0, coordMatch.index).replace(/\s*-\s*$/, '').trim()
  const parts = prefix ? prefix.split(' - ').map((p) => p.trim()) : []

  return {
    latitude,
    longitude,
    name: parts[0] || undefined,
    address: parts.slice(1).join(' - ') || undefined,
  }
}

export function mapsUrl(loc: LocationPayload): string {
  return `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
}

export function locationPreviewLabel(loc: LocationPayload): string {
  return loc.name || loc.address || `${loc.latitude}, ${loc.longitude}`
}
