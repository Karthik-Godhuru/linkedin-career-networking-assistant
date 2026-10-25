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
import type { CandidateRawInput, CandidateCategory, CandidateStatus } from '../../types/candidate'

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

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualName || !manualUrl) return

    const newCandidate: CandidateRawInput = {
      full_name: manualName,
      headline: manualHeadline,
      current_company: manualCompany,
      location: manualLocation,
      profile_url: manualUrl,
      source: 'manual_entry',
      category: manualCategory,
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

  // Curation Status Change Handler
  const handleStatusChange = async (candidateId: string, newStatus: CandidateStatus) => {
    const cand = candidates.find((c) => c.id === candidateId)
    const res = await updateCandidateStatus(candidateId, newStatus)
    if (res.success && cand) {
      setDecisionFeedback({ name: cand.full_name, status: newStatus })
      setTimeout(() => setDecisionFeedback(null), 3500)
    }
  }

  // Status Metrics
  const totalCount = candidates.length
  const pendingCount = candidates.filter((c) => c.status === 'pending').length
  const shortlistedCount = candidates.filter((c) => c.status === 'shortlisted').length
  const approvedCount = candidates.filter((c) => c.status === 'approved').length
  const skippedCount = candidates.filter((c) => c.status === 'dismissed').length

  // Dynamic filter options
  const uniqueCompanies = Array.from(
    new Set(candidates.map((c) => c.current_company).filter(Boolean) as string[])
  ).sort()

  // Filter candidates across all criteria
  const filteredCandidates = candidates.filter((c) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      c.full_name.toLowerCase().includes(q) ||
      (c.headline || '').toLowerCase().includes(q) ||
      (c.current_company || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q)

    const matchesCategory = filterCategory === 'all' || c.category === filterCategory
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus
    const matchesCompany = filterCompany === 'all' || c.current_company === filterCompany

    const score = c.match_score ?? 50
    let matchesScore = true
    if (filterScore === 'high') matchesScore = score >= 80
    else if (filterScore === 'medium') matchesScore = score >= 60 && score < 80
    else if (filterScore === 'low') matchesScore = score < 60

    return matchesSearch && matchesCategory && matchesStatus && matchesCompany && matchesScore
  })

  return (
    <div className="space-y-8 text-left max-w-5xl mx-auto">
      {/* Top Overview Banner with Milestone 4 Status Counters */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Milestone 4 &bull; Candidate Curation & Approval Dashboard</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Candidate Review & Human Approval Hub
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Curate discovered profiles against your career preferences. Shortlist top prospects, approve candidates for networking outreach, or skip unwanted records.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Total</span>
                <Users className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono mt-0.5">{totalCount}</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Pending</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-lg font-bold text-slate-200 font-mono mt-0.5">{pendingCount}</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Shortlist</span>
                <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{shortlistedCount}</div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Approved</span>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-emerald-300 font-mono mt-0.5">{approvedCount}</div>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {decisionFeedback && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-800/80 flex items-center space-x-3 text-emerald-200 text-xs sm:text-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-semibold">{decisionFeedback.name}</span>{' '}
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
          <div className="mt-4 p-3.5 rounded-xl bg-blue-950/70 border border-blue-800/80 flex items-center space-x-3 text-blue-200 text-xs sm:text-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="font-semibold">Ingestion complete!</span>{' '}
              <span>
                Added {ingestNotice.added} new candidates ({ingestNotice.skippedDuplicates} duplicate(s) filtered out).
              </span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-950/70 border border-red-800/80 flex items-center space-x-3 text-red-200 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Discovery & Ingestion Pipeline Drawer */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-4 flex items-center space-x-2">
          <span>Import & Discover New Candidates</span>
          <span className="text-[11px] font-mono text-slate-500 font-normal">(Permitted Sources Only)</span>
        </h3>

        {/* Ingestion Source Tabs */}
        <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('csv')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'csv'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            CSV / Spreadsheets
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'github'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 mr-1.5" />
            GitHub Developers
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('web')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'web'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5 mr-1.5" />
            Permitted Web Search Queries
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'manual'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/80 text-slate-400 hover:text-white'
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
              <label className="block text-xs font-medium text-slate-300">
                Paste CSV Data or LinkedIn Archive Export
              </label>
              <button
                type="button"
                onClick={handleLoadSampleCSV}
                className="text-xs text-blue-400 hover:text-blue-300 hover:underline"
              >
                Load Sample AI/ML Data
              </button>
            </div>

            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Full Name,Headline,Company,Location,URL&#10;Elena Vance,Senior ML Engineer,vLLM Labs,San Francisco,https://www.linkedin.com/in/elena-vance"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Supports LinkedIn export format or custom columns (Full Name, URL, Role, Company, Location).
              </span>

              <button
                type="submit"
                disabled={ingesting || !csvText.trim()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {ingesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Ingesting & Scoring...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Parse & Ingest CSV
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
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Search Open Source Contributors by Technology
                </label>
                <input
                  type="text"
                  value={githubSkill}
                  onChange={(e) => setGithubSkill(e.target.value)}
                  placeholder="e.g. PyTorch, vLLM, LangChain, FastAPI"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleGitHubSearch}
                  disabled={githubSearching}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
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
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <span className="text-xs font-semibold text-slate-300">
                  Found {githubResults.length} open-source developers:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {githubResults.map((dev, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">{dev.full_name}</div>
                        <p className="text-slate-400 text-[11px] mt-0.5 line-clamp-1">{dev.headline}</p>
                        <span className="text-[10px] text-slate-500">{dev.location}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImportGitHubUser(dev)}
                        disabled={ingesting}
                        className="shrink-0 inline-flex items-center px-2.5 py-1 bg-blue-600/90 hover:bg-blue-500 text-white text-[11px] font-medium rounded-lg"
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

        {/* Tab 3: Compliant Web Search Builder */}
        {activeTab === 'web' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Google indexes public LinkedIn profiles for career discovery. These pre-configured queries find engineers matching your criteria without triggering LinkedIn anti-scraping flags:
            </p>

            <div className="space-y-3">
              {webQueries.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-semibold text-white block">{item.title}</span>
                    <p className="text-slate-400 text-[11px]">{item.description}</p>
                    <code className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-blue-300 font-mono block sm:inline-block">
                      {item.query}
                    </code>
                  </div>

                  <a
                    href={item.searchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-xl border border-slate-700 transition-colors"
                  >
                    <span>Search on Google</span>
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Manual Single Profile Ingestion */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="e.g. Dr. Aris Thorne"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  LinkedIn URL <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/aris-thorne"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Headline / Role
                </label>
                <input
                  type="text"
                  value={manualHeadline}
                  onChange={(e) => setManualHeadline(e.target.value)}
                  placeholder="e.g. Senior Research Scientist | PyTorch"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current Company
                </label>
                <input
                  type="text"
                  value={manualCompany}
                  onChange={(e) => setManualCompany(e.target.value)}
                  placeholder="e.g. Google DeepMind"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={manualLocation}
                  onChange={(e) => setManualLocation(e.target.value)}
                  placeholder="e.g. San Francisco or Remote"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value as CandidateCategory)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
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
      <div className="space-y-5">
        {/* Review Status Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Candidates
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-[10px] font-mono">
              {totalCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('pending')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStatus === 'pending'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Pending Review
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-[10px] font-mono">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('shortlisted')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStatus === 'shortlisted'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
            Shortlisted
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-[10px] font-mono">
              {shortlistedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('approved')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Approved for Outreach
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-[10px] font-mono">
              {approvedCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus('dismissed')}
            className={`inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filterStatus === 'dismissed'
                ? 'bg-zinc-700 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
            Skipped
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-slate-950/70 text-[10px] font-mono">
              {skippedCount}
            </span>
          </button>
        </div>

        {/* Multi-Dimensional Filter Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search candidate name, headline, company, or location..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
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
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500 max-w-[140px] truncate"
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
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Scores</option>
              <option value="high">High Match (≥80%)</option>
              <option value="medium">Medium (60-79%)</option>
              <option value="low">Under 60%</option>
            </select>
          </div>
        </div>

        {/* Candidate Feed */}
        {loading ? (
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading candidate recommendations...</p>
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
          <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3">
            <Filter className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-white">
              {filterStatus === 'approved'
                ? 'No candidates approved for networking yet'
                : filterStatus === 'shortlisted'
                ? 'No candidates in your shortlist'
                : filterStatus === 'dismissed'
                ? 'No skipped candidates'
                : 'No candidates matched your search filters'}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                className="inline-flex items-center px-4 py-2 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Load Sample Candidates
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
