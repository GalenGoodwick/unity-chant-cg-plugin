import { callUC } from '@/lib/uc-api'

// GET /api/chants/[id]?cgUserId=... — get chant status
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
      path: `/chants/${id}/status`,
      params: cgUserId ? { cgUserId } : undefined,
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}

// DELETE /api/chants/[id] — delete chant
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  try {
    const data = await callUC({
      method: 'DELETE',
      path: `/chants/${id}`,
      body,
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }
}
