import React, { useState } from 'react'
import type { MediaTab, MediaProvider } from '../../services/visualMediaService'
import {
  buildMediaSearchUrl,
  generateVisualSuggestions,
  PROVIDER_LICENSES,
} from '../../services/visualMediaService'
import type { MediaAssetRecord } from '../../types/mediaAsset'
import { DeviceMediaUploader } from './DeviceMediaUploader'
import {
  UploadCloud,
  Image,
  Video,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  Link2,
  FileText,
  Search,
  AlertTriangle,
} from 'lucide-react'

interface VisualMediaFinderProps {
  topic: string
  targetSkills?: string[]
  mediaUrl: string
  mediaDescription: string
  onMediaUrlChange: (url: string) => void
  onMediaDescriptionChange: (description: string) => void
  // Device upload handlers & state
  mediaAssets?: MediaAssetRecord[]
  onUploadFile?: (file: File, caption?: string) => Promise<{ success: boolean; error?: string }>
  onDeleteAsset?: (assetId: string) => Promise<boolean>
  onUpdateCaption?: (assetId: string, caption: string) => Promise<boolean>
}

export const VisualMediaFinder: React.FC<VisualMediaFinderProps> = ({
  topic,
  targetSkills = [],
  mediaUrl,
  mediaDescription,
  onMediaUrlChange,
  onMediaDescriptionChange,
  mediaAssets = [],
  onUploadFile,
  onDeleteAsset,
  onUpdateCaption,
}) => {
  const [activeTab, setActiveTab] = useState<MediaTab>('upload')
  const [searchQuery, setSearchQuery] = useState(() => topic.trim() || 'software engineering')
  const [showLicenseInfo, setShowLicenseInfo] = useState(false)
  const [selectedProviderForInfo, setSelectedProviderForInfo] = useState<MediaProvider>('pexels')

  const suggestions = generateVisualSuggestions(topic, targetSkills)

  const handleOpenSearch = (provider: MediaProvider) => {
    const url = buildMediaSearchUrl(provider, searchQuery)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleSelectSuggestion = (query: string) => {
    setSearchQuery(query)
  }

  const handleTestMediaUrl = () => {
    if (!mediaUrl.trim()) return
    try {
      new URL(mediaUrl.trim())
      window.open(mediaUrl.trim(), '_blank', 'noopener,noreferrer')
    } catch {
      // Invalid URL
    }
  }

  return (
    <div className="p-5 bg-[#F4EEE6] border border-[#D9CFC2] rounded-2xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#D9CFC2]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#E8DFD3] text-[#73685B]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[#292722] uppercase tracking-wider">
              Visual Media Studio
            </h3>
            <p className="text-[11px] text-[#73685B]">
              Upload your own project images/videos or find royalty-free stock assets for your LinkedIn post.
            </p>
          </div>
        </div>

        {/* Media Mode Tabs */}
        <div className="flex items-center bg-[#FAF7F2] p-1 rounded-xl border border-[#D9CFC2] self-start sm:self-auto flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
                : 'text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload from Device
            {mediaAssets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#E8DFD3] text-[#292722] text-[10px] font-bold">
                {mediaAssets.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
                : 'text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Stock Images
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'videos'
                ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
                : 'text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Videos
          </button>
        </div>
      </div>

      {/* Tab 1: Upload from Device */}
      {activeTab === 'upload' && onUploadFile && onDeleteAsset && onUpdateCaption && (
        <DeviceMediaUploader
          mediaAssets={mediaAssets}
          onUploadFile={onUploadFile}
          onDeleteAsset={onDeleteAsset}
          onUpdateCaption={onUpdateCaption}
        />
      )}

      {/* Tab 2 & 3: Stock Images & Videos Search */}
      {(activeTab === 'images' || activeTab === 'videos') && (
        <div className="space-y-4">
          {/* Search Input & Action Buttons */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#73685B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search visual concept (e.g. Python code editor, ML diagram)..."
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722]"
                />
              </div>

              {/* Provider Search Action Buttons */}
              <div className="flex items-center gap-2">
                {activeTab === 'images' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('pexels')}
                      className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search Pexels Photos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#73685B]" />
                      Pexels Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('unsplash')}
                      className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search Unsplash Photos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#73685B]" />
                      Unsplash
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('youtube')}
                      className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search YouTube Videos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#73685B]" />
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('pexels_videos')}
                      className="px-3.5 py-2 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search Pexels Videos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#73685B]" />
                      Pexels Videos
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Suggested Visual Concepts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold text-[#73685B] uppercase tracking-wider block">
                Suggested Concepts (Click to populate):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug.query)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                      searchQuery === sug.query
                        ? 'bg-[#292722] text-[#FAF7F2] border-[#292722]'
                        : 'bg-[#FAF7F2] text-[#73685B] border-[#D9CFC2] hover:border-[#73685B] hover:text-[#292722]'
                    }`}
                    title={sug.description}
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Licence & Suitability Guidance Toggle */}
          <div className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#292722]">
                <ShieldCheck className="w-4 h-4 text-[#2E5A36]" />
                <span>Licence & Suitability Guidance</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLicenseInfo(!showLicenseInfo)}
                className="text-[11px] text-[#292722] hover:text-[#73685B] font-semibold flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#73685B]" />
                {showLicenseInfo ? 'Hide Licence Rules' : 'Review Licence Rules'}
              </button>
            </div>

            <p className="text-[11px] text-[#73685B] leading-relaxed">
              Always verify the licence before downloading or republishing media on LinkedIn. Never share proprietary employer source code, secret API keys in screenshots, or identifiable individuals without their consent.
            </p>

            {showLicenseInfo && (
              <div className="pt-3 border-t border-[#D9CFC2] space-y-2.5">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['pexels', 'unsplash', 'youtube', 'pexels_videos'] as MediaProvider[]).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedProviderForInfo(p)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-colors ${
                          selectedProviderForInfo === p
                            ? 'bg-[#292722] text-[#FAF7F2]'
                            : 'bg-[#F4EEE6] text-[#73685B] hover:text-[#292722] border border-[#D9CFC2]'
                        }`}
                      >
                        {PROVIDER_LICENSES[p].providerName}
                      </button>
                    )
                  )}
                </div>

                <div className="p-3 bg-[#F4EEE6] rounded-xl border border-[#D9CFC2] text-xs text-[#292722] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[#292722]">
                      {PROVIDER_LICENSES[selectedProviderForInfo].providerName}
                    </span>
                    <span className="text-[#2E5A36] font-mono font-semibold">
                      Commercial: {PROVIDER_LICENSES[selectedProviderForInfo].commercialUse}
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-[#73685B] space-y-0.5">
                    {PROVIDER_LICENSES[selectedProviderForInfo].keyRules.map((rule, idx) => (
                      <li key={idx}>{rule}</li>
                    ))}
                  </ul>
                  <div className="pt-1 flex items-center justify-end">
                    <a
                      href={PROVIDER_LICENSES[selectedProviderForInfo].officialLicenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#292722] hover:text-[#73685B] font-semibold underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3 text-[#73685B]" />
                      Read official terms
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Record External Media URL and Description */}
          <div className="pt-3 border-t border-[#D9CFC2] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#73685B]" />
                External Media Link / Asset URL (Optional)
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={handleTestMediaUrl}
                  className="text-[11px] text-[#292722] hover:text-[#73685B] font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Asset
                </button>
              )}
            </div>

            <input
              type="url"
              value={mediaUrl}
              onChange={(e) => onMediaUrlChange(e.target.value)}
              placeholder="https://www.pexels.com/photo/code-snippet-12345/ or https://youtu.be/..."
              className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722] font-mono"
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#292722] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#73685B]" />
                External Media Description / Alt Text & Attribution Note
              </label>
              <input
                type="text"
                value={mediaDescription}
                onChange={(e) => onMediaDescriptionChange(e.target.value)}
                placeholder="e.g. Clean screenshot of asynchronous queue benchmark chart (Photo by Jane on Pexels)"
                className="w-full px-3.5 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722]"
              />
            </div>

            <div className="flex items-start gap-2 p-3 bg-[#FAF7F2] rounded-xl border border-[#D9CFC2] text-[11px] text-[#73685B]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#8A5A20] flex-shrink-0 mt-0.5" />
              <p>
                External stock links are stored as verified source references rather than hotlinked or scraped, protecting provider terms and ensuring you retain explicit control over assets uploaded to LinkedIn.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
