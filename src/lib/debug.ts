// Remote debug logger — sends logs to /api/debug so they're visible via GET /api/debug
const queue: { level: string; msg: string; data?: unknown }[] = []
let flushing = false

function flush() {
  if (flushing || queue.length === 0) return
  flushing = true
  const batch = queue.splice(0, queue.length)
  for (const entry of batch) {
    fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => {}) // fire and forget
  }
  flushing = false
}

export function debugLog(msg: string, data?: unknown) {
  console.log('[UC]', msg, data ?? '')
  queue.push({ level: 'info', msg, data })
  flush()
}

export function debugError(msg: string, data?: unknown) {
  console.error('[UC]', msg, data ?? '')
  queue.push({ level: 'error', msg, data })
  flush()
}
