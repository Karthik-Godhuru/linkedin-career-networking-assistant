import React, { useState } from 'react'
import {
  Upload,
  Search,
  Code2,
  Globe,
  Plus,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Users,
  FileSpreadsheet,
  Bookmark,
  Check,
  X,
  Clock,
  Filter,
} from 'lucide-react'
import { useCandidates, type IngestResult } from '../../hooks/useCandidates'
import { useCareerProfile } from '../../hooks/useCareerProfile'
import { CandidateCard } from './CandidateCard'
import { parseCandidatesFromCSV } from '../../services/ingestion/csvParser'
import { searchGitHubDevelopers } from '../../services/ingestion/githubIngestion'
import { buildWebSearchQueries } from '../../services/ingestion/webSearchQueryBuilder'
import { searchCandidatesWithGemini } from '../../services/ingestion/geminiSearchService'
import type {
  CandidateRawInput,
  CandidateCategory,
  CandidateStatus,
  GeminiDiscoveredCandidate,
  GeminiRejectionBreakdown,
  GeminiDiagnostics,
} from '../../types/candidate'

const SAMPLE_CSV = `Full Name,Headline,Company,Location,URL
Elena Vance,Senior ML Engineer | Distributed PyTorch & Inference,vLLM Labs,San Francisco,https://www.linkedin.com/in/elena-vance-sample
David Miller,University Talent Lead & Technical Recruiter,Scale AI,Remote,https://www.linkedin.com/in/david-miller-recruiter
Priya Sharma,Senior AI Researcher & XYZ Alum,Google DeepMind,Bengaluru,https://www.linkedin.com/in/priya-sharma-deepmind
Marcus Webb,Founding Python & Systems Engineer,Series A AI Startup,Remote,https://www.linkedin.com/in/marcus-webb-systems`

interface DiscoveryHubProps {
  onNavigateToOutreach?: (candidateId?: string) => void
}

export const DiscoveryHub: React.FC<DiscoveryHubProps> = ({ onNavigateToOutreach }) => {
  const {
    candidates,
    loading,
    ingesting,
    updatingId,
    error,
    ingestCandidates,
    updateCandidateStatus,
  } = useCandidates()
  const { profile: userProfile } = useCareerProfile()

  const [activeTab, setActiveTab] = useState<'csv' | 'github' | 'web' | 'manual'>('csv')
  const [csvText, setCsvText] = useState('')
  const [ingestNotice, setIngestNotice] = useState<IngestResult | null>(null)
  const [decisionFeedback, setDecisionFeedback] = useState<{
    name: string
    status: CandidateStatus
  } | null>(null)

  // GitHub Search State
  const [githubSkill, setGithubSkill] = useState(userProfile.target_skills[0] || 'Python')
  const [githubResults, setGithubResults] = useState<CandidateRawInput[]>([])
  const [githubSearching, setGithubSearching] = useState(false)

  // Gemini AI Web Search State
  const [geminiRole, setGeminiRole] = useState(userProfile.target_roles[0] || 'AI/ML Engineer')
  const [geminiSkills, setGeminiSkills] = useState(userProfile.target_skills.slice(0, 3).join(', ') || 'Python, PyTorch')
  const [geminiLocation, setGeminiLocation] = useState(userProfile.target_locations[0] || '')
  const [geminiCompany, setGeminiCompany] = useState(userProfile.target_companies[0] || '')
  const [geminiSearching, setGeminiSearching] = useState(false)
  const [geminiResults, setGeminiResults] = useState<GeminiDiscoveredCandidate[]>([])
  const [geminiError, setGeminiError] = useState<string | null>(null)
  const [geminiErrorCode, setGeminiErrorCode] = useState<string | null>(null)
  const [geminiSearchDone, setGeminiSearchDone] = useState(false)
  const [geminiRejectedCount, setGeminiRejectedCount] = useState<number>(0)
  const [geminiRejectionBreakdown, setGeminiRejectionBreakdown] = useState<GeminiRejectionBreakdown | null>(null)
  const [geminiIsBroader, setGeminiIsBroader] = useState(false)
  const [geminiDiagnostics, setGeminiDiagnostics] = useState<GeminiDiagnostics | null>(null)

  // Manual Input State
  const [manualName, setManualName] = useState('')
  const [manualHeadline, setManualHeadline] = useState('')
  const [manualCompany, setManualCompany] = useState('')
  const [manualLocation, setManualLocation] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualCategory, setManualCategory] = useState<CandidateCategory>('engineer')

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCompany, setFilterCompany] = useState<string>('all')
  const [filterScore, setFilterScore] = useState<string>('all')

  const webQueries = buildWebSearchQueries(userProfile)

  // Ingestion Handlers
  const handleCsvSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIngestNotice(null)
    const parsed = parseCandidatesFromCSV(csvText)
    if (parsed.length === 0) return

    const res = await ingestCandidates(parsed)
    if (res.success && res.result) {
      setIngestNotice(res.result)
      setCsvText('')
    }
  }

  const handleLoadSampleCSV = () => {
    setCsvText(SAMPLE_CSV)
  }

  const handleGitHubSearch = async () => {
    setGithubSearching(true)
    const results = await searchGitHubDevelopers({
      skills: [githubSkill],
      location: userProfile.target_locations[0],
      limit: 6,
    })
    setGithubResults(results)
    setGithubSearching(false)
  }

  const handleImportGitHubUser = async (userCandidate: CandidateRawInput) => {
    const res = await ingestCandidates([userCandidate])
    if (res.success && res.result) {
      setIngestNotice(res.result)
      setGithubResults((prev) => prev.filter((u) => u.profile_url !== userCandidate.profile_url))
    }
  }

  const handleGeminiSearch = async (e?: React.FormEvent, runBroader = false) => {
    if (e) e.preventDefault()
    setGeminiSearching(true)
    setGeminiError(null)
    setGeminiErrorCode(null)
    setGeminiSearchDone(false)
    setGeminiRejectedCount(0)
    setGeminiRejectionBreakdown(null)
    setGeminiIsBroader(runBroader)
    setGeminiDiagnostics(null)

    const skillList = geminiSkills.split(',').map((s) => s.trim()).filter(Boolean)
    const res = await searchCandidatesWithGemini({
      role: geminiRole.trim(),
      skills: skillList,
      location: geminiLocation.trim(),
      company: geminiCompany.trim(),
      broader: runBroader,
    })

    if (res.success) {
      setGeminiResults(res.candidates)
      setGeminiRejectedCount(res.rejectedCount ?? 0)
      setGeminiRejectionBreakdown(res.rejectionBreakdown || null)
      setGeminiIsBroader(res.isBroader ?? runBroader)
      setGeminiDiagnostics(res.diagnostics || null)
      setGeminiSearchDone(true)
    } else {
      setGeminiError(res.error || 'Failed to complete web search')
      setGeminiErrorCode(res.code || null)
      setGeminiResults([])
      setGeminiRejectedCount(res.rejectedCount ?? 0)
      setGeminiRejectionBreakdown(res.rejectionBreakdown || null)
      setGeminiIsBroader(runBroader)
      setGeminiDiagnostics(res.diagnostics || null)
      setGeminiSearchDone(true)
    }
    setGeminiSearching(false)
  }

  const handleImportGeminiCandidate = async (candidate: GeminiDiscoveredCandidate) => {
    const raw: CandidateRawInput = {
      full_name: candidate.full_name,
      headline: candidate.headline,
      current_company: candidate.current_company,
      location: candidate.location,
      profile_url: candidate.profile_url,
      source: 'gemini_web_search',
      skills: candidate.skills,
    }

    const res = await ingestCandidates([raw])
    if (res.success && res.result) {
      setIngestNotice(res.result)
      setGeminiResults((prev) => prev.filter((c) => c.profile_url !== candidate.profile_url))
    }
  }

  const handleImportAllGeminiCandidates = async () => {
    if (geminiResults.length === 0) return

    const batch: CandidateRawInput[] = geminiResults.map((c) => ({
      full_name: c.full_name,
      headline: c.headline,
      current_company: c.current_company,
      location: c.location,
      profile_url: c.profile_url,
      source: 'gemini_web_search',
      skills: c.skills,
    }))

    const res = await ingestCandidates(batch)
    if (res.success && res.result) {
      setIngestNotice(res.result)
      setGeminiResults([])
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName || !manualUrl) return

    const newCandidate: CandidateRawInput = {
      full_name: manualName.trim(),
      headline: manualHeadline.trim() || undefined,
      current_company: manualCompany.trim() || undefined,
      location: manualLocation.trim() || undefined,
      profile_url: manualUrl.trim(),
      category: manualCategory,
      source: 'manual_entry',
    }

    const res = await ingestCandidates([newCandidate])
    if (res.success && res.result) {
      setIngestNotice(res.result)
      setManualName('')
      setManualHeadline('')
      setManualCompany('')
      setManualLocation('')
      setManualUrl('')
    }
  }

  const handleStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    const target = candidates.find((c) => c.id === candidateId)
    await updateCandidateStatus(candidateId, newStatus)
    if (target) {
      setDecisionFeedback({ name: target.full_name, status: newStatus })
      setTimeout(() => setDecisionFeedback(null), 4000)
    }
  }

  // Filter pipeline
  const filteredCandidates = candidates.filter((c) => {
    // 1. Search text filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      const matchesName = c.full_name.toLowerCase().includes(q)
      const matchesHeadline = (c.headline || '').toLowerCase().includes(q)
      const matchesCompany = (c.current_company || '').toLowerCase().includes(q)
      const matchesLocation = (c.location || '').toLowerCase().includes(q)
      if (!matchesName && !matchesHeadline && !matchesCompany && !matchesLocation) {
        return false
      }
    }

    // 2. Category filter
    if (filterCategory !== 'all' && c.category !== filterCategory) {
      return false
    }

    // 3. Status filter
    if (filterStatus !== 'all' && c.status !== filterStatus) {
      return false
    }

    // 4. Company filter
    if (filterCompany !== 'all' && c.current_company !== filterCompany) {
      return false
    }

    // 5. Match Score filter
    if (filterScore !== 'all') {
      const score = c.match_score ?? 50
      if (filterScore === 'high' && score < 80) return false
      if (filterScore === 'medium' && (score < 60 || score >= 80)) return false
      if (filterScore === 'low' && score >= 60) return false
    }

    return true
  })

  // Summary Metrics
  const totalCount = candidates.length
  const pendingCount = candidates.filter((c) => c.status === 'pending').length
  const shortlistedCount = candidates.filter((c) => c.status === 'shortlisted').length
  const approvedCount = candidates.filter((c) => c.status === 'approved').length
  const skippedCount = candidates.filter((c) => c.status === 'dismissed').length

  // Distinct company list for filter dropdown
  const uniqueCompanies = Array.from(
    new Set(candidates.map((c) => c.current_company).filter(Boolean) as string[])
  ).slice(0, 15)

  return (
    <div className="space-y-6 text-left">
      {/* Header Banner - Editorial Warmth with Dark Feature Metrics */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#1C1B19] text-[#C6A76B] border border-[#C6A76B]/30 text-[10px] font-semibold uppercase tracking-wider mb-2.5 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C6A76B]" />
              <span>Candidate Discovery &amp; Human Curation</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-light text-[#292722] tracking-tight">
              Candidate Curation &amp; Review Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-[#73685B] mt-1 max-w-xl font-normal leading-relaxed">
              Curate discovered profiles against your career preferences. Shortlist top prospects, approve candidates for networking outreach, or skip unwanted records.
            </p>
          </div>

          {/* Quick Metrics Cards - Cinematic Charcoal Panel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#FAF7F2]/60">
                <span>Total</span>
                <Users className="w-3.5 h-3.5 text-[#C6A76B]" />
              </div>
              <div className="text-xl font-bold text-[#FAF7F2] font-mono mt-1">{totalCount}</div>
            </div>

            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#FAF7F2]/60">
                <span>Pending</span>
                <Clock className="w-3.5 h-3.5 text-[#FAF7F2]/60" />
              </div>
              <div className="text-xl font-bold text-[#FAF7F2]/80 font-mono mt-1">{pendingCount}</div>
            </div>

            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#C6A76B]/90">
                <span>Shortlist</span>
                <Bookmark className="w-3.5 h-3.5 text-[#C6A76B]" />
              </div>
              <div className="text-xl font-bold text-[#C6A76B] font-mono mt-1">{shortlistedCount}</div>
            </div>

            <div className="bg-[#1C1B19] border border-[#514435] rounded-xl px-4 py-3 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#2E5A36]">
                <span className="text-[#FAF7F2]/60">Approved</span>
                <Check className="w-3.5 h-3.5 text-[#2E5A36]" />
              </div>
              <div className="text-xl font-bold text-[#FAF7F2] font-mono mt-1">{approvedCount}</div>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {decisionFeedback && (
          <div className="mt-4 p-3.5 rounded-md bg-[#EAF2EC] border border-[#C6DEC9] flex items-center space-x-3 text-[#2E5A36] text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#2E5A36] shrink-0" />
            <div>
              <span className="font-semibold text-[#292722]">{decisionFeedback.name}</span>{' '}
              <span>
                marked as{' '}
                <strong className="capitalize">
                  {decisionFeedback.status === 'dismissed'
                    ? 'Skipped'
                    : decisionFeedback.status === 'approved'
                    ? 'Approved for Networking'
                    : decisionFeedback.status}
                </strong>
                . Decision saved to your private database profile.
              </span>
            </div>
          </div>
        )}

        {ingestNotice && (
          <div className="mt-4 p-3.5 rounded-md bg-[#E8DFD3] border border-[#D9CFC2] flex items-center space-x-3 text-[#292722] text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#2E5A36] shrink-0" />
            <div>
              <span className="font-semibold">Ingestion complete!</span>{' '}
              <span className="text-[#73685B]">
                Added {ingestNotice.added} new candidates ({ingestNotice.skippedDuplicates} duplicate(s) filtered out).
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-md bg-[#FCEEEE] border border-[#F0C4C4] flex items-center space-x-3 text-[#942F2F] text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-[#942F2F] shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Discovery & Ingestion Pipeline Drawer */}
      <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#292722] mb-4 flex items-center space-x-2">
          <span>Import &amp; Discover New Candidates</span>
          <span className="text-[11px] font-mono text-[#73685B] font-normal">(Permitted Sources Only)</span>
        </h3>

        {/* Ingestion Source Tabs */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-[#D9CFC2] mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'csv'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] text-[#73685B] hover:text-[#292722] hover:bg-[#E8DFD3] border border-[#D9CFC2]'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            CSV / Spreadsheets
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'github'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] text-[#73685B] hover:text-[#292722] hover:bg-[#E8DFD3] border border-[#D9CFC2]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 mr-1.5" />
            GitHub Developers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('web')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'web'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] text-[#73685B] hover:text-[#292722] hover:bg-[#E8DFD3] border border-[#D9CFC2]'
            }`}
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Permitted Web Search Queries
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'manual'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] text-[#73685B] hover:text-[#292722] hover:bg-[#E8DFD3] border border-[#D9CFC2]'
            }`}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Single Profile Ingest
          </button>
        </div>

        {/* Tab 1: CSV Ingestion */}
        {activeTab === 'csv' && (
          <form onSubmit={handleCsvSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#292722]">
                Paste CSV Data or LinkedIn Archive Export
              </label>
              <button
                type="button"
                onClick={handleLoadSampleCSV}
                className="text-xs text-[#292722] hover:text-[#B49A7D] hover:underline font-medium"
              >
                Load Demo / Sample AI/ML Data
              </button>
            </div>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Full Name,Headline,Company,Location,URL&#10;Elena Vance,Senior ML Engineer,vLLM Labs,San Francisco,https://www.linkedin.com/in/elena-vance"
              className="w-full p-3 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md font-mono text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D] focus:ring-1 focus:ring-[#B49A7D]"
            />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-[11px] text-[#73685B]">
                Supports LinkedIn export format or custom columns (Full Name, URL, Role, Company, Location).
              </span>

              <button
                type="submit"
                disabled={ingesting || !csvText.trim()}
                className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {ingesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Ingesting &amp; Scoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Parse &amp; Ingest CSV
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: GitHub Search */}
        {activeTab === 'github' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  Search Open Source Contributors by Technology
                </label>
                <input
                  type="text"
                  value={githubSkill}
                  onChange={(e) => setGithubSkill(e.target.value)}
                  placeholder="e.g. PyTorch, vLLM, LangChain, FastAPI"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
                />
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleGitHubSearch}
                  disabled={githubSearching}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                >
                  {githubSearching ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 mr-1.5" />
                      Discover Developers
                    </>
                  )}
                </button>
              </div>
            </div>

            {githubResults.length > 0 && (
              <div className="pt-4 border-t border-[#D9CFC2] space-y-3">
                <span className="text-xs font-semibold text-[#292722]">
                  Found {githubResults.length} open-source developers:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {githubResults.map((dev, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-md p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#292722]">{dev.full_name}</div>
                        <p className="text-[#73685B] text-[11px] mt-0.5 line-clamp-1">{dev.headline}</p>
                        <span className="text-[10px] text-[#73685B]">{dev.location}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportGitHubUser(dev)}
                        disabled={ingesting}
                        className="shrink-0 inline-flex items-center px-2.5 py-1 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-[11px] font-medium rounded-md"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Import
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Compliant Web Search Builder & Groq AI Discovery */}
        {activeTab === 'web' && (
          <div className="space-y-6">
            {/* Live Gemini AI Web Search Station */}
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1B19] text-[#C6A76B] text-[10px] font-semibold uppercase tracking-wider mb-1">
                    <Sparkles className="w-3 h-3 text-[#C6A76B]" />
                    <span>Live Web Discovery</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#292722]">
                    Search Publicly Indexed Profiles via Gemini AI
                  </h4>
                  <p className="text-[11px] text-[#73685B] leading-relaxed">
                    Uses Google's Gemini API with built-in Google Search grounding to discover verified, publicly indexed personal LinkedIn profiles.
                  </p>
                </div>
              </div>

              <form onSubmit={handleGeminiSearch} className="space-y-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#292722] mb-1">Target Role</label>
                    <input
                      type="text"
                      value={geminiRole}
                      onChange={(e) => setGeminiRole(e.target.value)}
                      placeholder="e.g. AI/ML Engineer"
                      className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#292722] mb-1">Skills (Comma-separated)</label>
                    <input
                      type="text"
                      value={geminiSkills}
                      onChange={(e) => setGeminiSkills(e.target.value)}
                      placeholder="e.g. PyTorch, vLLM, Python"
                      className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#292722] mb-1">Location (Optional)</label>
                    <input
                      type="text"
                      value={geminiLocation}
                      onChange={(e) => setGeminiLocation(e.target.value)}
                      placeholder="e.g. San Francisco or Remote"
                      className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#292722] mb-1">Company (Optional)</label>
                    <input
                      type="text"
                      value={geminiCompany}
                      onChange={(e) => setGeminiCompany(e.target.value)}
                      placeholder="e.g. Google, Anthropic, Scale AI"
                      className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <span className="text-[10px] text-[#73685B]">
                    Strict anti-hallucination guard: ungrounded candidates not present in Google Search citations are discarded.
                  </span>

                  <button
                    type="submit"
                    disabled={geminiSearching || !geminiRole.trim()}
                    className="inline-flex items-center justify-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {geminiSearching ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Searching Web via Gemini AI...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 mr-1.5" />
                        Search Web via Gemini AI
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Error & Warning Banners */}
              {geminiError && (
                <div className="p-3.5 rounded-md bg-[#FCEEEE] border border-[#F0C4C4] text-[#942F2F] text-xs space-y-1">
                  <div className="flex items-center space-x-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Search Could Not Be Completed</span>
                  </div>
                  <p className="pl-6">{geminiError}</p>
                  {geminiErrorCode === 'MISSING_GEMINI_API_KEY' && (
                    <div className="pl-6 pt-1 text-[11px] text-[#73685B]">
                      Tip: Set the secret in your Supabase project using the CLI:
                      <code className="block mt-1 bg-[#1C1B19] text-[#FAF7F2] p-2 rounded font-mono text-[10px]">
                        npx supabase secrets set GEMINI_API_KEY=your_gemini_api_key
                      </code>
                    </div>
                  )}
                  {geminiErrorCode === 'AUTH_OR_PERMISSION_ERROR' && (
                    <p className="pl-6 text-[11px] text-[#73685B]">
                      Gemini API authentication failed. Please verify that your GEMINI_API_KEY is active and has access to the Generative Language API.
                    </p>
                  )}
                  {geminiErrorCode === 'MODEL_NOT_FOUND' && (
                    <p className="pl-6 text-[11px] text-[#73685B]">
                      The configured Gemini model is not accessible. You can set GEMINI_MODEL (e.g. gemini-2.5-flash) in your Supabase secrets.
                    </p>
                  )}
                  {geminiErrorCode === 'RATE_LIMIT_EXCEEDED' && (
                    <p className="pl-6 text-[11px] text-[#73685B]">
                      Gemini API rate limit reached. Please wait a minute before retrying.
                    </p>
                  )}
                  {(geminiErrorCode === 'GATEWAY_TIMEOUT' || geminiErrorCode === 'REQUEST_TIMEOUT') && (
                    <div className="pl-6 pt-1 text-[11px] text-[#73685B] space-y-1.5">
                      <p>
                        The search query took too long to complete upstream. This can occur when queries include multiple restrictive filters or the search provider is experiencing latency.
                      </p>
                      {!geminiIsBroader && (
                        <button
                          type="button"
                          onClick={() => handleGeminiSearch(undefined, true)}
                          disabled={geminiSearching}
                          className="inline-flex items-center font-semibold text-[#292722] hover:text-[#8A5A20] underline text-[11px]"
                        >
                          Try a faster broader query without company/location filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Discovered Candidates Feed */}
              {geminiResults.length > 0 && (
                <div className="pt-4 border-t border-[#D9CFC2] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-[#292722]">
                        Found {geminiResults.length} Candidate(s) via Web Search:
                      </span>
                      {geminiIsBroader && (
                        <span className="text-[10px] text-[#8A5A20] bg-[#8A5A20]/10 px-2 py-0.5 rounded-full font-mono">
                          Broader query
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleImportAllGeminiCandidates}
                      disabled={ingesting}
                      className="inline-flex items-center px-3 py-1 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-[11px] font-medium rounded-md disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Import All to Pipeline
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {geminiResults.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-3.5 text-xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-semibold text-sm text-[#292722]">{item.full_name}</span>
                              <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded-full border bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]">
                                {item.verification_status}
                              </span>
                            </div>
                            {item.headline && (
                              <p className="text-[11px] text-[#73685B] mt-0.5">{item.headline}</p>
                            )}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#73685B] mt-1">
                              {item.current_company && <span>Company: {item.current_company}</span>}
                              {item.location && <span>Location: {item.location}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleImportGeminiCandidate(item)}
                            disabled={ingesting}
                            className="shrink-0 inline-flex items-center px-3 py-1.5 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md disabled:opacity-50 self-start"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Import Candidate
                          </button>
                        </div>

                        {/* Evidence Snippet Callout */}
                        {item.snippet && (
                          <div className="p-2.5 bg-[#E8DFD3]/40 border border-[#D9CFC2] rounded-md text-[11px] space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#73685B] block">
                              Retrieved Search Evidence:
                            </span>
                            <blockquote className="italic text-[#292722] border-l-2 border-[#B49A7D] pl-2">
                              &ldquo;{item.snippet}&rdquo;
                            </blockquote>
                            {item.evidence_summary && (
                              <p className="text-[10px] text-[#73685B] pt-0.5">{item.evidence_summary}</p>
                            )}
                          </div>
                        )}

                        {/* Source Links - Strict separation of LinkedIn Profile URL vs Source Webpage */}
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px]">
                          {item.profile_url && (
                            <a
                              href={item.profile_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-[#292722] hover:text-[#B49A7D] hover:underline font-medium"
                            >
                              <span>LinkedIn Profile (/in/...)</span>
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                          {item.source_url && item.source_url !== item.profile_url && (
                            <a
                              href={item.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-[#73685B] hover:text-[#292722] hover:underline"
                            >
                              <span>Search Source Webpage</span>
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results Fallback with Rejection Reason Breakdown */}
              {geminiSearchDone && geminiResults.length === 0 && !geminiError && (
                <div className="p-5 text-left border border-[#D9CFC2] rounded-lg bg-[#FAF7F2] space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#292722]">
                    <AlertCircle className="w-4 h-4 text-[#8A5A20] shrink-0" />
                    <span>No Eligible LinkedIn Personal Profiles Found</span>
                  </div>
                  <p className="text-[11px] text-[#73685B] leading-relaxed">
                    {geminiIsBroader
                      ? 'The broader web search completed, but no candidates met the strict LinkedIn personal profile criteria (linkedin.com/in/ or linkedin.com/pub/) supported by Google Search grounding citations. Non-LinkedIn pages, GitHub profiles, and company pages were rejected to ensure candidate quality.'
                      : 'The targeted web search completed, but no candidates met the strict LinkedIn personal profile validation criteria (linkedin.com/in/ or linkedin.com/pub/) supported by Google Search grounding citations. Non-LinkedIn pages, GitHub profiles, and company pages were rejected.'}
                  </p>

                  {geminiDiagnostics && (
                    <div className="flex flex-wrap gap-2 text-[10px] font-mono text-[#73685B]">
                      <span className="bg-[#E8DFD3] px-2 py-0.5 rounded">Citations: {geminiDiagnostics.citationsCount}</span>
                      <span className="bg-[#E8DFD3] px-2 py-0.5 rounded">URLs Extracted: {geminiDiagnostics.totalUrlsExtracted}</span>
                      <span className="bg-[#E8DFD3] px-2 py-0.5 rounded">Verified Profiles: {geminiDiagnostics.validPersonalProfiles}</span>
                      <span className="bg-[#E8DFD3] px-2 py-0.5 rounded">Rejected Non-LinkedIn: {geminiDiagnostics.rejectedNonLinkedIn}</span>
                      {geminiDiagnostics.notInCitationAllowList > 0 && (
                        <span className="bg-[#E8DFD3] px-2 py-0.5 rounded">Ungrounded: {geminiDiagnostics.notInCitationAllowList}</span>
                      )}
                      {geminiDiagnostics.duplicatesFiltered > 0 && (
                        <span className="bg-[#E8DFD3] px-2 py-0.5 rounded">Duplicates Filtered: {geminiDiagnostics.duplicatesFiltered}</span>
                      )}
                    </div>
                  )}

                  {geminiRejectedCount > 0 && geminiRejectionBreakdown && (
                    <div className="p-3 bg-[#E8DFD3]/40 border border-[#D9CFC2] rounded-md space-y-1 text-[11px]">
                      <span className="font-semibold text-[#292722] block">
                        Filtered {geminiRejectedCount} result(s) during verification:
                      </span>
                      <ul className="space-y-0.5 text-[#73685B] pl-2 list-disc list-inside">
                        {geminiRejectionBreakdown.githubOrNonLinkedIn > 0 && (
                          <li>
                            {geminiRejectionBreakdown.githubOrNonLinkedIn} result(s) rejected: Non-LinkedIn, GitHub, or third-party/lookalike URLs (only personal LinkedIn profiles accepted)
                          </li>
                        )}
                        {geminiRejectionBreakdown.companyOrDirectory > 0 && (
                          <li>
                            {geminiRejectionBreakdown.companyOrDirectory} result(s) rejected: LinkedIn company, school, or directory pages
                          </li>
                        )}
                        {geminiRejectionBreakdown.notInCitationAllowList > 0 && (
                          <li>
                            {geminiRejectionBreakdown.notInCitationAllowList} result(s) rejected: Profile URL was not evidenced in Google Search grounding source citations
                          </li>
                        )}
                        {geminiRejectionBreakdown.missingEvidence > 0 && (
                          <li>
                            {geminiRejectionBreakdown.missingEvidence} result(s) rejected: Missing verifiable evidence snippet
                          </li>
                        )}
                        {geminiRejectionBreakdown.missingOrMalformedUrl > 0 && (
                          <li>
                            {geminiRejectionBreakdown.missingOrMalformedUrl} result(s) rejected: Missing or malformed URLs
                          </li>
                        )}
                        {geminiRejectionBreakdown.invalidName > 0 && (
                          <li>
                            {geminiRejectionBreakdown.invalidName} result(s) rejected: Missing or placeholder names
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {!geminiIsBroader ? (
                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#D9CFC2]/60">
                      <p className="text-[11px] text-[#73685B]">
                        Zero results with your specific filters? Run a broader search without location or company restrictions:
                      </p>
                      <button
                        type="button"
                        onClick={() => handleGeminiSearch(undefined, true)}
                        disabled={geminiSearching}
                        className="shrink-0 inline-flex items-center px-3 py-1.5 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#C6A76B]" />
                        Search with Broader Criteria
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#73685B]">
                      Try adjusting your target role title or primary skills above.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Auxiliary Manual Search Templates (Google) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#292722] uppercase tracking-wider">
                  Manual Search Templates (Google Fallback)
                </span>
                <span className="text-[11px] text-[#73685B]">Opens in new tab</span>
              </div>
              <p className="text-xs text-[#73685B] leading-relaxed">
                If you prefer manual browsing, Google indexes public LinkedIn profiles. Click any template to view search results directly:
              </p>

              <div className="space-y-2.5">
                {webQueries.map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-md p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <span className="font-semibold text-[#292722] block">{item.title}</span>
                      <p className="text-[#73685B] text-[11px]">{item.description}</p>
                      <code className="text-[10px] bg-[#E8DFD3] px-2 py-0.5 rounded text-[#292722] font-mono block sm:inline-block">
                        {item.query}
                      </code>
                    </div>

                    <a
                      href={item.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center justify-center px-3.5 py-1.5 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] text-xs font-medium rounded-md border border-[#D9CFC2] transition-colors"
                    >
                      <span>Search on Google</span>
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Manual Single Profile Ingestion */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  Full Name <span className="text-[#942F2F]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Dr. Aris Thorne"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  LinkedIn URL <span className="text-[#942F2F]">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/aris-thorne"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  Headline / Role
                </label>
                <input
                  type="text"
                  value={manualHeadline}
                  onChange={(e) => setManualHeadline(e.target.value)}
                  placeholder="e.g. Senior Research Scientist | PyTorch"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  Current Company
                </label>
                <input
                  type="text"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  placeholder="e.g. Google DeepMind"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="e.g. San Francisco or Remote"
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#292722] mb-1">
                  Category
                </label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as CandidateCategory)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
                >
                  <option value="engineer">Engineer / Developer</option>
                  <option value="recruiter">Technical Recruiter</option>
                  <option value="founder">Startup Founder</option>
                  <option value="alumni">Campus Alum</option>
                  <option value="mentor">Industry Mentor</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={ingesting || !manualName || !manualUrl}
                className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                {ingesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Add Candidate
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Candidate Curation Dashboard & Filter Station */}
      <div className="space-y-4">
        {/* Review Status Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#D9CFC2] pb-3">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            All Candidates
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#E8DFD3] text-[#292722] text-[10px] font-mono">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-[#73685B]" />
            Pending Review
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#E8DFD3] text-[#292722] text-[10px] font-mono">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('shortlisted')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'shortlisted'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 mr-1.5 text-[#8A5A20]" />
            Shortlisted
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#E8DFD3] text-[#292722] text-[10px] font-mono">
              {shortlistedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'approved'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <Check className="w-3.5 h-3.5 mr-1.5 text-[#2E5A36]" />
            Approved for Outreach
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#E8DFD3] text-[#292722] text-[10px] font-mono">
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('dismissed')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === 'dismissed'
                ? 'bg-[#292722] text-[#FAF7F2]'
                : 'bg-[#FAF7F2] border border-[#D9CFC2] text-[#73685B] hover:text-[#292722]'
            }`}
          >
            <X className="w-3.5 h-3.5 mr-1.5 text-[#73685B]" />
            Skipped
            <span className="ml-1.5 px-1.5 py-0.2 rounded bg-[#E8DFD3] text-[#292722] text-[10px] font-mono">
              {skippedCount}
            </span>
          </button>
        </div>

        {/* Multi-Dimensional Filter Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2] border border-[#D9CFC2] p-3 rounded-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#73685B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate name, headline, company, or location..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#B49A7D]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
            >
              <option value="all">All Roles</option>
              <option value="engineer">Engineers</option>
              <option value="recruiter">Recruiters</option>
              <option value="founder">Founders</option>
              <option value="alumni">Campus Alumni</option>
              <option value="mentor">Mentors</option>
            </select>

            {/* Company Filter */}
            {uniqueCompanies.length > 0 && (
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D] max-w-[140px] truncate"
              >
                <option value="all">All Companies</option>
                {uniqueCompanies.map((comp) => (
                  <option key={comp} value={comp}>
                    {comp}
                  </option>
                ))}
              </select>
            )}

            {/* Score Threshold Filter */}
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-md text-xs text-[#292722] focus:outline-none focus:border-[#B49A7D]"
            >
              <option value="all">All Scores</option>
              <option value="high">High Match (&ge;80%)</option>
              <option value="medium">Medium (60-79%)</option>
              <option value="low">Under 60%</option>
            </select>
          </div>
        </div>

        {/* Candidate Feed */}
        {loading ? (
          <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg">
            <Loader2 className="w-6 h-6 animate-spin text-[#292722] mx-auto mb-2" />
            <p className="text-xs uppercase tracking-wider text-[#73685B]">Loading candidate recommendations...</p>
          </div>
        ) : filteredCandidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCandidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onStatusChange={handleStatusChange}
                onOpenOutreach={onNavigateToOutreach}
                isUpdating={updatingId === candidate.id}
              />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg space-y-3">
            <Filter className="w-8 h-8 text-[#B49A7D] mx-auto" />
            <h4 className="text-sm font-semibold text-[#292722]">
              {filterStatus === 'approved'
                ? 'No candidates approved for networking yet'
                : filterStatus === 'shortlisted'
                ? 'No candidates in your shortlist'
                : filterStatus === 'dismissed'
                ? 'No skipped candidates'
                : 'No candidates matched your search filters'}
            </h4>
            <p className="text-xs text-[#73685B] max-w-sm mx-auto leading-relaxed">
              {filterStatus === 'approved'
                ? 'Review your pending recommendations and click "Approve for Networking" to prepare personalized outreach messages.'
                : filterStatus === 'shortlisted'
                ? 'Click "Shortlist" on any candidate card to save prospects for follow-up review.'
                : 'Try adjusting your search query, company filter, or status view.'}
            </p>
            {candidates.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('csv')
                  handleLoadSampleCSV()
                }}
                className="inline-flex items-center px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs font-medium rounded-md transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Load Demo Candidates (Sample Data)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
