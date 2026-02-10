'use client'

import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'
import { useSearchParams } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { debugLog, debugError } from '@/lib/debug'

const publicKey = (process.env.NEXT_PUBLIC_PUBKEY || '').replace(/\\n/g, '\n')

// Module-level guard — survives Suspense unmount/remount (useRef does not)
let cgInitStarted = false

interface CGContextValue {
  user: UserInfoResponsePayload | null
  community: CommunityInfoResponsePayload | null
  loading: boolean
  error: string | null
  retry: () => void
}

const CGContext = createContext<CGContextValue>({
  user: null,
  community: null,
  loading: true,
  error: null,
  retry: () => {},
})

export function useCG() {
  return useContext(CGContext)
}

export default function CGProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfoResponsePayload | null>(null)
  const [community, setCommunity] = useState<CommunityInfoResponsePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const iframeUid = searchParams.get('iframeUid')

  const doInit = useCallback(async () => {
    if (!iframeUid || !publicKey) return

    setLoading(true)
    setError(null)

    try {
      debugLog('Step 1: CgPluginLib.initialize...', { iframeUid })
      const lib = await CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
      debugLog('Step 1 OK: SDK initialized')

      debugLog('Step 2: getUserInfo...')
      const userRes = await lib.getUserInfo()
      debugLog('Step 2 OK: user', { id: userRes.data?.id, name: userRes.data?.name })
      setUser(userRes.data)

      debugLog('Step 3: getCommunityInfo...')
      const communityRes = await lib.getCommunityInfo()
      debugLog('Step 3 OK: community', { id: communityRes.data?.id, title: communityRes.data?.title })
      setCommunity(communityRes.data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      debugError('CG SDK init failed', { error: msg })
      setError(msg || 'Unknown CG SDK error')
    } finally {
      setLoading(false)
    }
  }, [iframeUid])

  const retry = useCallback(() => {
    cgInitStarted = false
    doInit()
  }, [doInit])

  useEffect(() => {
    if (cgInitStarted) return

    if (!iframeUid) {
      setError('Missing iframeUid — this app must run inside Common Ground')
      setLoading(false)
      return
    }

    if (!publicKey) {
      setError('Plugin not configured — missing public key')
      setLoading(false)
      return
    }

    cgInitStarted = true
    doInit()
  }, [iframeUid, doInit])

  return (
    <CGContext.Provider value={{ user, community, loading, error, retry }}>
      {children}
    </CGContext.Provider>
  )
}
