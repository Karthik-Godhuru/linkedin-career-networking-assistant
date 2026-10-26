import React, { useState, useRef } from 'react'
import type { MediaAssetRecord } from '../../types/mediaAsset'
import { MEDIA_LIMITS } from '../../types/mediaAsset'
import {
  formatFileSize,
  validateMediaFile,
  validateAttachmentCount,
} from '../../services/mediaValidationService'
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  ShieldCheck,
} from 'lucide-react'

interface DeviceMediaUploaderProps {
  mediaAssets: MediaAssetRecord[]
  onUploadFile: (file: File, caption?: string) => Promise<{ success: boolean; error?: string }>
  onDeleteAsset: (assetId: string) => Promise<boolean>
  onUpdateCaption: (assetId: string, caption: string) => Promise<boolean>
  disabled?: boolean
}

export const DeviceMediaUploader: React.FC<DeviceMediaUploaderProps> = ({
  mediaAssets,
  onUploadFile,
  onDeleteAsset,
  onUpdateCaption,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successNote, setSuccessNote] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFiles(files)
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files)
      await processFiles(files)
      // Reset input value so re-selecting same file triggers change
      e.target.value = ''
    }
  }

  const processFiles = async (files: File[]) => {
    setError(null)
    setSuccessNote(null)

    // Check count limit
    const countCheck = validateAttachmentCount(mediaAssets.length, files.length)
    if (!countCheck.valid) {
      setError(countCheck.error || 'Too many files')
      return
    }

    setIsUploading(true)
    let uploadedCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const validation = validateMediaFile(file)
      if (!validation.valid) {
        setError(`${file.name}: ${validation.error}`)
        setIsUploading(false)
        setUploadProgress(null)
        return
      }

      setUploadProgress(`Uploading ${file.name} (${i + 1}/${files.length})...`)
      const res = await onUploadFile(file)
      if (!res.success) {
        setError(res.error || `Failed to upload ${file.name}`)
        setIsUploading(false)
        setUploadProgress(null)
        return
      }
      uploadedCount++
    }

    setIsUploading(false)
    setUploadProgress(null)
    if (uploadedCount > 0) {
      setSuccessNote(`Successfully uploaded ${uploadedCount} file${uploadedCount > 1 ? 's' : ''}.`)
      setTimeout(() => setSuccessNote(null), 3500)
    }
  }

  const canUploadMore = mediaAssets.length < MEDIA_LIMITS.MAX_FILES_PER_POST

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-[#FCEEEE] border border-[#F0C4C4] rounded-xl flex items-center gap-2 text-[#942F2F] text-xs font-medium">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNote && (
        <div className="p-3 bg-[#EAF2EC] border border-[#C6DEC9] rounded-xl flex items-center gap-2 text-[#2E5A36] text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successNote}</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      {canUploadMore ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#292722] bg-[#E8DFD3]/40'
              : 'border-[#D9CFC2] hover:border-[#B49A7D] bg-[#FAF7F2]'
          } ${isUploading ? 'opacity-60 pointer-events-none' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp,.mp4,.webm"
            onChange={handleFileInputChange}
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-2.5">
            <div className="p-3 rounded-full bg-[#E8DFD3] text-[#73685B]">
              {isUploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-[#292722]" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#292722]">
                {isUploading ? uploadProgress : 'Click to upload or drag & drop files here'}
              </p>
              <p className="text-[11px] text-[#73685B] mt-0.5">
                PNG, JPG, WebP (max 10MB) • MP4, WebM (max 50MB)
              </p>
            </div>

            <span className="text-[10px] text-[#73685B] font-mono">
              {mediaAssets.length} / {MEDIA_LIMITS.MAX_FILES_PER_POST} attachments used
            </span>
          </div>
        </div>
      ) : (
        <div className="p-3.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs text-[#73685B] text-center">
          Maximum of {MEDIA_LIMITS.MAX_FILES_PER_POST} media attachments reached for this post draft.
        </div>
      )}

      {/* Attached Media List */}
      {mediaAssets.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#292722]">
              Attached Media Assets ({mediaAssets.length})
            </span>
            <span className="text-[11px] text-[#73685B]">
              Stored securely in private storage bucket
            </span>
          </div>

          <div className="space-y-2">
            {mediaAssets.map((asset) => {
              const isVideo =
                asset.mime_type.startsWith('video/') ||
                ['.mp4', '.webm'].some((ext) => asset.file_name.toLowerCase().endsWith(ext))

              return (
                <div
                  key={asset.id}
                  className="p-3.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  {/* Left: Preview thumbnail and details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-14 h-14 rounded-xl bg-[#F4EEE6] border border-[#D9CFC2] flex items-center justify-center overflow-hidden flex-shrink-0 relative">
                      {asset.preview_url ? (
                        isVideo ? (
                          <video
                            src={asset.preview_url}
                            className="w-full h-full object-cover"
                            preload="metadata"
                          />
                        ) : (
                          <img
                            src={asset.preview_url}
                            alt={asset.caption || asset.file_name}
                            className="w-full h-full object-cover"
                          />
                        )
                      ) : isVideo ? (
                        <VideoIcon className="w-5 h-5 text-[#8A5A20]" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-[#73685B]" />
                      )}

                      {isVideo && (
                        <div className="absolute inset-0 bg-[#292722]/40 flex items-center justify-center">
                          <VideoIcon className="w-4 h-4 text-[#FAF7F2]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#292722] truncate max-w-[200px] sm:max-w-[300px]">
                          {asset.file_name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#E8DFD3] text-[#73685B]">
                          {isVideo ? 'Video' : 'Image'}
                        </span>
                        <span className="text-[10px] text-[#73685B] font-mono">
                          {formatFileSize(asset.file_size)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3 text-[#73685B] flex-shrink-0" />
                        <input
                          type="text"
                          defaultValue={asset.caption || ''}
                          onBlur={(e) => onUpdateCaption(asset.id, e.target.value.trim())}
                          placeholder="Add caption, alt text, or notes..."
                          className="w-full bg-[#F4EEE6] border border-[#D9CFC2] rounded-lg px-2.5 py-1 text-xs text-[#292722] focus:outline-none focus:border-[#292722] placeholder-[#73685B]/60"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onDeleteAsset(asset.id)}
                      className="p-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#FCEEEE] text-[#73685B] hover:text-[#942F2F] border border-[#D9CFC2] hover:border-[#F0C4C4] transition-colors"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Security notice */}
      <div className="p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl flex items-start gap-2.5 text-[11px] text-[#73685B]">
        <ShieldCheck className="w-4 h-4 text-[#2E5A36] flex-shrink-0 mt-0.5" />
        <p>
          Uploaded files are stored in your private Supabase Storage bucket (<code className="text-[#292722] font-semibold">post-media</code>) and scoped to your user ID. Media remains in draft storage and is never published or sent to LinkedIn automatically.
        </p>
      </div>
    </div>
  )
}
