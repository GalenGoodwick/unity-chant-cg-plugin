import { callUC } from '@/lib/uc-api'

// POST /api/chants/[id]/extend — extend voting timer
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  try {
    const data = await callUC({
      method: 'POST',
      path: `/chants/${id}/extend`,
      body,
    })
    return Response.json(data)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }
}
