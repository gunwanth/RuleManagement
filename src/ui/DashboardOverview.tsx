import { useState } from 'react'
import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { aggregateMetrics, getRuleMetrics, recordRuleRun } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'
import { buildDailyTrend, type TrendEvent } from './trendUtils'
import {
  MetricsUsageBarChart,
  BudgetDonut,
} from './DashboardCharts'
import { runWorkflow } from '../workflow/runEngine'
import { applyAction, evaluateCondition } from '../shop/engine'
import { evaluateEligibilityCondition } from '../eligibility/engine'
import type { ShopState } from '../shop/types'
import type { CandidateProfile } from '../eligibility/types'

export function DashboardOverview({
  rules,
  metrics,
  onOpenRule,
  onCreateNewRule,
  onViewDetailedReport,
  onUpdateRules,
  onUpdateMetrics,
  onDeleteRule,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  onOpenRule: (id: string) => void
  onCreateNewRule: () => void
  onViewDetailedReport?: () => void
  onUpdateRules: (updater: (prev: RuleRecord[]) => RuleRecord[]) => void
  onUpdateMetrics: (updater: (prev: MetricsByRuleId) => MetricsByRuleId) => void
  onDeleteRule: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('All Modules')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [activeTestRuleId, setActiveTestRuleId] = useState<string | null>(null)

  const activeRuleForTesting = rules.find(r => r.id === activeTestRuleId) || null

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         rule.id.includes(searchQuery)
    const matchesModule = moduleFilter === 'All Modules' || rule.type === moduleFilter.toLowerCase()
    return matchesSearch && matchesModule
  })

  return (
    <div className="pageRoot dashboardPage">
      <div className="pageHeader">
        <div className="dashboardHero">
          <div className="searchBarContainer" style={{ flex: 1, display: 'flex', gap: 16, alignItems: 'center' }}>
            <input 
              type="text" 
              className="formInput" 
              placeholder="Search by rule name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>
          <div className="dashboardRange" style={{ gap: 20 }}>
            <label className="formLabel" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              Module:
              <select className="formSelect" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={{ width: 140 }}>
                <option>All Modules</option>
                <option>Sweetshop</option>
                <option>Eligibility</option>
                <option>Order</option>
                <option>Support</option>
              </select>
            </label>
            <label className="formLabel" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              Status:
              <select className="formSelect" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 120 }}>
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
            <button className="btn btnPrimary" onClick={onCreateNewRule} type="button">
              + Create New Rule
            </button>
          </div>
        </div>
      </div>

      <div className="fleetSection">
        <div className="fleetHeader">
          <h2 className="fleetTitle">Active Logic Fleet ({filteredRules.length})</h2>
          <a className="fleetRefresh" onClick={() => window.location.reload()}>Refresh Activity</a>
        </div>
        <div className="pageKicker" style={{ marginBottom: 20 }}>
          Click any rule name to deep-dive into its execution logic and historical performance.
        </div>

        <div className="fleetTableCard">
          <table className="fleetTable">
            <thead>
              <tr>
                <th>Logic Identifier</th>
                <th>Category</th>
                <th>Stability & Pulse</th>
                <th>Recent Activity</th>
                <th>Deployment Date</th>
                <th>Management</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map(rule => (
                <RuleFleetRow 
                  key={rule.id} 
                  rule={rule} 
                  metrics={getRuleMetrics(metrics, rule.id)}
                  onOpen={() => onOpenRule(rule.id)}
                  onRun={() => setActiveTestRuleId(rule.id)}
                  onDelete={() => onDeleteRule(rule.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {activeRuleForTesting && (
        <TestCasesModal 
          rule={activeRuleForTesting} 
          onClose={() => setActiveTestRuleId(null)} 
          onUpdateMetrics={onUpdateMetrics}
        />
      )}

      <div className="fleetSection" style={{ marginTop: '40px' }}>
        <div className="fleetHeader">
          <h2 className="fleetTitle">Rule Performance & Action Trends</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
          {filteredRules.map(rule => (
            <RuleChartCard key={rule.id} rule={rule} metrics={metrics} />
          ))}
        </div>
      </div>
    </div>
  )
}

function RuleChartCard({ rule, metrics }: { rule: RuleRecord, metrics: MetricsByRuleId }) {
  const ruleMetrics = getRuleMetrics(metrics, rule.id)
  const trendEvents = getRuleTrendEvents(rule, metrics)
  const trendPoints = buildDailyTrend(trendEvents, 7)
  
  const isElig = rule.type === 'eligibility'
  const total = isElig ? (ruleMetrics.screenedPass ?? 0) + (ruleMetrics.screenedFail ?? 0) : ruleMetrics.totalRuns
  const ok = isElig ? (ruleMetrics.screenedPass ?? 0) : ruleMetrics.successRuns
  const fail = isElig ? (ruleMetrics.screenedFail ?? 0) : ruleMetrics.failedRuns
  const successRate = total > 0 ? Math.round((ok / total) * 100) : 0

  const actionRows = isElig
    ? Object.entries(ruleMetrics.screenedByStream ?? {}).map(([name, val]) => ({ name: name.replace('_', ' '), ok: val.pass, fail: val.fail, total: val.pass + val.fail }))
    : rule.functions.map(f => ({ name: f.name, ok, fail, total }))

  actionRows.sort((a, b) => b.total - a.total)

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
      <div className="cardTitle" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '15px', color: '#111827', fontWeight: 800 }}>{rule.name}</span>
        <span style={{ fontSize: '11px', color: '#6366f1', background: '#eef2ff', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, textTransform: 'uppercase' }}>
          {rule.type}
        </span>
      </div>
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginTop: '4px' }}>
        <div style={{ width: '70px', height: '70px' }}>
           <BudgetDonut pct={successRate} label="Success" />
        </div>
        <div style={{ flex: 1 }}>
          <div className="metricCardLabel">TOTAL EXECUTIONS</div>
          <div className="sideMetricValue" style={{ fontSize: '28px', color: '#111827' }}>{total}</div>
        </div>
      </div>

      <div style={{ marginTop: '12px' }}>
        <div className="metricCardLabel" style={{ marginBottom: '12px' }}>7-DAY EXECUTION TREND</div>
        <div style={{ height: '140px' }}>
          <MetricsUsageBarChart points={trendPoints} />
        </div>
      </div>

      {actionRows.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <div className="metricCardLabel" style={{ marginBottom: '12px' }}>{isElig ? 'TOP STREAMS' : 'KEY ACTIONS'}</div>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '130px', overflowY: 'auto', paddingRight: '4px' }}>
            {actionRows.slice(0, 4).map(row => (
              <div key={row.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <span style={{ fontWeight: 700, color: '#475569', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '12px' }}>
                  {row.name.replace(/_/g, ' ')}
                </span>
                <span style={{ color: '#10b981', fontWeight: 800, flexShrink: 0 }}>{row.total} runs</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function TestCasesModal({ 
  rule, 
  onClose,
  onUpdateMetrics 
}: { 
  rule: RuleRecord
  onClose: () => void
  onUpdateMetrics: (updater: (prev: MetricsByRuleId) => MetricsByRuleId) => void
}) {
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const testCases = rule.type === 'eligibility' ? rule.eligibilityTestCases || [] : rule.shopTestCases || []

  const runTest = (testCase: any) => {
    const result = runWorkflow({
      workflow: rule.workflow,
      functions: rule.functions ?? [],
      initialContext: rule.type === 'eligibility' ? testCase.candidate : testCase.shop,
      engine: {
        applyAction: (ctx, fn, params) => applyAction(ctx as ShopState, fn, params),
        evaluateCondition: (ctx, fn, params) =>
          rule.type === 'eligibility'
            ? evaluateEligibilityCondition(ctx as CandidateProfile, fn, params)
            : evaluateCondition(ctx as ShopState, fn, params),
      },
    })

    setResults(prev => ({
      ...prev,
      [testCase.id]: {
        ok: result.ok,
        message: result.ok ? 'Pass' : 'Fail'
      }
    }))

    onUpdateMetrics(prev => recordRuleRun(prev, {
      ruleId: rule.id,
      ok: result.ok,
      outcome: result.outcome,
      stream: rule.type === 'eligibility' ? (testCase.candidate as CandidateProfile).stream : undefined
    }))
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Test Cases: {rule.name}</div>
          <button className="modalClose" onClick={onClose}>&times;</button>
        </div>
        <div className="modalBody">
          {testCases.length === 0 ? (
            <div className="emptyNote">No test cases defined for this rule.</div>
          ) : (
            <div className="testCaseList">
              {testCases.map((tc: any) => (
                <div key={tc.id} className="testCaseItem">
                  <div className="testCaseInfo">
                    <div className="testCaseName">{tc.name}</div>
                    <div className="testCaseId">ID: {tc.id}</div>
                  </div>
                  <div className="testCaseActions">
                    {results[tc.id] && (
                      <span className={`testResult ${results[tc.id].ok ? 'resultPass' : 'resultFail'}`}>
                        {results[tc.id].message}
                      </span>
                    )}
                    <button className="btn btnPrimary" onClick={() => runTest(tc)}>Run</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modalFooter">
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

function RuleFleetRow({ 
  rule, 
  metrics, 
  onOpen,
  onRun,
  onDelete
}: { 
  rule: RuleRecord
  metrics: any
  onOpen: () => void
  onRun: () => void
  onDelete: () => void
}) {
  const successRate = metrics.totalRuns > 0 
    ? Math.round((metrics.successRuns / metrics.totalRuns) * 100) 
    : 0
  
  const stability = successRate >= 90 ? 'STABLE' : successRate >= 70 ? 'WARNING' : 'CRITICAL'
  const stabilityColor = stability === 'STABLE' ? '#10b981' : stability === 'WARNING' ? '#f59e0b' : '#ef4444'
  const stabilityBg = stability === 'STABLE' ? '#ecfdf5' : stability === 'WARNING' ? '#fffbeb' : '#fef2f2'

  // Calculate pulse trend (improving/declining) based on last 5 runs vs overall
  const recentRuns = metrics.history.slice(0, 5)
  const recentSuccess = recentRuns.filter((r: any) => r.ok).length
  const recentRate = recentRuns.length > 0 ? (recentSuccess / recentRuns.length) * 100 : 0
  const isImproving = recentRate >= successRate

  const lastRunDate = metrics.history.length > 0 
    ? new Date(metrics.history[0].ts)
    : null
  
  const timeAgo = lastRunDate 
    ? `${Math.floor((Date.now() - lastRunDate.getTime()) / (1000 * 60 * 60 * 24))}d ago`
    : 'N/A'

  const deployDate = rule.updatedAt ? new Date(rule.updatedAt).toLocaleDateString() : 'N/A'

  return (
    <tr>
      <td>
        <div className="fleetRuleName" style={{ cursor: 'pointer' }} onClick={onOpen}>{rule.name}</div>
        <div className="fleetRuleId">ID: {rule.id}</div>
      </td>
      <td>
        <div className="fleetCategory">{rule.type.charAt(0).toUpperCase() + rule.type.slice(1)}</div>
      </td>
      <td>
        <div className="stabilityPulse">
          <div className="stabilityBadge" style={{ background: stabilityBg, color: stabilityColor }}>
            <span className="stabilityScore">{successRate}</span> {stability}
          </div>
          <div className="pulseTrend">
            <span className="pulseIcon">📈</span>
            {isImproving ? 'IMPROVING' : 'DECLINING'}
          </div>
        </div>
      </td>
      <td>
        <div className="recentActivity">{metrics.totalRuns} total runs</div>
      </td>
      <td>
        <div className="deploymentDate">
          <div className="deployMain">{deployDate}</div>
          <div className="deploySub">Last run: {timeAgo}</div>
        </div>
      </td>
      <td>
        <div className="fleetManagement">
          <button className="mgmtBtn mgmtBtnEdit" title="Edit" onClick={onOpen}>✏️</button>
          <button className="mgmtBtn mgmtBtnRun" title="Run Test Cases" onClick={onRun}>▶️</button>
          <button className="mgmtBtn mgmtBtnLog" title="View Logs" onClick={onOpen}>📋</button>
          <button className="mgmtBtn mgmtBtnDel" title="Delete" onClick={() => {
            if (confirm(`Are you sure you want to delete ${rule.name}?`)) {
              onDelete()
            }
          }}>🗑️</button>
        </div>
      </td>
    </tr>
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
