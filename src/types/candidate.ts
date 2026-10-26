export type CandidateCategory = 'engineer' | 'recruiter' | 'founder' | 'alumni' | 'mentor'
export type CandidateStatus = 'pending' | 'approved' | 'dismissed' | 'archived' | 'shortlisted'
export type CandidateSource =
  | 'csv_import'
  | 'github_search'
  | 'google_cse'
  | 'manual_entry'
  | 'groq_web_search'
  | 'gemini_web_search'

export interface GeminiRejectionBreakdown {
  githubOrNonLinkedIn: number
  companyOrDirectory: number
  missingOrMalformedUrl: number
  missingEvidence: number
  invalidName: number
  notInCitationAllowList: number
}

export interface GeminiDiagnostics {
  totalRawFound: number
  totalUrlsExtracted: number
  validPersonalProfiles: number
  rejectedNonLinkedIn: number
  companyOrDirectory: number
  missingDirectUrls: number
  missingEvidence: number
  invalidName: number
  notInCitationAllowList: number
  duplicatesFiltered: number
  citationsCount: number
  format: 'json' | 'markdown' | 'empty'
  isBroader?: boolean
  queryUsed?: string
  modelUsed?: string
}

export interface GeminiDiscoveredCandidate {
  full_name: string
  headline?: string
  current_company?: string
  location?: string
  profile_url: string
  source_url: string
  snippet: string
  evidence_summary?: string
  verification_status: 'Found via Web Search — Needs Review'
  skills?: string[]
  category?: CandidateCategory
}

export interface GroqRejectionBreakdown {
  githubOrNonLinkedIn: number
  companyOrDirectory: number
  missingOrMalformedUrl: number
  missingEvidence: number
  invalidName: number
}

export interface GroqDiagnostics {
  totalRawFound: number
  totalUrlsExtracted: number
  validPersonalProfiles: number
  rejectedNonLinkedIn: number
  companyOrDirectory: number
  missingDirectUrls: number
  missingEvidence: number
  invalidName: number
  duplicatesFiltered: number
  format: 'json' | 'markdown' | 'empty'
  isBroader?: boolean
  queryUsed?: string
}

export interface GroqDiscoveredCandidate {
  full_name: string
  headline?: string
  current_company?: string
  location?: string
  profile_url: string
  source_url: string
  snippet: string
  evidence_summary?: string
  verification_status: 'Found via Web Search — Needs Review'
  skills?: string[]
  category?: CandidateCategory
}

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
