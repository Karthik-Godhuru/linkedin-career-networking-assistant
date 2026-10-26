/**
 * Cryptographic helpers for LinkedIn OAuth 2.0 & Token Security.
 * Uses the standard Web Crypto API (supported natively in Deno, Node.js 18+, and modern browsers).
 *
 * All encrypted tokens use a documented, versioned self-contained envelope:
 *   v1:<iv_base64>:<ciphertext_tag_base64>
 * This guarantees that every token (access token, refresh token) retains its own
 * unique 12-byte initialization vector (IV) and 16-byte authentication tag.
 */

export function generateOAuthState(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function hashOAuthState(state: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(state)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const secretBytes = encoder.encode(secret)
  const keyMaterial = await crypto.subtle.digest('SHA-256', secretBytes)
  return crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

export interface EncryptedTokenResult {
  /** Documented, versioned representation: v1:<iv_base64>:<ciphertext_tag_base64> */
  encrypted: string
  /** 12-byte initialization vector in base64 */
  iv: string
  /** Ciphertext including 16-byte GCM authentication tag in base64 */
  ciphertext: string
  /** Schema version */
  version: 'v1'
}

export async function encryptToken(
  plaintext: string,
  secretKey: string
): Promise<EncryptedTokenResult> {
  if (!plaintext) {
    throw new Error('Plaintext cannot be empty')
  }
  if (!secretKey) {
    throw new Error('Encryption secret cannot be empty')
  }

  const key = await deriveKey(secretKey)
  const ivBuffer = new ArrayBuffer(12)
  const iv = new Uint8Array(ivBuffer)
  crypto.getRandomValues(iv)

  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    data
  )

  const ivBase64 = bufferToBase64(iv)
  const ciphertextBase64 = bufferToBase64(ciphertextBuffer)
  const version = 'v1'
  const packed = `${version}:${ivBase64}:${ciphertextBase64}`

  return {
    encrypted: packed,
    iv: ivBase64,
    ciphertext: ciphertextBase64,
    version,
  }
}

export async function decryptToken(
  encryptedPayload: string,
  secretKeyOrIv: string,
  optionalSecretKey?: string
): Promise<string> {
  if (!encryptedPayload) {
    throw new Error('Encrypted payload is required')
  }

  let ciphertextBase64: string
  let ivBase64: string
  let secretKey: string

  if (optionalSecretKey) {
    // 3-argument legacy signature: decryptToken(ciphertext, iv, secretKey)
    ciphertextBase64 = encryptedPayload
    ivBase64 = secretKeyOrIv
    secretKey = optionalSecretKey
  } else {
    // 2-argument signature: decryptToken(v1:iv:ciphertext, secretKey)
    secretKey = secretKeyOrIv
    if (encryptedPayload.startsWith('v1:')) {
      const parts = encryptedPayload.split(':')
      if (parts.length !== 3) {
        throw new Error('Invalid versioned token format. Expected v1:<iv>:<ciphertext>')
      }
      ivBase64 = parts[1]
      ciphertextBase64 = parts[2]
    } else {
      throw new Error('Invalid encrypted token envelope. Missing v1: prefix.')
    }
  }

  if (!secretKey) {
    throw new Error('Encryption secret cannot be empty')
  }
  if (!ivBase64 || !ciphertextBase64) {
    throw new Error('Encrypted payload and IV are required')
  }

  const key = await deriveKey(secretKey)
  const iv = base64ToBuffer(ivBase64)
  const ciphertext = base64ToBuffer(ciphertextBase64)

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}
