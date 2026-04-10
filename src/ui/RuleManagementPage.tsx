import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'

type SparkItem = { ok: boolean; ts: string } | { pass: boolean; ts: string }
type TrendEvent = { ts: string; ok: boolean }
type TrendPoint = { day: string; total: number; ok: number }

export function RuleManagementPage({
  rules,
  metrics,
  onOpenRule,
  onDeleteRule,
  onCreateEligibilityRule,
  onCreateSupportRule,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  onOpenRule: (id: string) => void
  onDeleteRule: (id: string) => void
  onCreateEligibilityRule: () => void
  onCreateSupportRule: () => void
}) {
  return (
    <div className="pageRoot">
      <div className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <div className="pageTitle">Rule Management</div>
            <div className="pageKicker">
              All rules are isolated unless you connect nodes inside a rule.
            </div>
          </div>
          <div className="labActions">
            <button className="btn" type="button" onClick={onCreateEligibilityRule}>
              Add Eligibility Criteria Rule
            </button>
            <button className="btn" type="button" onClick={onCreateSupportRule}>
              Add CRM Support Rule
            </button>
          </div>
        </div>
      </div>

      <div className="ruleGrid">
        {rules.map((r) => {
          const m = getRuleMetrics(metrics, r.id)
          const isEligibility = r.type === 'eligibility'
          const streamEntries = Object.entries(m.screenedByStream ?? {})
            .sort((a, b) => (b[1].pass + b[1].fail) - (a[1].pass + a[1].fail))
            .slice(0, 4)
          const baseTotal = isEligibility
            ? (m.screenedPass ?? 0) + (m.screenedFail ?? 0)
            : m.totalRuns
          const pct = baseTotal
            ? Math.round(
                ((isEligibility ? (m.screenedPass ?? 0) : m.successRuns) /
                  baseTotal) *
                  100,
              )
            : 0
          return (
            <div key={r.id} className="ruleCard">
              <div className="ruleCardTop">
                <div className="ruleCardName">{r.name}</div>
                <div className="pill">
                  {isEligibility ? `${baseTotal} screenings` : `${m.totalRuns} runs`}
                </div>
              </div>
              <div className="ruleCardMeta">
                {r.workflow.nodes.length} nodes - {r.workflow.edges.length} connections
              </div>

              <div className="ruleCardChart">
                <div className="chartLabelRow">
                  <div>{isEligibility ? 'Screened pass' : 'Success'}</div>
                  <div>{pct}%</div>
                </div>
                <div className="progress">
                  <div className="progressFill" style={{ width: `${pct}%` }} />
                </div>
                <div className="spark">
                  {(isEligibility
                    ? ((m.screenedHistory?.length
                        ? m.screenedHistory
                        : [{ ts: '', pass: true }]) as SparkItem[])
                    : ((m.history.length
                        ? m.history
                        : [{ ts: '', ok: true }]) as SparkItem[]))
                    .slice(0, 16)
                    .map((e, i) => (
                      <div
                        key={i}
                        className={`sparkDot ${
                          ('pass' in e ? e.pass : e.ok)
                            ? 'sparkGood'
                            : 'sparkBad'
                        }`}
                        title={('pass' in e ? e.pass : e.ok) ? 'Pass' : 'Fail'}
                      />
                    ))}
                </div>

                <RuleMiniTrend
                  points={buildDailyTrend(
                    isEligibility
                      ? (m.screenedHistory ?? []).map((e) => ({ ts: e.ts, ok: e.pass }))
                      : m.history.map((e) => ({ ts: e.ts, ok: e.ok })),
                    10,
                  )}
                />

                {isEligibility && streamEntries.length ? (
                  <div className="streamBreakdown">
                    {streamEntries.map(([stream, v]) => (
                      <div
                        key={stream}
                        className="streamRow"
                        title={`${stream}: ${v.pass} pass, ${v.fail} fail`}
                      >
                        <div className="streamName">{stream}</div>
                        <div className="streamCounts">
                          <span className="streamPass">{v.pass}</span>
                          <span className="streamSep">/</span>
                          <span className="streamFail">{v.fail}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="ruleCardActions">
                <button className="btn btnPrimary" onClick={() => onOpenRule(r.id)} type="button">
                  Open
                </button>
                <button className="btn btnDanger" onClick={() => onDeleteRule(r.id)} type="button">
                  Delete
                </button>
              </div>
            </div>
          )
        })}
        {rules.length === 0 ? (
          <div className="emptyNote">No rules yet. Click “Create New Rule” to start.</div>
        ) : null}
      </div>
    </div>
  )
}

function buildDailyTrend(events: TrendEvent[], days: number): TrendPoint[] {
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

function RuleMiniTrend({ points }: { points: TrendPoint[] }) {
  const safe = points.length ? points : [{ day: '', total: 0, ok: 0 }]
  const maxTotal = Math.max(1, ...safe.map((p) => p.total))
  return (
    <div className="ruleTrend" aria-hidden="true">
      {safe.map((p) => {
        const h = 6 + Math.round((p.total / maxTotal) * 18)
        const successRate = p.total ? p.ok / p.total : 0
        const cls =
          p.total === 0
            ? 'ruleTrendBar'
            : successRate >= 0.8
              ? 'ruleTrendBar ruleTrendOk'
              : 'ruleTrendBar ruleTrendBad'
        return (
          <div key={p.day} className={cls} style={{ height: `${h}px` }} title={`${p.day}: ${p.total}`} />
        )
      })}
    </div>
  )
}
