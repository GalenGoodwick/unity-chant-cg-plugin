// POST /api/debug — Remote debug logging for CG iframe
// GET /api/debug — Returns recent logs
const logs: { ts: string; level: string; msg: string; data?: unknown }[] = []
const MAX_LOGS = 200

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const entry = {
      ts: new Date().toISOString(),
      level: body.level || 'info',
      msg: body.msg || '',
      data: body.data,
    }
    logs.push(entry)
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS)
    console.log(`[CG DEBUG] ${entry.level}: ${entry.msg}`, entry.data ? JSON.stringify(entry.data).slice(0, 500) : '')
    return Response.json({ ok: true })
  } catch {
    return Response.json({ ok: false }, { status: 400 })
  }
}

export async function GET() {
  return Response.json(logs)
}
