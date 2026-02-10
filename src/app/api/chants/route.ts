import { callUC } from '@/lib/uc-api'

// GET /api/chants?cgCommunityId=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cgCommunityId = searchParams.get('cgCommunityId')

  if (!cgCommunityId) {
    return Response.json({ error: 'cgCommunityId required' }, { status: 400 })
  }

  try {
    const data = await callUC({
      method: 'GET',
      path: '/chants',
      params: { cgCommunityId },
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/chants — create a chant
export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  console.log('[CG Proxy] POST /api/chants', JSON.stringify(body))

  try {
    const data = await callUC({
      method: 'POST',
      path: '/chants',
      body,
    })
    console.log('[CG Proxy] Create success:', JSON.stringify(data))
    return Response.json(data, { status: 201 })
  } catch (err) {
    const msg = (err as Error).message || 'Unknown error'
    console.error('[CG Proxy] Create failed:', msg)
    return Response.json({ error: msg }, { status: 502 })
  }
}
