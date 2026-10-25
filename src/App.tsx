import React, { useState, lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/layout/Navbar'
import { AuthCard } from './components/auth/AuthCard'
import { Loader2, Target, CheckCircle2, Users, MessageSquare, Layers, Briefcase } from 'lucide-react'

// Code-split tab views to enable on-demand chunk loading and eliminate bundle size warning
const DiscoveryHub = lazy(() =>
  import('./components/discovery/DiscoveryHub').then((m) => ({ default: m.DiscoveryHub }))
)
const OutreachHub = lazy(() =>
  import('./components/outreach/OutreachHub').then((m) => ({ default: m.OutreachHub }))
)
const TrackerHub = lazy(() =>
  import('./components/tracker/TrackerHub').then((m) => ({ default: m.TrackerHub }))
)
const InternshipDiscoveryHub = lazy(() =>
  import('./components/internships/InternshipDiscoveryHub').then((m) => ({ default: m.InternshipDiscoveryHub }))
)
const CareerGoalsForm = lazy(() =>
  import('./components/profile/CareerGoalsForm').then((m) => ({ default: m.CareerGoalsForm }))
)
const Milestone1Welcome = lazy(() =>
  import('./components/dashboard/Milestone1Welcome').then((m) => ({ default: m.Milestone1Welcome }))
)

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<'discovery' | 'outreach' | 'tracker' | 'internships' | 'preferences' | 'system'>('internships')
  const [outreachCandidateId, setOutreachCandidateId] = useState<string | null>(null)

  const handleNavigateToOutreach = (candidateId?: string) => {
    if (candidateId) setOutreachCandidateId(candidateId)
    setActiveTab('outreach')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm">Initializing session...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar />

      <main className="flex-1 flex flex-col justify-start px-4 py-8 sm:py-10">
        {user ? (
          <div className="max-w-5xl mx-auto w-full space-y-6">
            {/* View Switcher Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('discovery')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'discovery'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Candidate Curation (M4)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('outreach')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'outreach'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <MessageSquare className="w-4 h-4 mr-2 text-emerald-400" />
                Outreach Studio (M5)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <Layers className="w-4 h-4 mr-2 text-blue-400" />
                Pipeline Tracker (M6)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('internships')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'internships'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4 mr-2 text-cyan-400" />
                Internship Hub (M7)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'preferences'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <Target className="w-4 h-4 mr-2" />
                Career Preferences (M2)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('system')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'system'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:text-white bg-slate-900 border border-slate-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                System Status
              </button>
            </div>

            {/* Active View Container with Suspense Fallback */}
            <Suspense
              fallback={
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-2" />
                  <p className="text-xs">Loading module...</p>
                </div>
              }
            >
              {activeTab === 'discovery' && (
                <DiscoveryHub onNavigateToOutreach={handleNavigateToOutreach} />
              )}
              {activeTab === 'outreach' && (
                <OutreachHub
                  initialCandidateId={outreachCandidateId}
                  onNavigateToCuration={() => setActiveTab('discovery')}
                />
              )}
              {activeTab === 'tracker' && (
                <TrackerHub
                  onNavigateToOutreach={handleNavigateToOutreach}
                  onNavigateToCuration={() => setActiveTab('discovery')}
                />
              )}
              {activeTab === 'internships' && <InternshipDiscoveryHub />}
              {activeTab === 'preferences' && <CareerGoalsForm />}
              {activeTab === 'system' && <Milestone1Welcome />}
            </Suspense>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center my-auto">
            <div className="text-center mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-800 text-xs font-medium mb-3">
                LinkedIn Career Networking Assistant
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                AI-Powered Career & Discovery Platform
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
                Discover AI/ML engineers, Python developers, founders, and mentors with full compliance and zero automated scraping.
              </p>
            </div>

            <AuthCard />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>LinkedIn Career Networking Assistant &bull; Milestone 8 Active & Release Ready</p>
      </footer>
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
