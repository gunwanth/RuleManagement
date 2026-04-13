import React, { useState } from 'react'
import './Pages.css'
import type { MetricsByRuleId } from '../analytics/types'
import { getRuleMetrics, recordRuleRun } from '../analytics/metrics'
import type { EligibilityTestCase, RuleRecord, ShopTestCase } from '../rules/types'
import { buildDailyTrend, type TrendEvent } from './trendUtils'
import {
  MetricsUsageBarChart,
  BudgetDonut,
} from './DashboardCharts'
import { runWorkflow } from '../workflow/runEngine'
import { applyAction, evaluateCondition } from '../shop/engine'
import { evaluateEligibilityCondition } from '../eligibility/engine'
import type { CandidateProfile } from '../eligibility/types'
import type { ShopState } from '../shop/types'

export function DashboardOverview({
  rules,
  metrics,
  onOpenRule,
  onCreateNewRule,
  onUpdateMetrics,
  onDeleteRule,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  onOpenRule: (id: string) => void
  onCreateNewRule: () => void
  onUpdateMetrics: (updater: (prev: MetricsByRuleId) => MetricsByRuleId) => void
  onDeleteRule: (id: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('All Modules')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [activeTestRuleId, setActiveTestRuleId] = useState<string | null>(null)
  const [expandedChartRuleId, setExpandedChartRuleId] = useState<string | null>(null)

  const runningRules = rules.filter(isRunningWorkflowRule)
  const activeRuleForTesting = runningRules.find((rule) => rule.id === activeTestRuleId) || null

  const filteredRules = runningRules.filter((rule) => {
    const matchesSearch =
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.includes(searchQuery)
    const matchesModule =
      moduleFilter === 'All Modules' || rule.type === moduleFilter.toLowerCase()
    const isActive = getRuleMetrics(metrics, rule.id).totalRuns > 0
    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'Active' ? isActive : !isActive)

    return matchesSearch && matchesModule && matchesStatus
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
              onChange={(event) => setSearchQuery(event.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>
          <div className="dashboardRange" style={{ gap: 20 }}>
            <label className="formLabel" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              Module:
              <select
                className="formSelect"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
                style={{ width: 140 }}
              >
                <option>All Modules</option>
                <option>Sweetshop</option>
                <option>Eligibility</option>
                <option>Order</option>
                <option>Support</option>
              </select>
            </label>
            <label className="formLabel" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              Status:
              <select
                className="formSelect"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                style={{ width: 120 }}
              >
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
          <h2 className="fleetTitle">Running Workflows ({filteredRules.length})</h2>
          <a className="fleetRefresh" onClick={() => window.location.reload()}>Refresh Activity</a>
        </div>
        <div className="pageKicker" style={{ marginBottom: 20 }}>
          Click any workflow name to inspect recent logs, execution trend, and current performance.
        </div>

        <div className="fleetTableCard">
          {filteredRules.length === 0 ? (
            <div className="emptyNote" style={{ margin: 24 }}>
              No running workflows match the current filters.
            </div>
          ) : (
            <table className="fleetTable">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Category</th>
                  <th>Stability & Pulse</th>
                  <th>Recent Activity</th>
                  <th>Deployment Date</th>
                  <th>Management</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <React.Fragment key={rule.id}>
                    <RuleFleetRow
                      rule={rule}
                      metrics={getRuleMetrics(metrics, rule.id)}
                      onOpen={() => onOpenRule(rule.id)}
                      onRun={() => setActiveTestRuleId(rule.id)}
                      onDelete={() => onDeleteRule(rule.id)}
                      onToggleChart={(id) => setExpandedChartRuleId(expandedChartRuleId === id ? null : id)}
                    />
                    {expandedChartRuleId === rule.id && (
                      <tr className="fleetExpandedRow">
                        <td colSpan={6} className="fleetExpandedCell">
                          <RuleChartCard rule={rule} metrics={metrics} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {activeRuleForTesting && (
        <TestCasesModal
          rule={activeRuleForTesting}
          onClose={() => setActiveTestRuleId(null)}
          onUpdateMetrics={onUpdateMetrics}
        />
      )}
    </div>
  )
}

function RuleChartCard({ rule, metrics }: { rule: RuleRecord, metrics: MetricsByRuleId }) {
  const ruleMetrics = getRuleMetrics(metrics, rule.id)
  const trendEvents = getRuleTrendEvents(rule, metrics)
  const trendPoints = buildDailyTrend(trendEvents, 7)
  const recentEvents = trendEvents.slice(0, 5)

  const isEligibility = rule.type === 'eligibility'
  const total = isEligibility
    ? (ruleMetrics.screenedPass ?? 0) + (ruleMetrics.screenedFail ?? 0)
    : ruleMetrics.totalRuns
  const ok = isEligibility ? (ruleMetrics.screenedPass ?? 0) : ruleMetrics.successRuns
  const successRate = total > 0 ? Math.round((ok / total) * 100) : 0

  const actionRows = isEligibility
    ? Object.entries(ruleMetrics.screenedByStream ?? {}).map(([name, value]) => ({
        name: name.replace('_', ' '),
        ok: value.pass,
        fail: value.fail,
        total: value.pass + value.fail,
      }))
    : []

  actionRows.sort((left, right) => right.total - left.total)

  return (
    <div className="card" style={{ display: 'grid', gap: '20px', padding: '24px' }}>
      <div className="cardTitle" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '15px', color: '#111827', fontWeight: 800 }}>{rule.name}</span>
        <span
          style={{
            fontSize: '11px',
            color: '#6366f1',
            background: '#eef2ff',
            padding: '4px 8px',
            borderRadius: '6px',
            fontWeight: 800,
            textTransform: 'uppercase',
          }}
        >
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.9fr)', gap: '20px', alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>
          <div className="metricCardLabel" style={{ marginBottom: '12px' }}>7-DAY EXECUTION TREND</div>
          {trendPoints.some((point) => point.total > 0) ? (
            <MetricsUsageBarChart points={trendPoints} />
          ) : (
            <div className="emptyNote">No execution trend yet. Run this workflow to populate the chart.</div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div className="metricCardLabel" style={{ marginBottom: '12px' }}>RECENT LOGS</div>
          {recentEvents.length > 0 ? (
            <div style={{ display: 'grid', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {recentEvents.map((event, index) => (
                <div
                  key={`${event.ts}-${index}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                      {new Date(event.ts).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {event.ok ? 'Workflow completed successfully' : 'Workflow ended in failure'}
                    </div>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 8px',
                      borderRadius: '999px',
                      background: event.ok ? '#ecfdf5' : '#fef2f2',
                      color: event.ok ? '#059669' : '#dc2626',
                    }}
                  >
                    {event.ok ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptyNote">No logs yet for this workflow.</div>
          )}
        </div>
      </div>

      {isEligibility && actionRows.length > 0 && (
        <div>
          <div className="metricCardLabel" style={{ marginBottom: '12px' }}>TOP STREAMS</div>
          <div style={{ display: 'grid', gap: '8px', maxHeight: '130px', overflowY: 'auto', paddingRight: '4px' }}>
            {actionRows.slice(0, 4).map((row) => (
              <div
                key={row.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    color: '#475569',
                    textTransform: 'capitalize',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginRight: '12px',
                  }}
                >
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
  onUpdateMetrics,
}: {
  rule: RuleRecord
  onClose: () => void
  onUpdateMetrics: (updater: (prev: MetricsByRuleId) => MetricsByRuleId) => void
}) {
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({})
  const testCases: Array<EligibilityTestCase | ShopTestCase> = rule.type === 'eligibility'
    ? (rule.eligibilityTestCases ?? [])
    : (rule.shopTestCases ?? [])

  const runTest = (testCase: EligibilityTestCase | ShopTestCase) => {
    const initialContext = rule.type === 'eligibility'
      ? ('candidate' in testCase ? testCase.candidate : undefined)
      : ('shop' in testCase ? testCase.shop : undefined)

    if (!initialContext) {
      return
    }

    const result = runWorkflow({
      workflow: rule.workflow,
      functions: rule.functions ?? [],
      initialContext,
      engine: {
        applyAction: (ctx, fn, params) => applyAction(ctx as ShopState, fn, params),
        evaluateCondition: (ctx, fn, params) =>
          rule.type === 'eligibility'
            ? evaluateEligibilityCondition(ctx as CandidateProfile, fn, params)
            : evaluateCondition(ctx as ShopState, fn, params),
      },
    })

    setResults((prev) => ({
      ...prev,
      [testCase.id]: {
        ok: result.ok,
        message: result.ok ? 'Pass' : 'Fail',
      },
    }))

    onUpdateMetrics((prev) => recordRuleRun(prev, {
      ruleId: rule.id,
      ok: result.ok,
      outcome: result.outcome,
      stream:
        rule.type === 'eligibility' && 'candidate' in testCase
          ? testCase.candidate.stream
          : undefined,
    }))
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={(event) => event.stopPropagation()}>
        <div className="modalHeader">
          <div className="modalTitle">Test Cases: {rule.name}</div>
          <button className="modalClose" onClick={onClose}>&times;</button>
        </div>
        <div className="modalBody">
          {testCases.length === 0 ? (
            <div className="emptyNote">No test cases defined for this rule.</div>
          ) : (
            <div className="testCaseList">
              {testCases.map((testCase) => (
                <div key={testCase.id} className="testCaseItem">
                  <div className="testCaseInfo">
                    <div className="testCaseName">{testCase.name}</div>
                    <div className="testCaseId">ID: {testCase.id}</div>
                  </div>
                  <div className="testCaseActions">
                    {results[testCase.id] && (
                      <span className={`testResult ${results[testCase.id].ok ? 'resultPass' : 'resultFail'}`}>
                        {results[testCase.id].message}
                      </span>
                    )}
                    <button className="btn btnPrimary" onClick={() => runTest(testCase)}>Run</button>
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
  onDelete,
  onToggleChart,
}: {
  rule: RuleRecord
  metrics: ReturnType<typeof getRuleMetrics>
  onOpen: () => void
  onRun: () => void
  onDelete: () => void
  onToggleChart: (id: string) => void
}) {
  const successRate = metrics.totalRuns > 0
    ? Math.round((metrics.successRuns / metrics.totalRuns) * 100)
    : 0

  const stability = successRate >= 90 ? 'STABLE' : successRate >= 70 ? 'WARNING' : 'CRITICAL'
  const stabilityColor = stability === 'STABLE' ? '#10b981' : stability === 'WARNING' ? '#f59e0b' : '#ef4444'
  const stabilityBg = stability === 'STABLE' ? '#ecfdf5' : stability === 'WARNING' ? '#fffbeb' : '#fef2f2'
  const recentRuns = metrics.history.slice(0, 5)
  const recentSuccess = recentRuns.filter((run) => run.ok).length
  const recentRate = recentRuns.length > 0 ? (recentSuccess / recentRuns.length) * 100 : 0
  const isImproving = recentRate >= successRate
  const [renderedAt] = useState(() => Date.now())

  const lastRunDate = metrics.history.length > 0
    ? new Date(metrics.history[0].ts)
    : null
  const timeAgo = lastRunDate
    ? `${Math.floor((renderedAt - lastRunDate.getTime()) / (1000 * 60 * 60 * 24))}d ago`
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
            <span className="pulseIcon">Trend</span>
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
          <button className="mgmtBtn mgmtBtnEdit" title="Edit" onClick={onOpen}>Edit</button>
          <button className="mgmtBtn mgmtBtnRun" title="Run Test Cases" onClick={onRun}>Run</button>
          <button className="mgmtBtn mgmtBtnLog" title="View Logs" onClick={() => onToggleChart(rule.id)}>Logs</button>
          <button
            className="mgmtBtn mgmtBtnDel"
            title="Delete"
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${rule.name}?`)) {
                onDelete()
              }
            }}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

function getRuleTrendEvents(rule: RuleRecord, metrics: MetricsByRuleId): TrendEvent[] {
  const ruleMetrics = getRuleMetrics(metrics, rule.id)

  if (rule.type === 'eligibility') {
    if (ruleMetrics.screenedHistory?.length) {
      return ruleMetrics.screenedHistory.map((event) => ({ ts: event.ts, ok: event.pass }))
    }
    // Fallback to raw history when screened history is not yet populated.
    return ruleMetrics.history.map((event) => ({ ts: event.ts, ok: event.ok }))
  }

  return ruleMetrics.history.map((event) => ({ ts: event.ts, ok: event.ok }))
}

function isRunningWorkflowRule(rule: RuleRecord) {
  const isTemplate = rule.id.includes('template') || rule.name.toLowerCase().includes('template')
  const hasWorkflow = rule.workflow.nodes.length > 0 || rule.workflow.edges.length > 0
  return !isTemplate && hasWorkflow
}
