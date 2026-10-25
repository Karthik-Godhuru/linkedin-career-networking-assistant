import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { generateStoragePath } from './mediaValidationService'
import { extractErrorMessage } from '../hooks/useCareerProfile'

export const POST_MEDIA_BUCKET = 'post-media'

export interface StorageUploadResult {
  success: boolean
  storagePath?: string
  error?: string
}

/**
 * Uploads a validated media file to the private Supabase Storage bucket
 * under the user's isolated directory: `<userId>/<postId>/<timestamp>-<name>`.
 */
export async function uploadMediaFile(
  userId: string,
  postId: string,
  file: File
): Promise<StorageUploadResult> {
  if (!isSupabaseConfigured()) {
    // Mock upload in offline/unconnected mode: return a local mock storage path
    const mockPath = generateStoragePath(userId, postId, file.name)
    return { success: true, storagePath: mockPath }
  }

  const storagePath = generateStoragePath(userId, postId, file.name)

  try {
    const { error } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      })

    if (error) {
      return {
        success: false,
        error: extractErrorMessage(error, 'Failed to upload file to storage'),
      }
    }

    return {
      success: true,
      storagePath,
    }
  } catch (err: unknown) {
    return {
      success: false,
      error: extractErrorMessage(err, 'Storage upload encountered an unexpected error'),
    }
  }
}

/**
 * Deletes a file from the private Supabase Storage bucket.
 */
export async function deleteMediaFile(storagePath: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !storagePath) {
    return true
  }

  try {
    const { error } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .remove([storagePath])

    return !error
  } catch {
    return false
  }
}

/**
 * Generates an expiring signed URL for a private storage object.
 * Does not store signed URLs in the database; always resolves dynamically.
 */
export async function getSignedPreviewUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string | null> {
  if (!storagePath) return null

  if (!isSupabaseConfigured()) {
    return null
  }

  try {
    const { data, error } = await supabase.storage
      .from(POST_MEDIA_BUCKET)
      .createSignedUrl(storagePath, expiresInSeconds)

    if (error || !data) return null
    return data.signedUrl
  } catch {
    return null
  }
}
