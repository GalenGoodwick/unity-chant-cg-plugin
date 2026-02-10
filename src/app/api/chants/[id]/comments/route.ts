import { callUC } from '@/lib/uc-api'

// GET /api/chants/[id]/comments?cgUserId=... — get comments for chant
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const cgUserId = searchParams.get('cgUserId')

  try {
    const data = await callUC({
      method: 'GET',
      path: `/chants/${id}/comments`,
      params: cgUserId ? { cgUserId } : undefined,
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

// POST /api/chants/[id]/comments — post a comment on an idea
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  try {
    const data = await callUC({
      method: 'POST',
      path: `/chants/${id}/comments`,
      body,
    })
    return Response.json(data, { status: 201 })
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }
}
