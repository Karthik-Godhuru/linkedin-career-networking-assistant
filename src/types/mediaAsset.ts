export interface MediaAssetRecord {
  id: string
  user_id: string
  post_id: string
  storage_path: string
  file_name: string
  mime_type: string
  file_size: number
  caption: string | null
  preview_url?: string | null
  created_at: string
}

export interface MediaAssetUploadInput {
  file: File
  caption?: string
}

export interface MediaUploadItem {
  id: string
  file: File
  fileName: string
  fileSize: number
  mimeType: string
  mediaType: 'image' | 'video'
  previewUrl: string
  caption: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  storagePath?: string
  assetRecord?: MediaAssetRecord
}

export const MEDIA_LIMITS = {
  MAX_FILES_PER_POST: 5,
  MAX_IMAGE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_VIDEO_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'] as const,
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.webm'] as const,
} as const

export interface FileValidationResult {
  valid: boolean
  error?: string
  mediaType?: 'image' | 'video'
}
