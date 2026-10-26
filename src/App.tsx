import React, { useState, lazy, Suspense } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/layout/Navbar'
import { AuthCard } from './components/auth/AuthCard'
import { Loader2, Target, CheckCircle2, Users, MessageSquare, Layers, Briefcase, Calendar, Link2 } from 'lucide-react'

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
const ContentPlannerHub = lazy(() =>
  import('./components/planner/ContentPlannerHub').then((m) => ({ default: m.ContentPlannerHub }))
)
const CareerGoalsForm = lazy(() =>
  import('./components/profile/CareerGoalsForm').then((m) => ({ default: m.CareerGoalsForm }))
)
const Milestone1Welcome = lazy(() =>
  import('./components/dashboard/Milestone1Welcome').then((m) => ({ default: m.Milestone1Welcome }))
)
const LinkedInIntegrationCard = lazy(() =>
  import('./components/integrations/LinkedInIntegrationCard').then((m) => ({ default: m.LinkedInIntegrationCard }))
)

const AppContent: React.FC = () => {
  const { user, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<
    'discovery' | 'outreach' | 'tracker' | 'internships' | 'planner' | 'preferences' | 'system' | 'integrations'
  >(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('linkedin')) {
        return 'integrations'
      }
    }
    return 'internships'
  })
  const [outreachCandidateId, setOutreachCandidateId] = useState<string | null>(null)

  const handleNavigateToOutreach = (candidateId?: string) => {
    if (candidateId) setOutreachCandidateId(candidateId)
    setActiveTab('outreach')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4EEE6] flex flex-col items-center justify-center text-[#73685B]">
        <Loader2 className="w-7 h-7 animate-spin text-[#292722] mb-3" />
        <p className="text-xs font-medium uppercase tracking-wider text-[#73685B]">Initializing session...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4EEE6] flex flex-col text-[#292722]">
      <Navbar />

      <main className="flex-1 flex flex-col justify-start px-4 py-8 sm:py-10">
        {user ? (
          <div className="max-w-6xl mx-auto w-full space-y-6">
            {/* View Switcher Tabs - Warm Editorial Luxury Navigation with Antique Gold Accents */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#D9CFC2] pb-4">
              <button
                type="button"
                onClick={() => setActiveTab('discovery')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'discovery'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <Users className={`w-3.5 h-3.5 mr-2 ${activeTab === 'discovery' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Candidate Curation
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('outreach')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'outreach'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <MessageSquare className={`w-3.5 h-3.5 mr-2 ${activeTab === 'outreach' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Outreach Studio
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tracker')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'tracker'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 mr-2 ${activeTab === 'tracker' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Pipeline Tracker
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('internships')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'internships'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <Briefcase className={`w-3.5 h-3.5 mr-2 ${activeTab === 'internships' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Internship Hub
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('planner')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'planner'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 mr-2 ${activeTab === 'planner' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Content Planner
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'preferences'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <Target className={`w-3.5 h-3.5 mr-2 ${activeTab === 'preferences' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Career Preferences
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('system')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'system'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 mr-2 ${activeTab === 'system' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                System Status
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('integrations')}
                className={`inline-flex items-center px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'integrations'
                    ? 'bg-[#1C1B19] text-[#FAF7F2] border border-[#C6A76B]/40 shadow-sm'
                    : 'bg-[#FAF7F2] text-[#73685B] border border-[#D9CFC2] hover:text-[#292722] hover:bg-[#E8DFD3]'
                }`}
              >
                <Link2 className={`w-3.5 h-3.5 mr-2 ${activeTab === 'integrations' ? 'text-[#C6A76B]' : 'text-[#73685B]'}`} />
                Integrations
              </button>
            </div>

            {/* Active View Container with Suspense Fallback */}
            <Suspense
              fallback={
                <div className="bg-[#FAF7F2] border border-[#D9CFC2] rounded-lg p-12 text-center text-[#73685B]">
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-[#292722] mb-2" />
                  <p className="text-xs uppercase tracking-wider">Loading module...</p>
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
              {activeTab === 'planner' && <ContentPlannerHub />}
              {activeTab === 'preferences' && <CareerGoalsForm />}
              {activeTab === 'system' && <Milestone1Welcome />}
              {activeTab === 'integrations' && <LinkedInIntegrationCard />}
            </Suspense>
          </div>
        ) : (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center my-auto">
            <div className="text-center mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#1C1B19] text-[#C6A76B] border border-[#C6A76B]/30 text-[10px] font-semibold uppercase tracking-wider mb-3.5 shadow-sm">
                LinkedIn Career Networking Assistant
              </span>
              <h1 className="text-3xl sm:text-4xl font-light text-[#292722] tracking-tight">
                AI-Powered Career &amp; Discovery Platform
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-[#73685B] max-w-xl mx-auto font-normal leading-relaxed">
                Discover AI/ML engineers, Python developers, founders, and mentors with full compliance and zero automated scraping.
              </p>
            </div>

            <AuthCard />
          </div>
        )}
      </main>

      <footer className="border-t border-[#D9CFC2] bg-[#FAF7F2] py-4 text-center text-xs text-[#73685B]">
        <p>LinkedIn Career Networking Assistant</p>
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
