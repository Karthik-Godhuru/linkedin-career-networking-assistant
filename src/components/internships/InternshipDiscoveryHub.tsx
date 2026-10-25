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
      {/* Top Banner: Status & Compliance */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                Milestone 7 Engine
              </span>
              <span className="text-xs font-medium text-emerald-400 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                Zero-Scraping Compliant
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1.5 flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-blue-500" />
              Internship Discovery & Application Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Discover verified technical internships, match against your target roles and skills, and track application stages from submission to offer.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsManualModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Opportunity
            </button>

            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all"
            >
              <Upload className="w-4 h-4 mr-1.5 text-blue-400" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Success & Error Banners */}
        {error && (
          <div className="mt-4 p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={clearError} className="text-rose-400 hover:text-white font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-300 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={clearSuccess} className="text-emerald-400 hover:text-white font-bold text-xs">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Total Tracked</div>
          <div className="text-2xl font-bold text-white mt-1">{metrics.total}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Opportunities</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-mono text-blue-400 uppercase tracking-wider">Interested</div>
          <div className="text-2xl font-bold text-blue-300 mt-1">{metrics.savedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Saved for apply</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">Applied</div>
          <div className="text-2xl font-bold text-amber-300 mt-1">{metrics.appliedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Submitted</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-mono text-purple-400 uppercase tracking-wider">Interviews / OA</div>
          <div className="text-2xl font-bold text-purple-300 mt-1">{metrics.interviewCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Active rounds</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">Offers</div>
          <div className="text-2xl font-bold text-cyan-300 mt-1">{metrics.offerCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Received</div>
        </div>

        <div
          className={`rounded-2xl p-4 border transition-colors ${
            metrics.overdueCount > 0
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : metrics.upcomingDeadlineCount > 0
              ? 'bg-amber-950/40 border-amber-800 text-amber-300'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="text-[11px] font-mono uppercase tracking-wider">Deadlines</div>
          <div className="text-2xl font-bold mt-1">
            {metrics.overdueCount > 0 ? (
              <span className="text-rose-400">{metrics.overdueCount} Overdue</span>
            ) : (
              <span>{metrics.upcomingDeadlineCount} Soon</span>
            )}
          </div>
          <div className="text-[10px] opacity-80 mt-0.5">Next 7 days</div>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab('opportunities')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'opportunities'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 mr-2 text-blue-400" />
          Opportunities & Matching ({filteredInternships.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('pipeline')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'pipeline'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 mr-2 text-indigo-400" />
          Application Tracker Pipeline
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('deadlines')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'deadlines'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 mr-2 text-amber-400" />
          Deadlines & Reminders
          {(metrics.overdueCount > 0 || metrics.upcomingDeadlineCount > 0) && (
            <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-900 text-rose-200">
              {metrics.overdueCount + metrics.upcomingDeadlineCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('search')}
          className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeSubTab === 'search'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
          }`}
        >
          <Search className="w-4 h-4 mr-2 text-emerald-400" />
          Permitted ATS Searches
        </button>
      </div>

      {/* 1. OPPORTUNITIES & MATCHING VIEW */}
      {activeSubTab === 'opportunities' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, company, skills..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
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
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Match Scores</option>
                <option value="high">High Match (80%+)</option>
                <option value="medium">Medium+ (60%+)</option>
              </select>
            </div>
          </div>

          {/* Cards List */}
          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-2" />
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
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600" />
              <h3 className="text-sm font-semibold text-slate-200">No opportunities match current filter</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
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
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-xl font-medium"
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
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">1. Saved / Interested</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 font-bold">
                  {internships.filter((i) => i.status === 'bookmarked' || i.status === 'discovered').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'bookmarked' || i.status === 'discovered')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-slate-400 text-[11px] truncate">{item.company} &bull; {item.location || 'Remote'}</div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <span className="font-mono text-[10px] text-blue-400">{item.match_score}% match</span>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'applied' })}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-semibold rounded-lg"
                        >
                          Mark Applied &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 2: Applied */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">2. Applied</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-bold">
                  {internships.filter((i) => i.status === 'applied').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'applied')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-slate-400 text-[11px] truncate">{item.company}</div>
                      {item.applied_at && (
                        <div className="text-[10px] text-emerald-400">
                          Applied {new Date(item.applied_at).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'assessment' })}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-semibold rounded-lg"
                        >
                          Received OA &rarr;
                        </button>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'interviewing' })}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold rounded-lg"
                        >
                          Interview &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 3: OA / Technical Assessment */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">3. OA / Test</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 font-bold">
                  {internships.filter((i) => i.status === 'assessment').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'assessment')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-slate-400 text-[11px] truncate">{item.company}</div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'interviewing' })}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold rounded-lg"
                        >
                          Passed &rarr; Interview
                        </button>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'rejected' })}
                          className="text-slate-500 hover:text-rose-400 text-[10px]"
                        >
                          Declined
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 4: Interviewing */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">4. Interviewing</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-bold">
                  {internships.filter((i) => i.status === 'interviewing').length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => i.status === 'interviewing')
                  .map((item) => (
                    <div key={item.id} className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="text-slate-400 text-[11px] truncate">{item.company}</div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'offered' })}
                          className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-semibold rounded-lg"
                        >
                          Offer Received! 🎉
                        </button>
                        <button
                          type="button"
                          onClick={() => updateInternship(item.id, { status: 'rejected' })}
                          className="text-slate-500 hover:text-rose-400 text-[10px]"
                        >
                          Declined
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Column 5: Offers / Closed */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">5. Offers & Outcome</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 font-bold">
                  {internships.filter((i) => ['offered', 'rejected', 'withdrawn'].includes(i.status)).length}
                </span>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
                {internships
                  .filter((i) => ['offered', 'rejected', 'withdrawn'].includes(i.status))
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`p-3 bg-slate-950 border rounded-xl space-y-1.5 text-xs ${
                        item.status === 'offered' ? 'border-cyan-800/80' : 'border-slate-800/60 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white truncate">{item.title}</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-bold ${
                            item.status === 'offered'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px]">{item.company}</div>
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
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center">
              <Calendar className="w-4 h-4 mr-2 text-amber-400" />
              Application Deadlines & Follow-Up Tracker
            </h3>
            <p className="text-xs text-slate-400">
              In-app reminders are active while you use the dashboard. (No external email or background daemon runs when closed).
            </p>
          </div>

          {/* Overdue Section */}
          {deadlineGroups.overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <AlertCircle className="w-4 h-4" />
                <span>Overdue Opportunities ({deadlineGroups.overdue.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deadlineGroups.overdue.map((item) => (
                  <div key={item.id} className="p-4 bg-rose-950/20 border border-rose-900/60 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-sm">{item.title}</div>
                      <div className="text-xs text-slate-400">{item.company}</div>
                      <div className="text-xs text-rose-400 font-mono mt-1">Deadline passed: {item.deadline}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={item.posting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs rounded-xl font-medium inline-flex items-center"
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
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Urgent Deadlines (Next 7 Days) — ({deadlineGroups.upcoming.length})</span>
            </div>
            {deadlineGroups.upcoming.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {deadlineGroups.upcoming.map((item) => (
                  <div key={item.id} className="p-4 bg-amber-950/20 border border-amber-900/60 rounded-2xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-sm">{item.title}</div>
                      <div className="text-xs text-slate-400">{item.company}</div>
                      <div className="text-xs text-amber-300 font-mono mt-1">Closing: {item.deadline}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateInternship(item.id, { status: 'applied' })}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-xl font-medium"
                      >
                        Mark Applied
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                No urgent deadlines due in the next 7 days.
              </div>
            )}
          </div>

          {/* Later Deadlines */}
          {deadlineGroups.future.length > 0 && (
            <div className="space-y-3">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                Upcoming Future Deadlines ({deadlineGroups.future.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {deadlineGroups.future.map((item) => (
                  <div key={item.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                    <div className="font-semibold text-white text-xs truncate">{item.title}</div>
                    <div className="text-slate-400 text-[11px]">{item.company}</div>
                    <div className="text-xs font-mono text-blue-400">Apply by: {item.deadline}</div>
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
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center space-x-2">
              <Search className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight">
                Permitted Google ATS Discovery Queries
              </h3>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              These pre-built search templates query official applicant tracking systems (Greenhouse, Lever, Ashby, Workday) for public internship listings matching your saved target roles (<span className="text-blue-300">{profile.target_roles.join(', ') || 'AI/ML'}</span>) and skills (<span className="text-emerald-300">{profile.target_skills.slice(0, 3).join(', ') || 'Python'}</span>).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {atsSearchQueries.map((template, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      {template.targetPlatform}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-2">{template.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{template.description}</p>
                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px] text-slate-300 break-all">
                    {template.query}
                  </div>
                </div>

                <a
                  href={template.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-semibold transition-all border border-slate-700 w-full"
                >
                  <span>Launch Google Search in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-2 text-blue-400" />
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
