import './Pages.css'
import type { TrendPoint } from './trendUtils'
import type { MetricsByRuleId } from '../analytics/types'
import { getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'

export function BudgetDonut({
  pct,
  label,
}: {
  pct: number
  label: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div className="donutWrap">
      <div
        className="donut"
        style={{
          background: `conic-gradient(rgba(124,58,237,0.95) ${clamped}%, rgba(17,24,39,0.08) 0)`,
        }}
      >
        <div className="donutInner">
          <div className="donutPct">{clamped}%</div>
          <div className="donutLab">{label}</div>
        </div>
      </div>
    </div>
  )
}

export function MetricsUsageBarChart({
  points,
}: {
  points: TrendPoint[]
}) {
  const maxTotal = Math.max(1, ...points.map((point) => point.total), 1)

  return (
    <div className="usageBars">
      {points.map((point) => {
        const fail = Math.max(0, point.total - point.ok)
        const okHeight = point.ok > 0 ? Math.max(10, (point.ok / maxTotal) * 240) : 0
        const failHeight = fail > 0 ? Math.max(10, (fail / maxTotal) * 240) : 0
        return (
          <div key={point.day} className="usageBarGroup">
            <div className="usageBarPair">
              <div className="usageBar usageBarGood" style={{ height: `${okHeight}px` }} />
              <div className="usageBar usageBarBad" style={{ height: `${failHeight}px` }} />
            </div>
            <div className="usageBarLabel">{formatMonthLabel(point.day)}</div>
          </div>
        )
      })}
    </div>
  )
}

export function MetricsTopRulesChart({
  rules,
  metrics,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
}) {
  const topRules = rules
    .slice()
    .sort(
      (a, b) =>
        getRuleMetrics(metrics, b.id).totalRuns -
        getRuleMetrics(metrics, a.id).totalRuns,
    )
    .slice(0, 5)

  const maxRuns = Math.max(
    1,
    ...topRules.map((entry) => getRuleMetrics(metrics, entry.id).totalRuns),
  )

  return (
    <div className="ruleRank">
      {topRules.map((rule) => {
        const ruleMetrics = getRuleMetrics(metrics, rule.id)
        const successWidth = Math.max(6, (ruleMetrics.successRuns / maxRuns) * 100)
        const failWidth =
          ruleMetrics.failedRuns > 0
            ? Math.max(3, (ruleMetrics.failedRuns / maxRuns) * 100)
            : 0

        return (
          <div key={rule.id} className="rankRow rankRowChart">
            <div className="rankMain">
              <div className="rankName">{rule.name}</div>
            </div>
            <div className="rankTrack">
              <div className="rankFillBad" style={{ width: `${failWidth}%` }} />
              <div className="rankFillGood" style={{ width: `${successWidth}%` }} />
            </div>
          </div>
        )
      })}
      {rules.length === 0 ? (
        <div className="emptyNote">No rules yet. Create one to start.</div>
      ) : null}
    </div>
  )
}

function formatMonthLabel(day: string) {
  const date = new Date(day)
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric' })
}
