/**
 * LinkedIn API helpers for OAuth 2.0, OpenID Connect userinfo, and Member Share posting.
 */

export const LINKEDIN_SCOPES = [
  'openid',
  'profile',
  'email',
  'w_member_social',
] as const

export function buildLinkedInAuthorizationUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  scopes?: readonly string[]
}): string {
  const scopes = (params.scopes || LINKEDIN_SCOPES).join(' ')
  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', params.clientId)
  url.searchParams.set('redirect_uri', params.redirectUri)
  url.searchParams.set('state', params.state)
  url.searchParams.set('scope', scopes)
  return url.toString().replace(/([?&]scope=)([^&]+)/, (_match, prefix, scopeVal) => {
    return prefix + scopeVal.replace(/\+/g, '%20')
  })
}

export interface LinkedInTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  refresh_token_expires_in?: number
  scope?: string
  token_type?: string
}

export async function exchangeAuthorizationCode(params: {
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
}): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', params.code)
  body.set('redirect_uri', params.redirectUri)
  body.set('client_id', params.clientId)
  body.set('client_secret', params.clientSecret)

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${errText}`)
  }

  return (await res.json()) as LinkedInTokenResponse
}

export interface LinkedInUserInfoResponse {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  email_verified?: boolean
}

export async function fetchLinkedInUserInfo(
  accessToken: string
): Promise<LinkedInUserInfoResponse> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`LinkedIn userinfo request failed (${res.status}): ${errText}`)
  }

  return (await res.json()) as LinkedInUserInfoResponse
}

export interface LinkedInPostResult {
  success: boolean
  postId?: string
  error?: string
}

export async function publishLinkedInPost(params: {
  accessToken: string
  authorUrn: string
  commentary: string
}): Promise<LinkedInPostResult> {
  // LinkedIn REST API for posts
  // Author URN format: urn:li:person:{sub}
  const payload = {
    author: params.authorUrn.startsWith('urn:li:person:')
      ? params.authorUrn
      : `urn:li:person:${params.authorUrn}`,
    commentary: params.commentary,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  }

  const res = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(payload),
  })

  if (res.status === 201) {
    const postUrn = res.headers.get('x-restli-id') || undefined
    return { success: true, postId: postUrn }
  }

  // Fallback to legacy UGC Post endpoint if rest/posts is not supported for app
  if (!res.ok && res.status !== 201) {
    const ugcPayload = {
      author: params.authorUrn.startsWith('urn:li:person:')
        ? params.authorUrn
        : `urn:li:person:${params.authorUrn}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: params.commentary,
          },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    }

    const ugcRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(ugcPayload),
    })

    if (ugcRes.ok) {
      const data = await ugcRes.json()
      return { success: true, postId: data.id }
    }

    const ugcError = await ugcRes.text()
    return {
      success: false,
      error: `LinkedIn post failed: ${ugcError}`,
    }
  }

  return { success: true }
}
