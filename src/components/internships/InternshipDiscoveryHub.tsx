import React, { useState, useMemo } from 'react'
import { useInternships } from '../../hooks/useInternships'
import { useCareerProfile } from '../../hooks/useCareerProfile'
import { InternshipCard } from './InternshipCard'
import { ManualEntryModal } from './ManualEntryModal'
import { CsvImportModal } from './CsvImportModal'
import { buildInternshipSearchQueries } from '../../services/ingestion/internshipSearchQueries'
import type { WorkMode } from '../../types/internship'
import {
  Briefcase,
  Search,
  Plus,
  Upload,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react'

function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getSevenDaysLaterString(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export const InternshipDiscoveryHub: React.FC = () => {
  const {
    internships,
    loading,
    savingId,
    error,
    successMessage,
    clearError,
    clearSuccess,
    addInternship,
    importBatch,
    updateInternship,
    deleteInternship,
    metrics,
  } = useInternships()

  const { profile } = useCareerProfile()

  // Navigation tab within Internship Hub
  const [activeSubTab, setActiveSubTab] = useState<'opportunities' | 'pipeline' | 'deadlines' | 'search'>('opportunities')

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [workModeFilter, setWorkModeFilter] = useState<string>('all')
  const [scoreFilter, setScoreFilter] = useState<string>('all')

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false)

  // Search queries for official ATS boards
  const atsSearchQueries = useMemo(() => {
    return buildInternshipSearchQueries(profile)
  }, [profile])

  // Filtered internships
  const filteredInternships = useMemo(() => {
    return internships.filter((item) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = item.title.toLowerCase().includes(q)
        const companyMatch = item.company.toLowerCase().includes(q)
        const locMatch = (item.location || '').toLowerCase().includes(q)
        const skillMatch = item.required_skills.some((s) => s.toLowerCase().includes(q))
        if (!titleMatch && !companyMatch && !locMatch && !skillMatch) return false
      }

      // Status
      if (statusFilter !== 'all' && item.status !== statusFilter) {
        return false
      }

      // Work mode
      if (workModeFilter !== 'all' && item.work_mode !== workModeFilter) {
        return false
      }

      // Score filter
      if (scoreFilter === 'high' && (item.match_score ?? 0) < 80) return false
      if (scoreFilter === 'medium' && (item.match_score ?? 0) < 60) return false

      return true
    })
  }, [internships, searchQuery, statusFilter, workModeFilter, scoreFilter])

  // Deadlines grouped: Overdue, Next 7 Days, Later
  const deadlineGroups = useMemo(() => {
    const today = getTodayString()
    const sevenDaysFromNow = getSevenDaysLaterString()

    const overdue: typeof internships = []
    const upcoming: typeof internships = []
    const future: typeof internships = []

    for (const item of internships) {
      if (!item.deadline) continue
      if (['applied', 'offered', 'rejected', 'withdrawn'].includes(item.status)) continue

      if (item.deadline < today) {
        overdue.push(item)
      } else if (item.deadline <= sevenDaysFromNow) {
        upcoming.push(item)
      } else {
        future.push(item)
      }
    }

    return { overdue, upcoming, future }
  }, [internships])

  return (
    <div className="space-y-6">
      {/* Top Banner: Status & Compliance - Dark Cinematic Panel (Antique Parian Luxury) */}
      <div className="bg-[#1C1B19] border border-[#C6A76B]/40 rounded-2xl p-6 sm:p-7 shadow-md relative overflow-hidden">
        {/* Subtle decorative gold ambient glow */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#C6A76B]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-3 py-1 rounded-full bg-[#111110] text-[#C6A76B] border border-[#C6A76B]/30 shadow-xs">
                Milestone 7 Engine
              </span>
              <span className="text-xs font-medium text-[#C6A76B] flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#2E5A36]" />
                <span className="text-[#FAF7F2]/80">Zero-Scraping Compliant</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-light text-[#FAF7F2] tracking-tight mt-2.5 flex items-center gap-2.5">
              <Briefcase className="w-6 h-6 text-[#C6A76B]" />
              Internship Discovery &amp; Application Tracker
            </h1>
            <p className="text-xs sm:text-sm text-[#FAF7F2]/70 mt-1.5 max-w-2xl leading-relaxed">
              Discover verified technical internships, match against your target roles and skills, and track application stages from submission to offer.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-[#C6A76B] hover:bg-[#D4B87D] text-[#1C1B19] rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Opportunity
            </button>

            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center px-4 py-2.5 bg-[#111110] hover:bg-[#1C1B19] text-[#FAF7F2] border border-[#514435] rounded-xl text-xs font-semibold transition-all"
            >
              <Upload className="w-4 h-4 mr-1.5 text-[#C6A76B]" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Success & Error Banners */}
        {error && (
          <div className="mt-4 p-3 bg-[#FCEEEE] border border-[#F0C4C4] text-[#942F2F] rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={clearError} className="text-[#942F2F] hover:text-[#292722] font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-[#EAF2EC] border border-[#C6DEC9] text-[#2E5A36] rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={clearSuccess} className="text-[#2E5A36] hover:text-[#292722] font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-mono text-[#73685B] uppercase tracking-wider">Total Tracked</div>
          <div className="text-2xl font-semibold text-[#292722] mt-1">{metrics.total}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Opportunities</div>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-mono text-[#73685B] uppercase tracking-wider">Interested</div>
          <div className="text-2xl font-semibold text-[#292722] mt-1">{metrics.savedCount}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Saved for apply</div>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-mono text-[#8A5A20] uppercase tracking-wider">Applied</div>
          <div className="text-2xl font-semibold text-[#8A5A20] mt-1">{metrics.appliedCount}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Submitted</div>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-mono text-[#73685B] uppercase tracking-wider">Interviews / OA</div>
          <div className="text-2xl font-semibold text-[#292722] mt-1">{metrics.interviewCount}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Active rounds</div>
        </div>

        <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 shadow-sm">
          <div className="text-[10px] font-mono text-[#2E5A36] uppercase tracking-wider">Offers</div>
          <div className="text-2xl font-semibold text-[#2E5A36] mt-1">{metrics.offerCount}</div>
          <div className="text-[10px] text-[#73685B] mt-0.5">Received</div>
        </div>

        <div
          className={`rounded-2xl p-4 border transition-colors shadow-sm ${
            metrics.overdueCount > 0
              ? 'bg-[#FCEEEE] border-[#F0C4C4] text-[#942F2F]'
              : metrics.upcomingDeadlineCount > 0
              ? 'bg-[#FBF4E8] border-[#E8D5B5] text-[#8A5A20]'
              : 'bg-[#FAF7F2] border-[#D9CFC2] text-[#73685B]'
          }`}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider">Deadlines</div>
          <div className="text-2xl font-semibold mt-1">
            {metrics.overdueCount > 0 ? (
              <span className="text-[#942F2F]">{metrics.overdueCount} Overdue</span>
            ) : (
              <span className="text-[#8A5A20]">{metrics.upcomingDeadlineCount} Soon</span>
            )}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">Next 7 days</div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#D9CFC2] pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('opportunities')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'opportunities'
              ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
              : 'text-[#73685B] hover:text-[#292722] bg-[#FAF7F2] border border-[#D9CFC2]'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2 text-[#B49A7D]" />
          Opportunities & Matching ({filteredInternships.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pipeline')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'pipeline'
              ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
              : 'text-[#73685B] hover:text-[#292722] bg-[#FAF7F2] border border-[#D9CFC2]'
          }`}
        >
          <Layers className="w-4 h-4 mr-2 text-[#73685B]" />
          Application Tracker Pipeline
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('deadlines')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'deadlines'
              ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
              : 'text-[#73685B] hover:text-[#292722] bg-[#FAF7F2] border border-[#D9CFC2]'
          }`}
        >
          <Calendar className="w-4 h-4 mr-2 text-[#8A5A20]" />
          Deadlines & Reminders
          {(metrics.overdueCount > 0 || metrics.upcomingDeadlineCount > 0) && (
            <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FCEEEE] text-[#942F2F] border border-[#F0C4C4]">
              {metrics.overdueCount + metrics.upcomingDeadlineCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('search')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'search'
              ? 'bg-[#292722] text-[#FAF7F2] shadow-sm'
              : 'text-[#73685B] hover:text-[#292722] bg-[#FAF7F2] border border-[#D9CFC2]'
          }`}
        >
          <Search className="w-4 h-4 mr-2 text-[#2E5A36]" />
          Permitted ATS Searches
        </button>
      </div>

      {/* 1. OPPORTUNITIES & MATCHING VIEW */}
      {activeSubTab === 'opportunities' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-[#73685B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, company, skills..."
                className="w-full pl-9 pr-3 py-2 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl text-xs text-[#292722] placeholder-[#73685B]/60 focus:outline-none focus:border-[#292722]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#F4EEE6] border border-[#D9CFC2] text-[#292722] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#292722]"
              >
                <option value="all">All Stages</option>
                <option value="bookmarked">Saved / Interested</option>
                <option value="applied">Applied</option>
                <option value="assessment">Online Assessment (OA)</option>
                <option value="interviewing">Interviewing</option>
                <option value="offered">Offer Received</option>
                <option value="rejected">Declined</option>
              </select>

              {/* Work Mode Filter */}
              <select
                value={workModeFilter}
                onChange={(e) => setWorkModeFilter(e.target.value as WorkMode | 'all')}
                className="bg-[#F4EEE6] border border-[#D9CFC2] text-[#292722] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#292722]"
              >
                <option value="all">All Work Modes</option>
                <option value="remote">Remote Only</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">Onsite</option>
              </select>

              {/* Score Filter */}
              <select
                value={scoreFilter}
                onChange={(e) => setScoreFilter(e.target.value)}
                className="bg-[#F4EEE6] border border-[#D9CFC2] text-[#292722] text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-[#292722]"
              >
                <option value="all">All Match Scores</option>
                <option value="high">High Match (80%+)</option>
                <option value="medium">Medium+ (60%+)</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-12 text-center text-[#73685B] shadow-sm">
              <Clock className="w-8 h-8 mx-auto animate-spin text-[#B49A7D] mb-2" />
              <p className="text-sm">Loading internship opportunities & matching against career profile...</p>
            </div>
          ) : filteredInternships.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredInternships.map((internship) => (
                <InternshipCard
                  key={internship.id}
                  internship={internship}
                  onUpdateStatus={(id, st) => updateInternship(id, { status: st })}
                  onUpdateNotes={(id, n) => updateInternship(id, { notes: n })}
                  onUpdateDeadline={(id, d) => updateInternship(id, { deadline: d })}
                  onDelete={(id) => deleteInternship(id)}
                  isSaving={savingId === internship.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-12 text-center space-y-3 shadow-sm">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-[#73685B]" />
              <h3 className="text-sm font-semibold text-[#292722]">No opportunities match current filter</h3>
              <p className="text-xs text-[#73685B] max-w-md mx-auto">
                Try clearing filters, importing a CSV of internship postings, or entering an opportunity manually.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setStatusFilter('all')
                    setWorkModeFilter('all')
                    setScoreFilter('all')
                  }}
                  className="px-4 py-2 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] text-xs rounded-xl font-medium"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-4 py-2 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-xs rounded-xl font-semibold shadow-sm"
                >
                  Add Opportunity
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. PIPELINE STAGE TRACKER VIEW */}
      {activeSubTab === 'pipeline' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Column 1: Saved / Interested */}
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9CFC2]">
                <h3 className="text-[11px] font-bold text-[#73685B] uppercase tracking-wider">1. Saved / Interested</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD3] text-[#292722] font-bold">
                  {internships.filter((i) => i.status === 'bookmarked' || i.status === 'discovered').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'bookmarked' || i.status === 'discovered')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-[#292722] truncate">{item.title}</div>
                      <div className="text-[#73685B] text-[11px] truncate">{item.company} &bull; {item.location || 'Remote'}</div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#D9CFC2]">
                        <span className="font-mono text-[10px] text-[#73685B] font-semibold">{item.match_score}% match</span>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'applied' })}
                          className="px-2 py-1 bg-[#8A5A20] hover:bg-[#6E4717] text-[#FAF7F2] text-[10px] font-semibold rounded-lg shadow-sm"
                        >
                          Mark Applied &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: Applied */}
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9CFC2]">
                <h3 className="text-[11px] font-bold text-[#8A5A20] uppercase tracking-wider">2. Applied</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#FBF4E8] text-[#8A5A20] border border-[#E8D5B5] font-bold">
                  {internships.filter((i) => i.status === 'applied').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'applied')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-[#292722] truncate">{item.title}</div>
                      <div className="text-[#73685B] text-[11px] truncate">{item.company}</div>
                      {item.applied_at && (
                        <div className="text-[10px] text-[#2E5A36] font-medium">
                          Applied {new Date(item.applied_at).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-[#D9CFC2] gap-1">
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'assessment' })}
                          className="px-2 py-1 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] border border-[#D9CFC2] text-[10px] font-semibold rounded-lg"
                        >
                          OA &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'interviewing' })}
                          className="px-2 py-1 bg-[#2E5A36] hover:bg-[#234529] text-[#FAF7F2] text-[10px] font-semibold rounded-lg shadow-sm"
                        >
                          Interview &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 3: OA / Technical Assessment */}
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9CFC2]">
                <h3 className="text-[11px] font-bold text-[#73685B] uppercase tracking-wider">3. OA / Test</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD3] text-[#292722] font-bold">
                  {internships.filter((i) => i.status === 'assessment').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'assessment')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-[#292722] truncate">{item.title}</div>
                      <div className="text-[#73685B] text-[11px] truncate">{item.company}</div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#D9CFC2]">
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'interviewing' })}
                          className="px-2 py-1 bg-[#2E5A36] hover:bg-[#234529] text-[#FAF7F2] text-[10px] font-semibold rounded-lg shadow-sm"
                        >
                          Passed &rarr; Interview
                        </button>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'rejected' })}
                          className="text-[#73685B] hover:text-[#942F2F] text-[10px] transition-colors"
                        >
                          Declined
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 4: Interviewing */}
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9CFC2]">
                <h3 className="text-[11px] font-bold text-[#2E5A36] uppercase tracking-wider">4. Interviewing</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9] font-bold">
                  {internships.filter((i) => i.status === 'interviewing').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'interviewing')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-[#F4EEE6] border border-[#D9CFC2] rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-[#292722] truncate">{item.title}</div>
                      <div className="text-[#73685B] text-[11px] truncate">{item.company}</div>
                      <div className="flex items-center justify-between pt-1 border-t border-[#D9CFC2]">
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'offered' })}
                          className="px-2.5 py-1 bg-[#292722] hover:bg-[#3D3A33] text-[#FAF7F2] text-[10px] font-semibold rounded-lg shadow-sm"
                        >
                          Offer Received! 🎉
                        </button>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'rejected' })}
                          className="text-[#73685B] hover:text-[#942F2F] text-[10px] transition-colors"
                        >
                          Declined
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 5: Offers / Closed */}
            <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-4 flex flex-col space-y-3 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-[#D9CFC2]">
                <h3 className="text-[11px] font-bold text-[#73685B] uppercase tracking-wider">5. Offers & Outcome</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8DFD3] text-[#292722] font-bold">
                  {internships.filter((i) => ['offered', 'rejected', 'withdrawn'].includes(i.status)).length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => ['offered', 'rejected', 'withdrawn'].includes(i.status))
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 bg-[#F4EEE6] border rounded-xl space-y-1.5 text-xs ${
                        item.status === 'offered' ? 'border-[#C6DEC9] bg-[#EAF2EC]/50' : 'border-[#D9CFC2] opacity-75'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#292722] truncate">{item.title}</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                            item.status === 'offered'
                              ? 'bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9]'
                              : 'bg-[#E8DFD3] text-[#73685B]'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-[#73685B] text-[11px]">{item.company}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. DEADLINES & REMINDERS VIEW */}
      {activeSubTab === 'deadlines' && (
        <div className="space-y-6">
          <div className="p-5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl space-y-1 shadow-sm">
            <h3 className="text-sm font-semibold text-[#292722] flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-[#8A5A20]" />
              Application Deadlines & Follow-Up Tracker
            </h3>
            <p className="text-xs text-[#73685B]">
              In-app reminders are active while you use the dashboard. (No external email or background daemon runs when closed).
            </p>
          </div>

          {/* Overdue Section */}
          {deadlineGroups.overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-[#942F2F] text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                <span>Overdue Opportunities ({deadlineGroups.overdue.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deadlineGroups.overdue.map((item) => (
                  <div key={item.id} className="p-4 bg-[#FCEEEE] border border-[#F0C4C4] rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <div className="font-semibold text-[#292722] text-sm">{item.title}</div>
                      <div className="text-xs text-[#73685B]">{item.company}</div>
                      <div className="text-xs text-[#942F2F] font-mono mt-1 font-semibold">Deadline passed: {item.deadline}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={item.posting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#FAF7F2]/90 border border-[#F0C4C4] text-[#942F2F] text-xs rounded-xl font-medium inline-flex items-center transition-colors"
                      >
                        Check Portal <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming within 7 days */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-[#8A5A20] text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Urgent Deadlines (Next 7 Days) — ({deadlineGroups.upcoming.length})</span>
            </div>
            {deadlineGroups.upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deadlineGroups.upcoming.map((item) => (
                  <div key={item.id} className="p-4 bg-[#FBF4E8] border border-[#E8D5B5] rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                    <div>
                      <div className="font-semibold text-[#292722] text-sm">{item.title}</div>
                      <div className="text-xs text-[#73685B]">{item.company}</div>
                      <div className="text-xs text-[#8A5A20] font-mono mt-1 font-semibold">Closing: {item.deadline}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateInternship(item.id, { status: 'applied' })}
                        className="px-3.5 py-1.5 bg-[#8A5A20] hover:bg-[#6E4717] text-[#FAF7F2] text-xs rounded-xl font-semibold shadow-sm transition-colors"
                      >
                        Mark Applied
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl text-center text-xs text-[#73685B] shadow-sm">
                No urgent deadlines due in the next 7 days.
              </div>
            )}
          </div>

          {/* Later Deadlines */}
          {deadlineGroups.future.length > 0 && (
            <div className="space-y-3">
              <div className="text-[#73685B] text-xs font-bold uppercase tracking-wider">
                Upcoming Future Deadlines ({deadlineGroups.future.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {deadlineGroups.future.map((item) => (
                  <div key={item.id} className="p-4 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl space-y-2 shadow-sm">
                    <div className="font-semibold text-[#292722] text-xs truncate">{item.title}</div>
                    <div className="text-[#73685B] text-[11px]">{item.company}</div>
                    <div className="text-xs font-mono text-[#73685B]">Apply by: {item.deadline}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PERMITTED ATS SEARCHES VIEW */}
      {activeSubTab === 'search' && (
        <div className="space-y-4">
          <div className="p-5 bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl space-y-2 shadow-sm">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-[#2E5A36]" />
              <h3 className="text-base font-semibold text-[#292722] tracking-tight">
                Permitted Google ATS Discovery Queries
              </h3>
            </div>
            <p className="text-xs text-[#73685B] max-w-2xl leading-relaxed">
              These pre-built search templates query official applicant tracking systems (Greenhouse, Lever, Ashby, Workday) for public internship listings matching your saved target roles (<span className="text-[#292722] font-semibold">{profile.target_roles.join(', ') || 'AI/ML'}</span>) and skills (<span className="text-[#2E5A36] font-semibold">{profile.target_skills.slice(0, 3).join(', ') || 'Python'}</span>).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atsSearchQueries.map((template, idx) => (
              <div key={idx} className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF2EC] text-[#2E5A36] border border-[#C6DEC9]">
                      {template.targetPlatform}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-[#292722] mt-2">{template.title}</h4>
                  <p className="text-xs text-[#73685B] mt-1">{template.description}</p>
                  <div className="mt-3 p-3 rounded-xl bg-[#F4EEE6] border border-[#D9CFC2] font-mono text-[11px] text-[#292722] break-all">
                    {template.query}
                  </div>
                </div>

                <a
                  href={template.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2.5 bg-[#FAF7F2] hover:bg-[#E8DFD3] text-[#292722] rounded-xl text-xs font-semibold transition-all border border-[#D9CFC2] w-full"
                >
                  <span>Launch Google Search in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-2 text-[#73685B]" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      <ManualEntryModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={addInternship}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onImport={importBatch}
      />
    </div>
  )
}
