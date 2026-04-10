import './Pages.css'
import type { TrendPoint } from './trendUtils'

export function DailyStackedTrend({ points }: { points: TrendPoint[] }) {
  const safe = points.length ? points : [{ day: '', total: 0, ok: 0 }]
  const maxTotal = Math.max(1, ...safe.map((p) => p.total))

  return (
    <div className="trend trendStacked" aria-label="Daily trend">
      {safe.map((p) => {
        const total = p.total
        const ok = p.ok
        const fail = Math.max(0, total - ok)
        const height = 22 + Math.round((total / maxTotal) * 140)
        const okPct = total ? Math.round((ok / total) * 100) : 0
        const title = total
          ? `${p.day}: ${total} runs (ok ${ok}, fail ${fail})`
          : `${p.day}: no runs`

        return (
          <div
            key={p.day}
            className="trendBar trendBarStack"
            style={{ height: `${height}px` }}
            title={title}
          >
            {total ? (
              <>
                <div className="trendSeg trendSegFail" style={{ height: `${100 - okPct}%` }} />
                <div className="trendSeg trendSegOk" style={{ height: `${okPct}%` }} />
              </>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

