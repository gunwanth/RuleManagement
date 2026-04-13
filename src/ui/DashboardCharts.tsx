import { useState } from 'react'
import './Pages.css'
import type { TrendPoint } from './trendUtils'
import type { MetricsByRuleId } from '../analytics/types'
import { getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'

export function BudgetDonut({
  pct,
  label,
  color,
}: {
  pct: number
  label: string
  color?: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const fillColor = color ?? '#10b981'
  return (
    <div className="donutWrap">
      <div
        className="donut"
        style={{
          background: `conic-gradient(${fillColor} ${clamped}%, #f1f5f9 0)`,
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

export function HealthPercentBar({
  pct,
  label,
  color,
}: {
  pct: number
  label: string
  color?: string
}) {
  const clamped = Math.max(0, Math.min(100, pct))
  const fillColor = color ?? '#10b981'

  return (
    <div className="healthBarCard">
      <div className="healthBarInfo">
        <div className="healthBarLabel">{label}</div>
        <div className="healthBarPct">{clamped}%</div>
      </div>
      <div className="healthTrack">
        <div className="healthFill" style={{ width: `${clamped}%`, background: fillColor }} />
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
  const [hoveredPoint, setHoveredPoint] = useState<TrendPoint | null>(null)

  return (
    <div className="usageBars" onMouseLeave={() => setHoveredPoint(null)}>
      {points.map((point) => {
        const totalHeight = point.total > 0 ? Math.max(10, (point.total / maxTotal) * 240) : 0
        const successHeight = point.total > 0 ? (point.ok / point.total) * totalHeight : 0
        const failHeight = totalHeight - successHeight

        return (
          <div 
            key={point.day} 
            className="usageBarGroup" 
            onMouseEnter={() => setHoveredPoint(point)}
            style={{ position: 'relative' }}
          >
            {hoveredPoint === point && (
              <div className="chartTooltip" style={{
                position: 'absolute',
                top: '-60px',
                background: '#111827',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                zIndex: 10,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{formatMonthLabel(point.day)}</div>
                <div style={{ color: '#34d399' }}>Success: {point.ok}</div>
                <div style={{ color: '#f87171' }}>Failed: {point.total - point.ok}</div>
                <div style={{ color: '#9ca3af', marginTop: '2px', borderTop: '1px solid #374151', paddingTop: '2px' }}>Total: {point.total}</div>
              </div>
            )}
            <div className="usageBarPair" style={{ flexDirection: 'column', gap: 0, justifyContent: 'flex-end', height: '240px' }}>
              {failHeight > 0 && <div className="usageBar usageBarBad" style={{ height: `${failHeight}px`, width: '100%', borderRadius: successHeight === 0 ? '4px 4px 0 0' : '0' }} />}
              {successHeight > 0 && <div className="usageBar usageBarGood" style={{ height: `${successHeight}px`, width: '100%', borderRadius: failHeight === 0 ? '4px 4px 0 0' : '0' }} />}
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
          <div key={rule.id} className="rankRow rankRowChart" style={{ position: 'relative' }} 
               onMouseEnter={(e) => {
                 const tooltip = document.createElement('div');
                 tooltip.className = 'chartTooltip dynamic-tooltip';
                 tooltip.style.position = 'absolute';
                 tooltip.style.right = '0';
                 tooltip.style.top = '-40px';
                 tooltip.style.background = '#111827';
                 tooltip.style.color = 'white';
                 tooltip.style.padding = '8px 12px';
                 tooltip.style.borderRadius = '8px';
                 tooltip.style.fontSize = '12px';
                 tooltip.style.zIndex = '10';
                 tooltip.style.whiteSpace = 'nowrap';
                 tooltip.style.pointerEvents = 'none';
                 tooltip.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                 tooltip.innerHTML = `
                   <div style="font-weight: bold; margin-bottom: 4px;">${rule.name}</div>
                   <div style="color: #34d399">Success: ${ruleMetrics.successRuns}</div>
                   <div style="color: #f87171">Failed: ${ruleMetrics.failedRuns}</div>
                   <div style="color: #9ca3af; margin-top: 2px; border-top: 1px solid #374151; padding-top: 2px;">Total: ${ruleMetrics.totalRuns}</div>
                 `;
                 e.currentTarget.appendChild(tooltip);
               }}
               onMouseLeave={(e) => {
                 const tooltips = e.currentTarget.querySelectorAll('.dynamic-tooltip');
                 tooltips.forEach(t => t.remove());
               }}>
            <div className="rankMain">
              <div className="rankName">{rule.name}</div>
            </div>
            <div className="rankTrack">
              <div className="rankFillGood" style={{ width: `${successWidth}%` }} />
              <div className="rankFillBad" style={{ width: `${failWidth}%` }} />
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
