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
  const body = await req.json()

  try {
    const data = await callUC({
      method: 'POST',
      path: '/chants',
      body,
    })
    return Response.json(data, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }
}
