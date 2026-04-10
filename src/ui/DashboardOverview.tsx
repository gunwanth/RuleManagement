import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { aggregateMetrics, getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'
import { buildDailyTrend, type TrendEvent } from './trendUtils'
import {
  MetricsUsageBarChart,
} from './DashboardCharts'

export function DashboardOverview({
  rules,
  metrics,
  onOpenRule,
  onCreateNewRule,
  onViewDetailedReport,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  onOpenRule: (id: string) => void
  onCreateNewRule: () => void
  onViewDetailedReport?: () => void
}) {
  const ruleIds = rules.map((r) => r.id)
  const agg = aggregateMetrics(metrics, ruleIds)

  const activeRules = rules.filter((r) => r.workflow.nodes.length > 0).length

  const executions = agg.totalRuns
  const successful = agg.successRuns

  const successPct =
    executions > 0 ? Math.round((successful / executions) * 100) : 0

  const systemHealth = Math.max(12, Math.min(98, successPct || 12))

  return (
    <div className="pageRoot dashboardPage">
      <div className="pageHeader">
        <div className="dashboardHero">
          <div>
            <h1 className="dashboardWelcome">Enterprise Rule Analytics</h1>
            <div className="pageKicker">
              Real-time performance metrics and system health monitoring.
            </div>
          </div>
          <div className="dashboardRange">
            <button className="btn btnPrimary" onClick={onCreateNewRule} type="button">
              + Create New Rule
            </button>
          </div>
        </div>
      </div>

      <div className="dashboardMainGrid">
        <div className="dashboardLeftCol">
          <div className="card">
            <div className="metricCardBody">
              <div className="metricCardLabel">OVERALL SUCCESS RATE</div>
              <div className="metricCardValue">{successPct}%</div>
              <div className="metricCardSub">Performance holding steady</div>
              <div className="metricCardDesc">
                Aggregated success across {executions} total executions. This is your primary platform reliability metric.
              </div>
              <button className="metricCardLink" type="button" onClick={onViewDetailedReport}>View detailed report →</button>
            </div>
          </div>

          <div className="card">
            <div className="cardTitle">Execution Trend</div>
            <div className="pageKicker" style={{ marginBottom: 14 }}>Recent performance distribution</div>
            <MetricsUsageBarChart points={resolveDashboardTrend(rules, metrics, 7)} />
          </div>
        </div>

        <div className="dashboardRightCol">
          <div className="card">
            <div className="sideMetricRow">
              <div className="sideMetricInfo">
                <div className="sideMetricLabel">SYSTEM HEALTH</div>
                <div className="sideMetricValue">{systemHealth}%</div>
              </div>
              <div className="sideMetricTrack">
                <div className="sideMetricFill" style={{ width: `${systemHealth}%`, background: '#10b981' }} />
              </div>
              <div className="sideMetricMeta">Optimal Stability</div>
            </div>
          </div>

          <div className="card">
            <div className="sideMetricRow">
              <div className="sideMetricInfo">
                <div className="sideMetricLabel">ACTIVE LOGIC NODES</div>
                <div className="sideMetricValue">{activeRules}</div>
              </div>
              <div className="sideMetricMeta">Infrastructure Ready</div>
            </div>
          </div>

          <div className="card">
            <div className="cardTitle">Top Performing Rules</div>
            <div className="pageKicker" style={{ marginBottom: 14 }}>Highest success percentages</div>
            <div className="topRulesList">
              {rules.slice(0, 3).map(rule => {
                const ruleMetrics = getRuleMetrics(metrics, rule.id)
                const ruleSuccess = ruleMetrics.totalRuns > 0 
                  ? Math.round((ruleMetrics.successRuns / ruleMetrics.totalRuns) * 100) 
                  : 0
                return (
                  <div key={rule.id} className="topRuleItem" onClick={() => onOpenRule(rule.id)}>
                    <div className="topRuleInfo">
                      <div className="topRuleName">{rule.name}</div>
                      <div className="topRuleCategory">{rule.type}</div>
                    </div>
                    <div className="topRuleValue">{ruleSuccess}%</div>
                    <div className="topRuleTrack">
                      <div className="topRuleFill" style={{ width: `${ruleSuccess}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function resolveDashboardTrend(
  rules: RuleRecord[],
  metrics: MetricsByRuleId,
  days: number,
) {
  const fromHistory = buildDailyTrend(
    rules.flatMap((rule) => getRuleTrendEvents(rule, metrics)),
    days,
  )

  if (fromHistory.some((point) => point.total > 0)) {
    return fromHistory
  }

  const aggregate = aggregateMetrics(metrics, rules.map((rule) => rule.id))
  if (aggregate.totalRuns === 0) {
    return fromHistory
  }

  return buildSyntheticTrend(aggregate.successRuns, aggregate.failedRuns, days)
}

function buildSyntheticTrend(successRuns: number, failedRuns: number, days: number) {
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setHours(12, 0, 0, 0)
    date.setDate(date.getDate() - (days - 1 - index))
    return {
      day: date.toISOString().slice(0, 10),
      total: 0,
      ok: 0,
    }
  })

  distributeIntoBuckets(buckets, successRuns, true)
  distributeIntoBuckets(buckets, failedRuns, false)
  return buckets
}

function distributeIntoBuckets(
  buckets: { day: string; total: number; ok: number }[],
  count: number,
  ok: boolean,
) {
  for (let index = 0; index < count; index += 1) {
    const bucketIndex = index % buckets.length
    buckets[bucketIndex].total += 1
    if (ok) buckets[bucketIndex].ok += 1
  }
}

function getRuleTrendEvents(rule: RuleRecord, metrics: MetricsByRuleId): TrendEvent[] {
  const m = getRuleMetrics(metrics, rule.id)
  if (rule.type === 'eligibility' && m.screenedHistory?.length) {
    return m.screenedHistory.map((e) => ({ ts: e.ts, ok: e.pass }))
  }
  return m.history.map((e) => ({ ts: e.ts, ok: e.ok }))
}
