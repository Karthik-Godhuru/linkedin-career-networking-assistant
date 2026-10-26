import type { CandidateRecord } from './candidate'

export type TrackerStatus =
  | 'ready_to_send'
  | 'invitation_sent'
  | 'connected'
  | 'conversation_active'
  | 'follow_up_due'
  | 'relationship_established'
  | 'declined_or_inactive'

export interface NetworkingTrackerRecord {
  id?: string
  candidate_id: string
  user_id: string
  status: TrackerStatus
  invitation_sent_at: string | null
  connected_at: string | null
  next_follow_up_date: string | null
  notes: string | null
  created_at?: string
  updated_at?: string
}

export interface PipelineCandidateItem {
  candidate: CandidateRecord
  tracker: NetworkingTrackerRecord
  isOverdue: boolean
  isDueToday: boolean
  daysUntilFollowUp: number | null
}

export interface StageConfig {
  id: TrackerStatus
  label: string
  description: string
  color: string
  badgeColor: string
}

export const STAGE_CONFIGS: Record<TrackerStatus, StageConfig> = {
  ready_to_send: {
    id: 'ready_to_send',
    label: 'Approved for Outreach',
    description: 'Candidate approved; connection note ready to send manually',
    color: 'text-[#292722]',
    badgeColor: 'bg-[#E8DFD3] text-[#292722] border-[#D9CFC2]',
  },
  invitation_sent: {
    id: 'invitation_sent',
    label: 'Invitation Sent',
    description: 'Connection note sent on LinkedIn; awaiting acceptance',
    color: 'text-[#8A5A20]',
    badgeColor: 'bg-[#FBF4E8] text-[#8A5A20] border-[#E8D5B5]',
  },
  connected: {
    id: 'connected',
    label: 'Connection Accepted',
    description: 'Connected on LinkedIn; prepare 1st follow-up (+4 days)',
    color: 'text-[#2E5A36]',
    badgeColor: 'bg-[#EAF2EC] text-[#2E5A36] border-[#C6DEC9]',
  },
  follow_up_due: {
    id: 'follow_up_due',
    label: 'Follow-Up Due',
    description: 'Spaced follow-up date has arrived; send 1st or final message',
    color: 'text-[#942F2F]',
    badgeColor: 'bg-[#FCEEEE] text-[#942F2F] border-[#F0C4C4]',
  },
  conversation_active: {
    id: 'conversation_active',
    label: 'Replied / Active Chat',
    description: 'Candidate replied; conversation ongoing',
    color: 'text-[#C6A76B]',
    badgeColor: 'bg-[#1C1B19] text-[#C6A76B] border-[#C6A76B]/40',
  },
  relationship_established: {
    id: 'relationship_established',
    label: 'Relationship Established',
    description: 'Meaningful connection made; potential referral or mentorship',
    color: 'text-[#2E5A36]',
    badgeColor: 'bg-[#EAF2EC] text-[#2E5A36] border-[#C6DEC9]',
  },
  declined_or_inactive: {
    id: 'declined_or_inactive',
    label: 'Not Interested / Closed',
    description: 'No response after final follow-up, or politely declined',
    color: 'text-[#73685B]',
    badgeColor: 'bg-[#FAF7F2] text-[#73685B] border-[#D9CFC2]',
  },
}
