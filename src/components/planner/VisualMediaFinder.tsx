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
    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Visual Media Studio
            </h3>
            <p className="text-[11px] text-slate-400">
              Upload your own project images/videos or find royalty-free stock assets for your LinkedIn post.
            </p>
          </div>
        </div>

        {/* Media Mode Tabs */}
        <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 self-start sm:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload from Device
            {mediaAssets.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-indigo-950 text-indigo-200 text-[10px] border border-indigo-400/30">
                {mediaAssets.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            Stock Images
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'videos'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
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
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search visual concept (e.g. Python code editor, ML diagram)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Provider Search Action Buttons */}
              <div className="flex items-center gap-2">
                {activeTab === 'images' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('pexels')}
                      className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search Pexels Photos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Pexels Photos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('unsplash')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search Unsplash Photos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Unsplash
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('youtube')}
                      className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search YouTube Videos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      YouTube
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSearch('pexels_videos')}
                      className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/80 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                      title="Search Pexels Videos in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Pexels Videos
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Suggested Visual Concepts */}
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Suggested Concepts (Click to populate):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((sug) => (
                  <button
                    key={sug.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(sug.query)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                      searchQuery === sug.query
                        ? 'bg-indigo-900/60 text-indigo-300 border-indigo-600'
                        : 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
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
          <div className="p-3 bg-slate-900/80 border border-slate-800/90 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Licence & Suitability Guidance</span>
              </div>
              <button
                type="button"
                onClick={() => setShowLicenseInfo(!showLicenseInfo)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <HelpCircle className="w-3 h-3" />
                {showLicenseInfo ? 'Hide Licence Rules' : 'Review Licence Rules'}
              </button>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Always verify the licence before downloading or republishing media on LinkedIn. Never share proprietary employer source code, secret API keys in screenshots, or identifiable individuals without their consent.
            </p>

            {showLicenseInfo && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['pexels', 'unsplash', 'youtube', 'pexels_videos'] as MediaProvider[]).map(
                    (p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedProviderForInfo(p)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          selectedProviderForInfo === p
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        {PROVIDER_LICENSES[p].providerName}
                      </button>
                    )
                  )}
                </div>

                <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-200">
                      {PROVIDER_LICENSES[selectedProviderForInfo].providerName}
                    </span>
                    <span className="text-emerald-400 font-mono">
                      Commercial: {PROVIDER_LICENSES[selectedProviderForInfo].commercialUse}
                    </span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                    {PROVIDER_LICENSES[selectedProviderForInfo].keyRules.map((rule, idx) => (
                      <li key={idx}>{rule}</li>
                    ))}
                  </ul>
                  <div className="pt-1 flex items-center justify-end">
                    <a
                      href={PROVIDER_LICENSES[selectedProviderForInfo].officialLicenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Read official terms
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Record External Media URL and Description */}
          <div className="pt-2 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                External Media Link / Asset URL (Optional)
              </label>
              {mediaUrl && (
                <button
                  type="button"
                  onClick={handleTestMediaUrl}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
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
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-400" />
                External Media Description / Alt Text & Attribution Note
              </label>
              <input
                type="text"
                value={mediaDescription}
                onChange={(e) => onMediaDescriptionChange(e.target.value)}
                placeholder="e.g. Clean screenshot of asynchronous queue benchmark chart (Photo by Jane on Pexels)"
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-start gap-2 p-2 bg-slate-900/50 rounded border border-slate-800/60 text-[11px] text-slate-500">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
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
