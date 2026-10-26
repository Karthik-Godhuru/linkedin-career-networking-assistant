/**
 * Type definitions for LinkedIn OAuth, profile connection metadata, and posting.
 */

export interface LinkedInConnectionMetadata {
  connected: boolean
  memberId?: string
  name?: string
  email?: string
  pictureUrl?: string
  headline?: string
  scopes: string[]
  connectedAt?: string
  tokenExpired?: boolean
}

export interface LinkedInOAuthStartResponse {
  authUrl: string
  state: string
  expiresAt: string
}

export interface LinkedInShareRequest {
  postId?: string
  text: string
}

export interface LinkedInShareResponse {
  success: boolean
  urn?: string
  error?: string
}

export interface LinkedInUserInfo {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  email_verified?: boolean
}
