export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CandidateStatus = 'pending' | 'approved' | 'dismissed' | 'archived' | 'shortlisted'
export type CandidateCategory = 'engineer' | 'recruiter' | 'founder' | 'alumni' | 'mentor'
export type TrackerStatus =
  | 'ready_to_send'
  | 'invitation_sent'
  | 'connected'
  | 'conversation_active'
  | 'follow_up_due'
  | 'relationship_established'
  | 'declined_or_inactive'
export type InternshipStatus =
  | 'discovered'
  | 'bookmarked'
  | 'applied'
  | 'assessment'
  | 'interviewing'
  | 'offered'
  | 'rejected'
  | 'withdrawn'

export interface Database {
  public: {
    Tables: {
      user_career_profiles: {
        Row: {
          id: string
          user_id: string
          target_roles: string[]
          target_companies: string[]
          target_skills: string[]
          target_locations: string[]
          alumni_institutions: string[]
          experience_level: string
          bio_summary: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          target_roles?: string[]
          target_companies?: string[]
          target_skills?: string[]
          target_locations?: string[]
          alumni_institutions?: string[]
          experience_level?: string
          bio_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          target_roles?: string[]
          target_companies?: string[]
          target_skills?: string[]
          target_locations?: string[]
          alumni_institutions?: string[]
          experience_level?: string
          bio_summary?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
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
          match_reasons: Json
          status: CandidateStatus
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          headline?: string | null
          current_company?: string | null
          location?: string | null
          profile_url: string
          source: string
          category?: CandidateCategory
          duplicate_hash: string
          match_score?: number | null
          match_reasons?: Json
          status?: CandidateStatus
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          headline?: string | null
          current_company?: string | null
          location?: string | null
          profile_url?: string
          source?: string
          category?: CandidateCategory
          duplicate_hash?: string
          match_score?: number | null
          match_reasons?: Json
          status?: CandidateStatus
          created_at?: string
        }
        Relationships: []
      }
      connection_messages: {
        Row: {
          id: string
          candidate_id: string
          user_id: string
          draft_template: string
          user_edited_text: string | null
          character_count: number | null
          tone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          user_id: string
          draft_template: string
          user_edited_text?: string | null
          character_count?: number | null
          tone?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          user_id?: string
          draft_template?: string
          user_edited_text?: string | null
          character_count?: number | null
          tone?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      networking_tracker: {
        Row: {
          id: string
          candidate_id: string
          user_id: string
          status: TrackerStatus
          invitation_sent_at: string | null
          connected_at: string | null
          next_follow_up_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          candidate_id: string
          user_id: string
          status?: TrackerStatus
          invitation_sent_at?: string | null
          connected_at?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          candidate_id?: string
          user_id?: string
          status?: TrackerStatus
          invitation_sent_at?: string | null
          connected_at?: string | null
          next_follow_up_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      internships: {
        Row: {
          id: string
          user_id: string
          title: string
          company: string
          location: string | null
          posting_url: string
          source: string
          required_skills: string[]
          match_score: number | null
          match_reasons: Json
          status: InternshipStatus
          deadline: string | null
          applied_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          company: string
          location?: string | null
          posting_url: string
          source: string
          required_skills?: string[]
          match_score?: number | null
          match_reasons?: Json
          status?: InternshipStatus
          deadline?: string | null
          applied_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          company?: string
          location?: string | null
          posting_url?: string
          source?: string
          required_skills?: string[]
          match_score?: number | null
          match_reasons?: Json
          status?: InternshipStatus
          deadline?: string | null
          applied_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      content_recommendations: {
        Row: {
          id: string
          user_id: string
          topic: string
          suggested_angle: string
          suggested_hashtags: string[]
          target_audience: string | null
          draft_status: string
          post_body: string | null
          source_material: string | null
          tone: string
          scheduled_date: string | null
          slot_number: number
          published_at: string | null
          impressions: number
          reactions: number
          comments: number
          reposts: number
          media_url?: string | null
          media_description?: string | null
          created_at: string
          updated_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          topic: string
          suggested_angle: string
          suggested_hashtags?: string[]
          target_audience?: string | null
          draft_status?: string
          post_body?: string | null
          source_material?: string | null
          tone?: string
          scheduled_date?: string | null
          slot_number?: number
          published_at?: string | null
          impressions?: number
          reactions?: number
          comments?: number
          reposts?: number
          media_url?: string | null
          media_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          topic?: string
          suggested_angle?: string
          suggested_hashtags?: string[]
          target_audience?: string | null
          draft_status?: string
          post_body?: string | null
          source_material?: string | null
          tone?: string
          scheduled_date?: string | null
          slot_number?: number
          published_at?: string | null
          impressions?: number
          reactions?: number
          comments?: number
          reposts?: number
          media_url?: string | null
          media_description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_media_assets: {
        Row: {
          id: string
          user_id: string
          post_id: string
          storage_path: string
          file_name: string
          mime_type: string
          file_size: number
          caption: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          storage_path: string
          file_name: string
          mime_type: string
          file_size: number
          caption?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          storage_path?: string
          file_name?: string
          mime_type?: string
          file_size?: number
          caption?: string | null
          created_at?: string
        }
        Relationships: []
      }
      linkedin_oauth_states: {
        Row: {
          id: string
          user_id: string
          state_hash: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          state_hash: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          state_hash?: string
          expires_at?: string
          used?: boolean
          created_at?: string
        }
        Relationships: []
      }
      linkedin_connections: {
        Row: {
          id: string
          user_id: string
          linkedin_member_id: string
          encrypted_access_token: string
          encrypted_refresh_token: string | null
          access_token_expires_at: string | null
          refresh_token_expires_at: string | null
          scopes: string[]
          name: string | null
          email: string | null
          picture_url: string | null
          headline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          linkedin_member_id: string
          encrypted_access_token: string
          encrypted_refresh_token?: string | null
          access_token_expires_at?: string | null
          refresh_token_expires_at?: string | null
          scopes?: string[]
          name?: string | null
          email?: string | null
          picture_url?: string | null
          headline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          linkedin_member_id?: string
          encrypted_access_token?: string
          encrypted_refresh_token?: string | null
          access_token_expires_at?: string | null
          refresh_token_expires_at?: string | null
          scopes?: string[]
          name?: string | null
          email?: string | null
          picture_url?: string | null
          headline?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      candidate_status: CandidateStatus
      candidate_category: CandidateCategory
      tracker_status: TrackerStatus
      internship_status: InternshipStatus
    }
    CompositeTypes: Record<string, never>
  }
}
