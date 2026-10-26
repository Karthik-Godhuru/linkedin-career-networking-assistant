import { useState, useEffect, useCallback } from 'react'
import { linkedinAuthService } from '../services/linkedinAuthService'
import type { LinkedInConnectionMetadata, LinkedInShareResponse } from '../types/linkedin'
import { useAuth } from './useAuth'

export function useLinkedInConnection() {
  const { user } = useAuth()
  const [connection, setConnection] = useState<LinkedInConnectionMetadata>({
    connected: false,
    scopes: [],
  })
  const [loading, setLoading] = useState<boolean>(Boolean(user))
  const [connecting, setConnecting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('linkedin') === 'error') {
        return url.searchParams.get('message') || 'LinkedIn authorization failed or was denied.'
      }
    }
    return null
  })
  const [actionNotice, setActionNotice] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('linkedin') === 'connected') {
        return 'LinkedIn account connected successfully!'
      }
    }
    return null
  })

  // Synchronize with external system (LinkedIn status & URL parameters)
  useEffect(() => {
    let isSubscribed = true

    const url = new URL(window.location.href)
    if (url.searchParams.has('linkedin') || url.searchParams.has('message')) {
      url.searchParams.delete('linkedin')
      url.searchParams.delete('message')
      window.history.replaceState({}, document.title, url.toString())
    }

    if (!user) {
      return
    }

    linkedinAuthService
      .getConnectionStatus()
      .then((status) => {
        if (isSubscribed) {
          setConnection(status)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isSubscribed) {
          setError(err instanceof Error ? err.message : 'Failed to fetch LinkedIn connection status')
          setLoading(false)
        }
      })

    return () => {
      isSubscribed = false
    }
  }, [user])

  const refresh = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const status = await linkedinAuthService.getConnectionStatus()
      setConnection(status)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch LinkedIn connection status')
    } finally {
      setLoading(false)
    }
  }, [user])

  const connect = useCallback(async () => {
    setError(null)
    setActionNotice(null)
    setConnecting(true)

    try {
      const res = await linkedinAuthService.startOAuth()
      if (res.authUrl) {
        // Redirect browser to official LinkedIn authorization endpoint
        window.location.href = res.authUrl
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not initialize LinkedIn OAuth'
      setError(msg)
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(async (): Promise<boolean> => {
    setError(null)
    setLoading(true)
    try {
      const success = await linkedinAuthService.disconnect()
      if (success) {
        setConnection({ connected: false, scopes: [] })
        setActionNotice('LinkedIn account disconnected.')
      }
      return success
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect LinkedIn')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const sharePost = useCallback(
    async (text: string, postId?: string): Promise<LinkedInShareResponse> => {
      setError(null)
      try {
        const res = await linkedinAuthService.sharePost(text, postId)
        if (!res.success) {
          setError(res.error || 'Failed to publish post to LinkedIn.')
        } else {
          setActionNotice('Post successfully published to LinkedIn!')
        }
        return res
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error sharing post to LinkedIn'
        setError(msg)
        return { success: false, error: msg }
      }
    },
    []
  )

  const clearNotice = useCallback(() => {
    setActionNotice(null)
    setError(null)
  }, [])

  return {
    connection,
    loading,
    connecting,
    error,
    actionNotice,
    connect,
    disconnect,
    sharePost,
    refresh,
    clearNotice,
  }
}
