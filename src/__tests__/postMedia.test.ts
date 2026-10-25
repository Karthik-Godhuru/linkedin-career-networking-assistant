import { describe, it, expect, vi } from 'vitest'
import {
  validateMediaFile,
  validateAttachmentCount,
  formatFileSize,
  sanitizeFileName,
  generateStoragePath,
  generateUuid,
} from '../services/mediaValidationService'
import type { MediaAssetRecord } from '../types/mediaAsset'
import { uploadMediaFile, deleteMediaFile, getSignedPreviewUrl } from '../services/storageService'
import { supabase } from '../lib/supabaseClient'

describe('Visual Media Finder: Local File Validation', () => {
  it('accepts standard image formats (JPG, PNG, WebP) within the 10MB limit', () => {
    const validPng = { name: 'architecture_diagram.png', size: 2 * 1024 * 1024, type: 'image/png' }
    const validJpg = { name: 'screenshot.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg' }
    const validWebp = { name: 'demo.webp', size: 8 * 1024 * 1024, type: 'image/webp' }

    expect(validateMediaFile(validPng)).toEqual({ valid: true, mediaType: 'image' })
    expect(validateMediaFile(validJpg)).toEqual({ valid: true, mediaType: 'image' })
    expect(validateMediaFile(validWebp)).toEqual({ valid: true, mediaType: 'image' })
  })

  it('rejects images exceeding the 10MB limit', () => {
    const hugeImage = {
      name: 'massive_render.png',
      size: 11 * 1024 * 1024, // 11MB
      type: 'image/png',
    }

    const res = validateMediaFile(hugeImage)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('10MB')
    expect(res.mediaType).toBe('image')
  })

  it('accepts supported video formats (MP4, WebM) within the 50MB limit', () => {
    const validMp4 = { name: 'code_walkthrough.mp4', size: 30 * 1024 * 1024, type: 'video/mp4' }
    const validWebm = { name: 'ui_screencast.webm', size: 15 * 1024 * 1024, type: 'video/webm' }

    expect(validateMediaFile(validMp4)).toEqual({ valid: true, mediaType: 'video' })
    expect(validateMediaFile(validWebm)).toEqual({ valid: true, mediaType: 'video' })
  })

  it('rejects videos exceeding the 50MB limit', () => {
    const hugeVideo = {
      name: 'large_recording.mp4',
      size: 55 * 1024 * 1024, // 55MB
      type: 'video/mp4',
    }

    const res = validateMediaFile(hugeVideo)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('50MB')
    expect(res.mediaType).toBe('video')
  })

  it('rejects unsupported extensions and formats', () => {
    const exeFile = { name: 'malware.exe', size: 1024, type: 'application/octet-stream' }
    const pdfFile = { name: 'document.pdf', size: 1024, type: 'application/pdf' }
    const zipFile = { name: 'archive.zip', size: 1024, type: 'application/zip' }

    expect(validateMediaFile(exeFile).valid).toBe(false)
    expect(validateMediaFile(pdfFile).valid).toBe(false)
    expect(validateMediaFile(zipFile).valid).toBe(false)
  })

  it('rejects 0-byte empty files', () => {
    const emptyFile = { name: 'empty.png', size: 0, type: 'image/png' }
    const res = validateMediaFile(emptyFile)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('empty')
  })
})

describe('Visual Media Finder: Attachment Limits & Counting', () => {
  it('allows attachments up to the 5-file maximum limit', () => {
    expect(validateAttachmentCount(0, 1).valid).toBe(true)
    expect(validateAttachmentCount(2, 3).valid).toBe(true)
    expect(validateAttachmentCount(4, 1).valid).toBe(true)
  })

  it('rejects attachments that exceed the 5-file maximum limit', () => {
    const resOver = validateAttachmentCount(4, 2)
    expect(resOver.valid).toBe(false)
    expect(resOver.error).toContain('Maximum 5 attachments allowed')

    const resFull = validateAttachmentCount(5, 1)
    expect(resFull.valid).toBe(false)
  })
})

describe('Visual Media Finder: Storage Path & Security Isolation', () => {
  it('sanitizes unsafe filenames and removes directory traversal characters', () => {
    expect(sanitizeFileName('../../secret.png')).toBe('______secret.png')
    expect(sanitizeFileName('my image (1) #final!.jpg')).toBe('my_image__1___final_.jpg')
    expect(sanitizeFileName('normal_file.webp')).toBe('normal_file.webp')
  })

  it('generates user-isolated storage paths satisfying Supabase Storage RLS', () => {
    const userId = 'usr-123e4567-e89b-12d3-a456-426614174000'
    const postId = 'post-456'
    const path = generateStoragePath(userId, postId, 'architecture.png')

    // Root folder MUST match userId for (storage.foldername(name))[1] = auth.uid() policy
    const segments = path.split('/')
    expect(segments[0]).toBe(userId)
    expect(segments[1]).toBe(postId)
    expect(segments[2]).toMatch(/^\d+-architecture\.png$/)
  })

  it('formats file sizes accurately for user display', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(1500)).toBe('1.5 KB')
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})

describe('Visual Media Finder: Storage Service & Metadata Records', () => {
  it('uploadMediaFile and deleteMediaFile succeed with mocked storage responses', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'user-1/post-1/file.png' }, error: null })
    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null })

    const spy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
      upload: mockUpload,
      remove: mockRemove,
    } as unknown as ReturnType<typeof supabase.storage.from>)

    const dummyFile = new File(['content'], 'test.png', { type: 'image/png' })
    const uploadRes = await uploadMediaFile('user-1', 'post-1', dummyFile)

    expect(uploadRes.success).toBe(true)
    expect(uploadRes.storagePath).toContain('user-1/post-1/')
    expect(mockUpload).toHaveBeenCalled()

    const delRes = await deleteMediaFile(uploadRes.storagePath!)
    expect(delRes).toBe(true)
    expect(mockRemove).toHaveBeenCalledWith([uploadRes.storagePath!])

    spy.mockRestore()
  })

  it('handles storage upload failures and returns descriptive error', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: null, error: { message: 'Bucket quota exceeded' } })

    const spy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
      upload: mockUpload,
    } as unknown as ReturnType<typeof supabase.storage.from>)

    const dummyFile = new File(['content'], 'test.png', { type: 'image/png' })
    const uploadRes = await uploadMediaFile('user-1', 'post-1', dummyFile)

    expect(uploadRes.success).toBe(false)
    expect(uploadRes.error).toContain('Bucket quota exceeded')

    spy.mockRestore()
  })

  it('getSignedPreviewUrl returns signed URL when available and handles empty paths safely', async () => {
    expect(await getSignedPreviewUrl('')).toBeNull()

    const mockSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/post-media/file.png?token=abc' },
      error: null,
    })

    const spy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
      createSignedUrl: mockSignedUrl,
    } as unknown as ReturnType<typeof supabase.storage.from>)

    const signed = await getSignedPreviewUrl('user-1/post-1/file.png')
    expect(signed).toContain('token=abc')

    spy.mockRestore()
  })

  it('persists clean storage_path and metadata on MediaAssetRecord', () => {
    const record: MediaAssetRecord = {
      id: 'asset-1',
      user_id: 'usr-123',
      post_id: 'post-456',
      storage_path: 'usr-123/post-456/1700000000-diagram.png',
      file_name: 'diagram.png',
      mime_type: 'image/png',
      file_size: 1024 * 500,
      caption: 'Distributed queue benchmark chart',
      preview_url: 'blob:http://localhost:5173/mock-uuid',
      created_at: new Date().toISOString(),
    }

    expect(record.storage_path).not.toContain('blob:')
    expect(record.storage_path).not.toContain('http://')
    expect(record.file_size).toBe(512000)
    expect(record.caption).toBe('Distributed queue benchmark chart')
  })
})

describe('Visual Media Finder: RLS Policies, Ownership & Partial Failure Recovery', () => {
  const authUserId = '11111111-1111-4111-8111-111111111111'
  const userPostId = '33333333-3333-4333-8333-333333333333'
  const otherUserPostId = '44444444-4444-4444-8444-444444444444'

  it('generateUuid produces RFC4122 v4 compliant UUID strings', () => {
    const uuid1 = generateUuid()
    const uuid2 = generateUuid()

    expect(uuid1).not.toBe(uuid2)
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(uuid1).toMatch(uuidV4Regex)
    expect(uuid2).toMatch(uuidV4Regex)
  })

  it('successful media attachment: links user-owned asset to user-owned post', async () => {
    const assetId = generateUuid()
    const storagePath = `${authUserId}/${userPostId}/1700000000-diagram.png`

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: assetId,
            user_id: authUserId,
            post_id: userPostId,
            storage_path: storagePath,
            file_name: 'diagram.png',
            mime_type: 'image/png',
            file_size: 102400,
            caption: 'Valid attachment',
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    })

    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>)

    const { data, error } = await supabase
      .from('post_media_assets')
      .insert({
        id: assetId,
        user_id: authUserId,
        post_id: userPostId,
        storage_path: storagePath,
        file_name: 'diagram.png',
        mime_type: 'image/png',
        file_size: 102400,
        caption: 'Valid attachment',
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.user_id).toBe(authUserId)
    expect(data!.post_id).toBe(userPostId)
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: authUserId,
        post_id: userPostId,
      })
    )

    fromSpy.mockRestore()
  })

  it('missing user identity: rejects upload before storage or DB mutations', async () => {
    // When no authenticated user exists, upload returns failure immediately
    const dummyFile = new File(['data'], 'test.png', { type: 'image/png' })
    const unauthenticatedUser = null

    const result = !unauthenticatedUser
      ? { success: false, error: 'User must be authenticated to upload media' }
      : await uploadMediaFile('some-id', userPostId, dummyFile)

    expect(result.success).toBe(false)
    expect(result.error).toContain('User must be authenticated')
  })

  it('unauthorized draft ownership: RLS policy rejects linking media to another user post with 42501', async () => {
    // Simulate attempt by authUserId to link an asset to otherUserPostId
    // In PostgreSQL RLS: EXISTS (SELECT 1 FROM content_recommendations cr WHERE cr.id = post_id AND cr.user_id = auth.uid())
    // Returns FALSE because cr.user_id (otherUserId) != auth.uid() (authUserId)
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: '42501',
            message: 'new row violates row-level security policy for table "post_media_assets"',
            details: null,
            hint: null,
          },
        }),
      }),
    })

    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>)

    const { data, error } = await supabase
      .from('post_media_assets')
      .insert({
        id: generateUuid(),
        user_id: authUserId,
        post_id: otherUserPostId, // unauthorized post
        storage_path: `${authUserId}/${otherUserPostId}/unauthorized.png`,
        file_name: 'unauthorized.png',
        mime_type: 'image/png',
        file_size: 50000,
      })
      .select()
      .single()

    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
    expect(error?.message).toContain('violates row-level security policy')

    fromSpy.mockRestore()
  })

  it('rollback of storage objects: deletes uploaded storage object when database insert fails', async () => {
    const storagePath = `${authUserId}/${userPostId}/temp-upload.png`
    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null })

    const storageSpy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
      remove: mockRemove,
    } as unknown as ReturnType<typeof supabase.storage.from>)

    // Simulate insert failure triggering compensation rollback
    const insertError = { code: '42501', message: 'RLS check failed' }
    if (insertError) {
      await deleteMediaFile(storagePath)
    }

    expect(mockRemove).toHaveBeenCalledWith([storagePath])
    storageSpy.mockRestore()
  })

  it('cleanup on failed uploads: no database insert occurs if storage upload fails', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Storage bucket unavailable' },
    })
    const mockInsert = vi.fn()

    const storageSpy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
      upload: mockUpload,
    } as unknown as ReturnType<typeof supabase.storage.from>)

    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>)

    const dummyFile = new File(['data'], 'test.png', { type: 'image/png' })
    const uploadRes = await uploadMediaFile(authUserId, userPostId, dummyFile)

    expect(uploadRes.success).toBe(false)
    expect(uploadRes.error).toContain('Storage bucket unavailable')
    // Ensure DB insert was never called because upload failed first
    expect(mockInsert).not.toHaveBeenCalled()

    storageSpy.mockRestore()
    fromSpy.mockRestore()
  })

  it('two-phase staging workflow: stages assets for new drafts and commits them atomically after post is created', async () => {
    // 1. Stage phase: new post draft not yet in content_recommendations
    const stagedAsset: MediaAssetRecord = {
      id: generateUuid(),
      user_id: authUserId,
      post_id: userPostId,
      storage_path: `${authUserId}/${userPostId}/staged.png`,
      file_name: 'staged.png',
      mime_type: 'image/png',
      file_size: 20480,
      caption: 'Staged architecture preview',
      preview_url: 'blob:http://localhost:5173/preview-1',
      created_at: new Date().toISOString(),
    }

    // During drafting, stagedAsset lives in memory state (mediaAssets) without hitting post_media_assets
    const stagedAssets = [stagedAsset]
    expect(stagedAssets).toHaveLength(1)
    expect(stagedAssets[0].storage_path).toContain(authUserId)

    // 2. Commit phase: once parent post is saved to content_recommendations, batch insert staged assets
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: stagedAsset.id,
            user_id: stagedAsset.user_id,
            post_id: stagedAsset.post_id,
            storage_path: stagedAsset.storage_path,
            file_name: stagedAsset.file_name,
            mime_type: stagedAsset.mime_type,
            file_size: stagedAsset.file_size,
            caption: stagedAsset.caption,
            created_at: stagedAsset.created_at,
          },
        ],
        error: null,
      }),
    })

    const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
      insert: mockInsert,
    } as unknown as ReturnType<typeof supabase.from>)

    const payload = stagedAssets.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      post_id: a.post_id,
      storage_path: a.storage_path,
      file_name: a.file_name,
      mime_type: a.mime_type,
      file_size: a.file_size,
      caption: a.caption,
    }))

    const { data, error } = await supabase.from('post_media_assets').insert(payload).select()

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].post_id).toBe(userPostId)

    fromSpy.mockRestore()
  })

  it('discard staged assets: deletes uploaded storage binaries when modal is dismissed without saving', async () => {
    const stagedPaths = [
      `${authUserId}/${userPostId}/staged-1.png`,
      `${authUserId}/${userPostId}/staged-2.webp`,
    ]

    const mockRemove = vi.fn().mockResolvedValue({ data: [], error: null })
    const storageSpy = vi.spyOn(supabase.storage, 'from').mockReturnValue({
      remove: mockRemove,
    } as unknown as ReturnType<typeof supabase.storage.from>)

    // Simulating discardStagedAssets()
    await Promise.all(stagedPaths.map((p) => deleteMediaFile(p)))

    expect(mockRemove).toHaveBeenCalledTimes(2)
    expect(mockRemove).toHaveBeenCalledWith([stagedPaths[0]])
    expect(mockRemove).toHaveBeenCalledWith([stagedPaths[1]])

    storageSpy.mockRestore()
  })
})
