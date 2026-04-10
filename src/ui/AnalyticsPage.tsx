import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { aggregateMetrics, getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'
import { MetricsUsageBarChart } from './DashboardCharts'
import { buildDailyTrend } from './trendUtils'

export function AnalyticsPage({
  rules,
  metrics,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
}) {
  const ruleIds = rules.map((r) => r.id)
  const agg = aggregateMetrics(metrics, ruleIds)
  const executions = agg.totalRuns
  const successPct = executions > 0 ? Math.round((agg.successRuns / executions) * 100) : 0

  // Module Distribution
  const typeDistribution = rules.reduce((acc, rule) => {
    acc[rule.type] = (acc[rule.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Performance by Rule
  const rulePerformance = rules.map(rule => {
    const m = getRuleMetrics(metrics, rule.id)
    const success = m.totalRuns > 0 ? Math.round((m.successRuns / m.totalRuns) * 100) : 0
    return {
      id: rule.id,
      name: rule.name,
      type: rule.type,
      total: m.totalRuns,
      success,
      fail: m.totalRuns - m.successRuns
    }
  }).sort((a, b) => b.total - a.total)

  return (
    <div className="pageRoot">
      <div className="pageHeader">
        <div className="pageTitle">Advanced Analytics</div>
        <div className="pageKicker">In-depth performance analysis and module distribution reports.</div>
      </div>

      <div className="analyticsGrid">
        <div className="card">
          <div className="cardTitle">Executive Summary</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
            <div>
              <div className="metricCardLabel">TOTAL EXECUTIONS</div>
              <div className="sideMetricValue" style={{ fontSize: '32px' }}>{executions}</div>
            </div>
            <div>
              <div className="metricCardLabel">AVG SUCCESS RATE</div>
              <div className="sideMetricValue" style={{ fontSize: '32px', color: '#10b981' }}>{successPct}%</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="cardTitle">Module Distribution</div>
          <div style={{ marginTop: '10px' }}>
            {Object.entries(typeDistribution).map(([type, count]) => (
              <div key={type} className="distRow">
                <div className="distLabel">{type}</div>
                <div className="distTrack">
                  <div className="distFill" style={{ width: `${(count / rules.length) * 100}%` }} />
                </div>
                <div className="distValue">{count}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="cardTitle">Performance Trend (Last 7 Days)</div>
        <MetricsUsageBarChart points={resolveDetailedTrend(rules, metrics, 7)} />
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <div className="cardTitle">Rule-by-Rule Performance</div>
        <table className="statsTable">
          <thead>
            <tr>
              <th>Rule Name</th>
              <th>Category</th>
              <th>Executions</th>
              <th>Success Rate</th>
              <th>Failures</th>
            </tr>
          </thead>
          <tbody>
            {rulePerformance.map(rule => (
              <tr key={rule.id}>
                <td style={{ fontWeight: 800 }}>{rule.name}</td>
                <td style={{ opacity: 0.6, textTransform: 'capitalize' }}>{rule.type}</td>
                <td>{rule.total}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '4px', background: 'rgba(0,0,0,0.05)', borderRadius: '2px', overflow: 'hidden', minWidth: '60px' }}>
                      <div style={{ height: '100%', background: '#10b981', width: `${rule.success}%` }} />
                    </div>
                    <span>{rule.success}%</span>
                  </div>
                </td>
                <td style={{ color: rule.fail > 0 ? '#ef4444' : 'inherit' }}>{rule.fail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function resolveDetailedTrend(rules: RuleRecord[], metrics: MetricsByRuleId, days: number) {
  const events = rules.flatMap(rule => {
    const m = getRuleMetrics(metrics, rule.id)
    return m.history.map(e => ({ ts: e.ts, ok: e.ok }))
  })
  return buildDailyTrend(events, days)
}
