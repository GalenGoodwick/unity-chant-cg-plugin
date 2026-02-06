import { callUC } from '@/lib/uc-api'

// GET /api/chants/[id] — get chant status
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const data = await callUC({
      method: 'GET',
      path: `/chants/${id}/status`,
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 500 })
  }
}
