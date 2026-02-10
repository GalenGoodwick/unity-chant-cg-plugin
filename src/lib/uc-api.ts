/**
 * Server-side helper to call Unity Chant API.
 * Used by plugin API routes to proxy requests to the UC backend.
 */

const UC_API_URL = process.env.UC_API_URL || 'https://unitychant.com'
const CG_PLUGIN_SECRET = process.env.CG_PLUGIN_SECRET || ''

interface UCRequestOptions {
  method: 'GET' | 'POST' | 'DELETE'
  path: string
  body?: Record<string, unknown>
  params?: Record<string, string>
}

export async function callUC<T = unknown>({ method, path, body, params }: UCRequestOptions): Promise<T> {
  const url = new URL(`/api/cg${path}`, UC_API_URL)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CG_PLUGIN_SECRET}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `UC API error: ${res.status}`)
  }

  return data as T
}
