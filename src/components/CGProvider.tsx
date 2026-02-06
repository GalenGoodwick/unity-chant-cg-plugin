'use client'

import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'
import { useSearchParams } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState } from 'react'

const publicKey = process.env.NEXT_PUBLIC_PUBKEY || ''

// Module-level guard — survives Suspense unmount/remount (useRef does not)
let cgInitStarted = false

interface CGContextValue {
  user: UserInfoResponsePayload | null
  community: CommunityInfoResponsePayload | null
  loading: boolean
  error: string | null
}

const CGContext = createContext<CGContextValue>({
  user: null,
  community: null,
  loading: true,
  error: null,
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

  useEffect(() => {
    // Module-level guard — Suspense remounts reset useRef, but not module vars
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

    const init = async () => {
      try {
        console.log('[UC] Initializing CG SDK...')
        const lib = await CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)
        console.log('[UC] CG SDK initialized')

        // Sequential calls — matching CG sample pattern to avoid duplicate signed requests
        const userRes = await lib.getUserInfo()
        console.log('[UC] Got user:', userRes.data?.name)
        setUser(userRes.data)

        const communityRes = await lib.getCommunityInfo()
        console.log('[UC] Got community:', communityRes.data?.title)
        setCommunity(communityRes.data)
      } catch (err) {
        console.error('[UC] CG init error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg || 'Unknown CG SDK error')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [iframeUid])

  return (
    <CGContext.Provider value={{ user, community, loading, error }}>
      {children}
    </CGContext.Provider>
  )
}
