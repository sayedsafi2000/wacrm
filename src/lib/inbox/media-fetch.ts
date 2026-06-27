/** True when the URL is our authenticated Meta media proxy. */
export function isWhatsAppMediaProxy(url: string): boolean {
  return url.startsWith('/api/whatsapp/media/')
}

export async function fetchMediaBlob(
  url: string,
): Promise<{ blob: Blob; contentType: string }> {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    throw new Error(`Failed to load media (${res.status})`)
  }
  const blob = await res.blob()
  return {
    blob,
    contentType: res.headers.get('content-type') || blob.type || 'application/octet-stream',
  };
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export async function downloadMediaUrl(
  url: string,
  filename: string,
): Promise<void> {
  if (isWhatsAppMediaProxy(url)) {
    const { blob } = await fetchMediaBlob(url)
    triggerBlobDownload(blob, filename)
    return
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  triggerBlobDownload(blob, filename)
}
