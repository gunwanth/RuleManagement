export type TrendEvent = { ts: string; ok: boolean }
export type TrendPoint = { day: string; total: number; ok: number }

export function buildDailyTrend(events: TrendEvent[], days: number): TrendPoint[] {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - (days - 1))
  start.setHours(0, 0, 0, 0)

  const buckets = new Map<string, { total: number; ok: number }>()
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { total: 0, ok: 0 })
  }

  events.forEach((e) => {
    const key = new Date(e.ts).toISOString().slice(0, 10)
    const b = buckets.get(key)
    if (!b) return
    b.total += 1
    if (e.ok) b.ok += 1
  })

  return Array.from(buckets.entries()).map(([day, v]) => ({
    day,
    total: v.total,
    ok: v.ok,
  }))
}

