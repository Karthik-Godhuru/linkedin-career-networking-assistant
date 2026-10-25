import {
  MEDIA_LIMITS,
  type FileValidationResult,
} from '../types/mediaAsset'

/**
 * Validates a candidate upload file against format, MIME type, and size limits.
 * - Allowed Images: JPG, JPEG, PNG, WebP (max 10MB)
 * - Allowed Videos: MP4, WebM (max 50MB)
 */
export function validateMediaFile(file: {
  name: string
  size: number
  type: string
}): FileValidationResult {
  const name = file.name.toLowerCase()
  const size = file.size
  const mimeType = file.type.toLowerCase()

  // 1. Verify extension
  const matchesExt = MEDIA_LIMITS.ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!matchesExt) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${MEDIA_LIMITS.ALLOWED_EXTENSIONS.join(', ')}`,
    }
  }

  // 2. Identify media category and check MIME type
  const isImageMime = (MEDIA_LIMITS.ALLOWED_IMAGE_TYPES as readonly string[]).includes(mimeType)
  const isVideoMime = (MEDIA_LIMITS.ALLOWED_VIDEO_TYPES as readonly string[]).includes(mimeType)

  const isImageExt = ['.jpg', '.jpeg', '.png', '.webp'].some((ext) => name.endsWith(ext))
  const isVideoExt = ['.mp4', '.webm'].some((ext) => name.endsWith(ext))

  if (!isImageMime && !isVideoMime && !isImageExt && !isVideoExt) {
    return {
      valid: false,
      error: 'File type could not be verified. Please upload a standard JPG, PNG, WebP, MP4, or WebM file.',
    }
  }

  const mediaType: 'image' | 'video' = isVideoMime || isVideoExt ? 'video' : 'image'

  // 3. Verify size constraints
  if (size <= 0) {
    return {
      valid: false,
      error: 'File is empty (0 bytes).',
    }
  }

  if (mediaType === 'image' && size > MEDIA_LIMITS.MAX_IMAGE_SIZE_BYTES) {
    const limitMb = MEDIA_LIMITS.MAX_IMAGE_SIZE_BYTES / (1024 * 1024)
    return {
      valid: false,
      error: `Image exceeds maximum permitted size of ${limitMb}MB.`,
      mediaType,
    }
  }

  if (mediaType === 'video' && size > MEDIA_LIMITS.MAX_VIDEO_SIZE_BYTES) {
    const limitMb = MEDIA_LIMITS.MAX_VIDEO_SIZE_BYTES / (1024 * 1024)
    return {
      valid: false,
      error: `Video exceeds maximum permitted size of ${limitMb}MB.`,
      mediaType,
    }
  }

  return {
    valid: true,
    mediaType,
  }
}

/**
 * Validates that adding new attachments does not exceed the per-post limit.
 */
export function validateAttachmentCount(
  currentCount: number,
  addingCount: number
): { valid: boolean; error?: string } {
  const total = currentCount + addingCount
  if (total > MEDIA_LIMITS.MAX_FILES_PER_POST) {
    return {
      valid: false,
      error: `Maximum ${MEDIA_LIMITS.MAX_FILES_PER_POST} attachments allowed per post draft (currently ${currentCount}, attempting to add ${addingCount}).`,
    }
  }
  return { valid: true }
}

/**
 * Formats bytes into a human-readable string (e.g. 1.2 MB).
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Sanitizes an uploaded filename to prevent directory traversal or malformed characters.
 */
export function sanitizeFileName(fileName: string): string {
  const parts = fileName.split('.')
  const ext = parts.length > 1 ? parts.pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const baseName = parts.join('.').replace(/[^a-zA-Z0-9_-]/g, '_')
  const cleanBase = baseName.substring(0, 40) || 'media'
  return ext ? `${cleanBase}.${ext}` : cleanBase
}

/**
 * Generates an isolated user storage path:
 * <userId>/<postId>/<timestamp>-<sanitizedFileName>
 * This strictly enforces user tenant isolation in Supabase Storage RLS policies.
 */
export function generateStoragePath(
  userId: string,
  postId: string,
  fileName: string
): string {
  const cleanName = sanitizeFileName(fileName)
  const timestamp = Date.now()
  return `${userId}/${postId}/${timestamp}-${cleanName}`
}

/**
 * Standard RFC4122 v4 compliant UUID generator.
 * Uses native crypto.randomUUID when available, with deterministic fallback.
 */
export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
