export type CandidateCategory = 'engineer' | 'recruiter' | 'founder' | 'alumni' | 'mentor'
export type CandidateStatus = 'pending' | 'approved' | 'dismissed' | 'archived' | 'shortlisted'
export type CandidateSource = 'csv_import' | 'github_search' | 'google_cse' | 'manual_entry'

export interface MatchReason {
  category: 'role' | 'skill' | 'company' | 'location' | 'alumni' | 'general'
  text: string
  weight: number
}

export interface CandidateRawInput {
  full_name: string
  headline?: string
  current_company?: string
  location?: string
  profile_url: string
  source: CandidateSource
  category?: CandidateCategory
  skills?: string[]
}

export interface CandidateRecord {
  id: string
  user_id: string
  full_name: string
  headline: string | null
  current_company: string | null
  location: string | null
  profile_url: string
  source: string
  category: CandidateCategory
  duplicate_hash: string
  match_score: number | null
  match_reasons: MatchReason[]
  status: CandidateStatus
  created_at: string
}
