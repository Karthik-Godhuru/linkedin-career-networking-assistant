/**
 * Normalizes a profile URL to prevent duplicates caused by protocol,
 * www subdomains, tracking query params, and trailing slashes.
 */
export function normalizeProfileUrl(url: string): string {
  if (!url) return ''

  let cleaned = url.trim().toLowerCase()

  // Remove protocol
  cleaned = cleaned.replace(/^https?:\/\//, '')

  // Remove www.
  cleaned = cleaned.replace(/^www\./, '')

  // Remove query params and hash fragments (e.g. ?trk=..., #...)
  cleaned = cleaned.split('?')[0].split('#')[0]

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '')

  return cleaned
}

/**
 * Computes a fast 32-character hex hash from a string.
 * Uses Web Crypto API when available, with a fast fallback.
 */
export async function computeDuplicateHash(url: string): Promise<string> {
  const normalized = normalizeProfileUrl(url)

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(normalized)
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fallback if subtle crypto is restricted
    }
  }

  // Pure JavaScript deterministic 32-bit FNV-1a hash fallback formatted to hex
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0')
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0')
  return `${hex1}${hex2}${hex1}${hex2}`
}
