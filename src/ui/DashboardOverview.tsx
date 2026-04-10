import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { aggregateMetrics, getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'
import { buildDailyTrend, type TrendEvent } from './trendUtils'
import {
  BudgetDonut,
  MetricsTopRulesChart,
  MetricsUsageBarChart,
} from './DashboardCharts'

export function DashboardOverview({
  rules,
  metrics,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
}) {
  const ruleIds = rules.map((r) => r.id)
  const agg = aggregateMetrics(metrics, ruleIds)

  const activeRules = rules.filter((r) => r.workflow.nodes.length > 0).length
  const inactiveRules = Math.max(0, rules.length - activeRules)

  const totalRules = rules.length
  const executions = agg.totalRuns
  const successful = agg.successRuns
  const failed = agg.failedRuns

  const successPct =
    executions > 0 ? Math.round((successful / executions) * 100) : 0

  const systemHealth = Math.max(12, Math.min(98, successPct || 12))
  const transportBudget = Math.max(5000, executions * 2)
  const transportSpent = Math.round(executions * 1.2)

  const dailyTrend = resolveDashboardTrend(rules, metrics, 6)
  const peakPoint = dailyTrend.reduce(
    (best, point) => (point.total > best.total ? point : best),
    dailyTrend[0] ?? { day: '', total: 0, ok: 0 },
  )
  const averageRuns = dailyTrend.length
    ? Math.round(dailyTrend.reduce((sum, point) => sum + point.total, 0) / dailyTrend.length)
    : 0
  const recentPoint = dailyTrend[dailyTrend.length - 1]
  const failureRate = executions > 0 ? Math.round((failed / executions) * 100) : 0
  const activeTrendDays = dailyTrend.filter((point) => point.total > 0).length
  const trackedEvents = dailyTrend.reduce((sum, point) => sum + point.total, 0)
  const trendCoverage = executions > 0 ? Math.round((trackedEvents / executions) * 100) : 0
  const bestRule = rules
    .map((rule) => {
      const ruleMetrics = getRuleMetrics(metrics, rule.id)
      const screenedTotal =
        (ruleMetrics.screenedPass ?? 0) + (ruleMetrics.screenedFail ?? 0)
      const total =
        rule.type === 'eligibility' && screenedTotal > 0
          ? screenedTotal
          : ruleMetrics.totalRuns
      return { name: rule.name, total }
    })
    .sort((left, right) => right.total - left.total)[0]

  return (
    <div className="pageRoot dashboardPage">
      <div className="pageHeader">
        <div className="dashboardHero">
          <div>
            <div className="pageKicker">
              {failed > 0
                ? `${failed} rule runs need attention today.`
                : 'All rule executions are healthy right now.'}
            </div>
          </div>
          <div className="dashboardRange">
            <button className="dashboardRangeTab dashboardRangeTabActive" type="button">
              All Time
            </button>
            <button className="dashboardRangeTab" type="button">
              Last 7 Days
            </button>
            <button className="dashboardRangeTab" type="button">
              Last 30 Days
            </button>
            <button className="dashboardRangeTab" type="button">
              Date Range
            </button>
          </div>
        </div>
      </div>

      <div className="dashboardTopGrid">
        <Card title="Rules">
          <div className="bigNumber">{totalRules}</div>
          <div className="subLabel">Total Rules</div>
          <div className="splitRow">
            <div className="splitCell">
              <div className="splitVal splitValGood">{activeRules}</div>
              <div className="splitLab">Active</div>
            </div>
            <div className="splitCell">
              <div className="splitVal splitValBad">{inactiveRules}</div>
              <div className="splitLab">Inactive</div>
            </div>
          </div>
        </Card>

        <Card title="System Health">
          <div className="healthGauge">
            <div className="healthSegments">
              <div className="healthSeg healthSegBad" />
              <div className="healthSeg healthSegWarn" />
              <div className="healthSeg healthSegGood" />
              <div
                className="healthNeedle"
                style={{ left: `${systemHealth}%` }}
              />
            </div>
            <div className="healthValue">{systemHealth}%</div>
          </div>
        </Card>

        <Card title="Transport">
          <div className="transportCard">
            <BudgetDonut pct={successPct} label="Budget utilization" />
            <div className="transportMeta">
              <div className="transportMain">{Math.round((transportSpent / transportBudget) * 100)}%</div>
              <div className="subLabel">Budget Utilization</div>
            </div>
            <div className="transportSide">
              <div className="transportSideRow">
                <div className="transportSideValue">{executions}</div>
                <div className="transportSideLabel">Rule Execution</div>
              </div>
              <div className="transportSideRow">
                <div className="transportSideValue">{successPct}%</div>
                <div className="transportSideLabel">Success Rate</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="dashboardBottomGrid">
        <Card title="Usage Trend">
          <div className="dashboardLegend">
            <span className="legendItem"><span className="legendDot legendDotGood" /> Successful</span>
            <span className="legendItem"><span className="legendDot legendDotBad" /> Failed</span>
          </div>
          {executions === 0 ? (
            <div className="emptyNote" style={{ marginBottom: 10 }}>
              No runs yet. Open a rule and click Run.
            </div>
          ) : null}
          <div className="trendSummaryRow">
            <div className="trendSummaryItem">
              <span className="trendSummaryKey">Tracked Events</span>
              <span className="trendSummaryValue">{trackedEvents}</span>
            </div>
            <div className="trendSummaryItem">
              <span className="trendSummaryKey">Active Days</span>
              <span className="trendSummaryValue">{activeTrendDays}/6</span>
            </div>
            <div className="trendSummaryItem">
              <span className="trendSummaryKey">Coverage</span>
              <span className="trendSummaryValue">{trendCoverage}%</span>
            </div>
            <div className="trendSummaryItem">
              <span className="trendSummaryKey">Top Rule</span>
              <span className="trendSummaryValue trendSummaryValueSmall">
                {bestRule?.name ?? 'No rule'}
              </span>
            </div>
          </div>
          <MetricsUsageBarChart points={dailyTrend} />
          <div className="trendAnalysisGrid">
            <div className="trendAnalysisCard">
              <div className="trendAnalysisLabel">Peak Day</div>
              <div className="trendAnalysisValue">
                {peakPoint.total}
              </div>
              <div className="trendAnalysisMeta">
                {peakPoint.day ? formatTrendDay(peakPoint.day) : 'No data'}
              </div>
            </div>
            <div className="trendAnalysisCard">
              <div className="trendAnalysisLabel">Average Runs</div>
              <div className="trendAnalysisValue">{averageRuns}</div>
              <div className="trendAnalysisMeta">Across last 6 days</div>
            </div>
            <div className="trendAnalysisCard">
              <div className="trendAnalysisLabel">Latest Day</div>
              <div className="trendAnalysisValue">{recentPoint?.total ?? 0}</div>
              <div className="trendAnalysisMeta">
                {recentPoint ? `${recentPoint.ok} success / ${recentPoint.total - recentPoint.ok} fail` : 'No data'}
              </div>
            </div>
            <div className="trendAnalysisCard">
              <div className="trendAnalysisLabel">Failure Rate</div>
              <div className="trendAnalysisValue">{failureRate}%</div>
              <div className="trendAnalysisMeta">
                {failed} of {executions} runs
              </div>
            </div>
          </div>
        </Card>
        <Card title="Top Rules">
          <div className="dashboardLegend">
            <span className="legendItem"><span className="legendDot legendDotGood" /> Successful</span>
            <span className="legendItem"><span className="legendDot legendDotBad" /> Failed</span>
          </div>
          <MetricsTopRulesChart rules={rules} metrics={metrics} />
        </Card>
      </div>
    </div>
  )
}

function formatTrendDay(day: string) {
  const date = new Date(day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="cardTitle">{title}</div>
      {children}
    </div>
  )
}

function getRuleTrendEvents(rule: RuleRecord, metrics: MetricsByRuleId): TrendEvent[] {
  const m = getRuleMetrics(metrics, rule.id)
  if (rule.type === 'eligibility' && m.screenedHistory?.length) {
    return m.screenedHistory.map((e) => ({ ts: e.ts, ok: e.pass }))
  }
  return m.history.map((e) => ({ ts: e.ts, ok: e.ok }))
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
