import type { CandidateRecord } from './candidate'

export type OutreachTone = 'professional_warm' | 'peer_technical' | 'alumni_academic'

export interface OutreachDrafts {
  inviteNote: string
  characterCount: number
  followUp1: string
  followUp2: string
  hookReason: string
  tone: OutreachTone
}

export interface ConnectionMessageRecord {
  id?: string
  candidate_id: string
  user_id: string
  draft_template: string
  user_edited_text: string | null
  character_count: number
  tone: string
  follow_up_1?: string | null
  follow_up_2?: string | null
  created_at?: string
  updated_at?: string
}

export interface OutreachState {
  candidate: CandidateRecord
  drafts: OutreachDrafts | null
  isSaved: boolean
  lastSavedAt: string | null
}
