import { callUC } from '@/lib/uc-api'

// POST /api/chants/[id]/start — start voting
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  try {
    const data = await callUC({
      method: 'POST',
      path: `/chants/${id}/start`,
      body,
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }
}
