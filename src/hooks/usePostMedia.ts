import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import { useAuth } from './useAuth'
import { extractErrorMessage } from './useCareerProfile'
import type { MediaAssetRecord } from '../types/mediaAsset'
import {
  validateMediaFile,
  validateAttachmentCount,
  generateUuid,
} from '../services/mediaValidationService'
import {
  uploadMediaFile,
  deleteMediaFile,
  getSignedPreviewUrl,
} from '../services/storageService'

const LOCAL_MEDIA_STORAGE_KEY_PREFIX = 'linkedin_assistant_mock_media_'

function getLocalAssets(postId: string): MediaAssetRecord[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_MEDIA_STORAGE_KEY_PREFIX}${postId}`)
    if (raw) return JSON.parse(raw)
  } catch {
    // Ignore storage parse errors
  }
  return []
}

function saveLocalAssets(postId: string, assets: MediaAssetRecord[]) {
  try {
    localStorage.setItem(
      `${LOCAL_MEDIA_STORAGE_KEY_PREFIX}${postId}`,
      JSON.stringify(assets)
    )
  } catch {
    // Ignore storage save errors
  }
}

export interface UsePostMediaOptions {
  isExistingPost?: boolean
}

export function usePostMedia(
  postId: string | null,
  options: UsePostMediaOptions = {}
) {
  const { isExistingPost = false } = options
  const { user } = useAuth()
  const [persistedAssets, setPersistedAssets] = useState<MediaAssetRecord[]>([])
  const [stagedAssets, setStagedAssets] = useState<MediaAssetRecord[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Combined media assets list (persisted from DB + staged in-memory for new post drafts)
  const mediaAssets = useMemo(
    () => [...persistedAssets, ...stagedAssets],
    [persistedAssets, stagedAssets]
  )

  const loadAssets = useCallback(async () => {
    if (!postId || !user) {
      setPersistedAssets([])
      setLoading(false)
      return
    }

    if (!isSupabaseConfigured()) {
      setPersistedAssets(getLocalAssets(postId))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error: fetchErr } = await supabase
        .from('post_media_assets')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (fetchErr) {
        throw fetchErr
      }

      if (data) {
        // Resolve signed URLs for private assets
        const withSignedUrls = await Promise.all(
          data.map(async (row) => {
            const previewUrl = await getSignedPreviewUrl(row.storage_path, 3600)
            return {
              id: row.id,
              user_id: row.user_id,
              post_id: row.post_id,
              storage_path: row.storage_path,
              file_name: row.file_name,
              mime_type: row.mime_type,
              file_size: Number(row.file_size),
              caption: row.caption ?? null,
              preview_url: previewUrl,
              created_at: row.created_at,
            }
          })
        )
        setPersistedAssets(withSignedUrls)
        setError(null)
      }
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to load media attachments')
      setError(msg)
      const local = getLocalAssets(postId)
      if (local.length > 0) setPersistedAssets(local)
    } finally {
      setLoading(false)
    }
  }, [postId, user])

  useEffect(() => {
    let isSubscribed = true

    async function initialLoad() {
      if (!postId || !user) {
        if (isSubscribed) {
          setPersistedAssets([])
          setLoading(false)
        }
        return
      }

      if (!isSupabaseConfigured()) {
        if (isSubscribed) {
          setPersistedAssets(getLocalAssets(postId))
          setLoading(false)
        }
        return
      }

      try {
        if (isSubscribed) setLoading(true)
        const { data, error: fetchErr } = await supabase
          .from('post_media_assets')
          .select('*')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (!isSubscribed) return

        if (fetchErr) {
          const msg = extractErrorMessage(fetchErr, 'Failed to load media attachments')
          setError(msg)
          const local = getLocalAssets(postId)
          if (local.length > 0) setPersistedAssets(local)
        } else if (data) {
          const withSignedUrls = await Promise.all(
            data.map(async (row) => {
              const previewUrl = await getSignedPreviewUrl(row.storage_path, 3600)
              return {
                id: row.id,
                user_id: row.user_id,
                post_id: row.post_id,
                storage_path: row.storage_path,
                file_name: row.file_name,
                mime_type: row.mime_type,
                file_size: Number(row.file_size),
                caption: row.caption ?? null,
                preview_url: previewUrl,
                created_at: row.created_at,
              }
            })
          )
          if (isSubscribed) {
            setPersistedAssets(withSignedUrls)
            setError(null)
          }
        }
      } catch (err: unknown) {
        if (!isSubscribed) return
        const msg = extractErrorMessage(err, 'Failed to load media attachments')
        setError(msg)
        const local = getLocalAssets(postId)
        if (local.length > 0) setPersistedAssets(local)
      } finally {
        if (isSubscribed) setLoading(false)
      }
    }

    void initialLoad()

    return () => {
      isSubscribed = false
    }
  }, [postId, user])

  // Upload an asset
  const uploadAsset = useCallback(
    async (
      file: File,
      caption?: string
    ): Promise<{ success: boolean; asset?: MediaAssetRecord; error?: string }> => {
      if (!user) {
        return { success: false, error: 'User must be authenticated to upload media' }
      }
      if (!postId) {
        return { success: false, error: 'Active draft post ID is required' }
      }

      // 1. Validate file format and size
      const validation = validateMediaFile(file)
      if (!validation.valid) {
        return { success: false, error: validation.error }
      }

      // 2. Validate attachment limit (persisted + staged)
      const countCheck = validateAttachmentCount(mediaAssets.length, 1)
      if (!countCheck.valid) {
        return { success: false, error: countCheck.error }
      }

      setError(null)

      // 3. Upload binary to private Supabase Storage
      const uploadRes = await uploadMediaFile(user.id, postId, file)
      if (!uploadRes.success || !uploadRes.storagePath) {
        return {
          success: false,
          error: uploadRes.error || 'Failed to upload file to storage',
        }
      }

      const storagePath = uploadRes.storagePath
      const localPreviewUrl = URL.createObjectURL(file)
      const assetId = generateUuid()

      const newAsset: MediaAssetRecord = {
        id: assetId,
        user_id: user.id,
        post_id: postId,
        storage_path: storagePath,
        file_name: file.name,
        mime_type: file.type,
        file_size: file.size,
        caption: caption || null,
        preview_url: localPreviewUrl,
        created_at: new Date().toISOString(),
      }

      if (!isSupabaseConfigured()) {
        const updated = [...persistedAssets, newAsset]
        setPersistedAssets(updated)
        saveLocalAssets(postId, updated)
        return { success: true, asset: newAsset }
      }

      // 4. Staging vs Direct Insert:
      // If editing an existing post in content_recommendations, save metadata immediately.
      // If composing a new post draft, STAGE the asset in state until post draft creation.
      // This strictly prevents Postgres 42501 (RLS policy check on non-existent post) and 23503 (FK error).
      if (!isExistingPost) {
        setStagedAssets((prev) => [...prev, newAsset])
        return { success: true, asset: newAsset }
      }

      try {
        const { data, error: insertErr } = await supabase
          .from('post_media_assets')
          .insert({
            id: newAsset.id,
            user_id: user.id,
            post_id: postId,
            storage_path: newAsset.storage_path,
            file_name: newAsset.file_name,
            mime_type: newAsset.mime_type,
            file_size: newAsset.file_size,
            caption: newAsset.caption,
          })
          .select()
          .single()

        if (insertErr) {
          // Prevent orphaned files: delete uploaded file if DB metadata insertion fails
          await deleteMediaFile(storagePath)
          throw insertErr
        }

        const created: MediaAssetRecord = {
          id: data.id,
          user_id: data.user_id,
          post_id: data.post_id,
          storage_path: data.storage_path,
          file_name: data.file_name,
          mime_type: data.mime_type,
          file_size: Number(data.file_size),
          caption: data.caption ?? null,
          preview_url: localPreviewUrl,
          created_at: data.created_at,
        }

        setPersistedAssets((prev) => [...prev, created])
        return { success: true, asset: created }
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to save media metadata')
        setError(msg)
        // Cleanup file from storage
        await deleteMediaFile(storagePath)
        return { success: false, error: msg }
      }
    },
    [user, postId, mediaAssets, isExistingPost, persistedAssets]
  )

  // Commit staged assets to DB once the parent post draft has been created in content_recommendations
  const commitStagedAssets = useCallback(
    async (finalPostId: string): Promise<{ success: boolean; error?: string }> => {
      if (stagedAssets.length === 0) {
        return { success: true }
      }
      if (!user) {
        return { success: false, error: 'User must be authenticated to persist media' }
      }

      if (!isSupabaseConfigured()) {
        const allLocal = [...persistedAssets, ...stagedAssets]
        setPersistedAssets(allLocal)
        setStagedAssets([])
        saveLocalAssets(finalPostId, allLocal)
        return { success: true }
      }

      try {
        const payload = stagedAssets.map((asset) => ({
          id: asset.id,
          user_id: user.id,
          post_id: finalPostId,
          storage_path: asset.storage_path,
          file_name: asset.file_name,
          mime_type: asset.mime_type,
          file_size: asset.file_size,
          caption: asset.caption,
        }))

        const { data, error: insertErr } = await supabase
          .from('post_media_assets')
          .insert(payload)
          .select()

        if (insertErr) {
          // Rollback: delete uploaded storage objects to avoid orphaned binaries
          await Promise.all(stagedAssets.map((a) => deleteMediaFile(a.storage_path)))
          setStagedAssets([])
          throw insertErr
        }

        const committed: MediaAssetRecord[] = data.map((row) => {
          const matching = stagedAssets.find((s) => s.id === row.id)
          return {
            id: row.id,
            user_id: row.user_id,
            post_id: row.post_id,
            storage_path: row.storage_path,
            file_name: row.file_name,
            mime_type: row.mime_type,
            file_size: Number(row.file_size),
            caption: row.caption ?? null,
            preview_url: matching?.preview_url || null,
            created_at: row.created_at,
          }
        })

        setPersistedAssets((prev) => [...prev, ...committed])
        setStagedAssets([])
        return { success: true }
      } catch (err: unknown) {
        const msg = extractErrorMessage(err, 'Failed to save media metadata')
        setError(msg)
        return { success: false, error: msg }
      }
    },
    [stagedAssets, user, persistedAssets]
  )

  // Discard all staged assets and delete uploaded storage binaries when draft composition is cancelled
  const discardStagedAssets = useCallback(async (): Promise<void> => {
    if (stagedAssets.length === 0) return

    await Promise.all(stagedAssets.map((a) => deleteMediaFile(a.storage_path)))
    setStagedAssets([])
  }, [stagedAssets])

  // Delete an asset (handles both staged in-memory assets and persisted DB assets)
  const deleteAsset = useCallback(
    async (assetId: string): Promise<boolean> => {
      if (!user || !postId) return false

      // Check if it's a staged asset
      const stagedTarget = stagedAssets.find((a) => a.id === assetId)
      if (stagedTarget) {
        setStagedAssets((prev) => prev.filter((a) => a.id !== assetId))
        await deleteMediaFile(stagedTarget.storage_path)
        return true
      }

      // Check if it's a persisted asset
      const persistedTarget = persistedAssets.find((a) => a.id === assetId)
      if (!persistedTarget) return false

      // Optimistic removal
      setPersistedAssets((prev) => prev.filter((a) => a.id !== assetId))

      if (!isSupabaseConfigured()) {
        const updated = persistedAssets.filter((a) => a.id !== assetId)
        saveLocalAssets(postId, updated)
        return true
      }

      try {
        // Delete metadata from table
        const { error: dbErr } = await supabase
          .from('post_media_assets')
          .delete()
          .eq('id', assetId)
          .eq('user_id', user.id)

        if (dbErr) throw dbErr

        // Delete binary from storage bucket
        await deleteMediaFile(persistedTarget.storage_path)
        return true
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to delete media asset'))
        // Restore state on failure
        loadAssets()
        return false
      }
    },
    [user, postId, stagedAssets, persistedAssets, loadAssets]
  )

  // Update caption
  const updateCaption = useCallback(
    async (assetId: string, caption: string): Promise<boolean> => {
      if (!user || !postId) return false

      // If staged asset, update in staged state
      const isStaged = stagedAssets.some((a) => a.id === assetId)
      if (isStaged) {
        setStagedAssets((prev) =>
          prev.map((a) => (a.id === assetId ? { ...a, caption } : a))
        )
        return true
      }

      setPersistedAssets((prev) =>
        prev.map((a) => (a.id === assetId ? { ...a, caption } : a))
      )

      if (!isSupabaseConfigured()) {
        const updated = persistedAssets.map((a) =>
          a.id === assetId ? { ...a, caption } : a
        )
        saveLocalAssets(postId, updated)
        return true
      }

      try {
        const { error: updateErr } = await supabase
          .from('post_media_assets')
          .update({ caption })
          .eq('id', assetId)
          .eq('user_id', user.id)

        if (updateErr) throw updateErr
        return true
      } catch (err: unknown) {
        setError(extractErrorMessage(err, 'Failed to update caption'))
        return false
      }
    },
    [user, postId, stagedAssets, persistedAssets]
  )

  return {
    mediaAssets,
    loading,
    error,
    uploadAsset,
    commitStagedAssets,
    discardStagedAssets,
    deleteAsset,
    updateCaption,
    refreshMedia: loadAssets,
  }
}
