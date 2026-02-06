'use client'

import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib'
import { useSearchParams } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState } from 'react'

const publicKey = process.env.NEXT_PUBLIC_PUBKEY || ''

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

    const init = async () => {
      try {
        const lib = await CgPluginLib.initialize(iframeUid, '/api/sign', publicKey)

        const [userRes, communityRes] = await Promise.all([
          lib.getUserInfo(),
          lib.getCommunityInfo(),
        ])

        setUser(userRes.data)
        setCommunity(communityRes.data)
      } catch (err) {
        console.error('CG init error:', err)
        const msg = err instanceof Error ? err.message : String(err)
        setError(`CG error: ${msg}`)
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
