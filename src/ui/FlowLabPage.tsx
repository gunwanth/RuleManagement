import * as React from 'react'
import './Pages.css'

import type { MetricsByRuleId } from '../analytics/types'
import { getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord, EligibilityTestCase, ShopTestCase } from '../rules/types'
import { runWorkflow } from '../workflow/runEngine'
import type { WorkflowEdge, WorkflowNode } from '../workflow/types'
import type { RunLogEntry } from '../workflow/runEngine'

import type { CandidateProfile } from '../eligibility/types'
import { createDefaultCandidate, normalizeCandidateProfile } from '../eligibility/types'
import { evaluateEligibilityCondition } from '../eligibility/engine'

import type { ShopState } from '../shop/types'
import { createDefaultShopState } from '../shop/defaultState'
import { applyAction, evaluateCondition } from '../shop/engine'
import { buildDailyTrend, type TrendEvent } from './trendUtils'

const STREAMS: { id: CandidateProfile['stream']; label: string }[] = [
  { id: 'frontend_react', label: 'Frontend (React)' },
  { id: 'fullstack', label: 'Full stack' },
  { id: 'backend', label: 'Backend' },
  { id: 'data_science', label: 'Data Science' },
  { id: 'ai', label: 'AI' },
]

type LastRun = {
  ts: string
  ok: boolean
  outcome?: 'pass' | 'fail'
  stream?: string
  label: string
  log: RunLogEntry[]
}

export function FlowLabPage({
  rules,
  metrics,
  onUpdateRule,
  onRunRecorded,
  onOpenRule,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  onUpdateRule: (next: RuleRecord) => void
  onRunRecorded: (args: {
    ruleId: string
    ok: boolean
    outcome?: 'pass' | 'fail'
    stream?: string
  }) => void
  onOpenRule: (id: string) => void
}) {
  const [selectedRuleId, setSelectedRuleId] = React.useState<string | null>(
    rules[0]?.id ?? null,
  )
  const rule = rules.find((r) => r.id === selectedRuleId) ?? null
  const [toast, setToast] = React.useState<string | null>(null)
  const [lastRun, setLastRun] = React.useState<LastRun | null>(null)

  React.useEffect(() => {
    if (!rules.length) {
      if (selectedRuleId !== null) setSelectedRuleId(null)
      return
    }

    const selectedStillExists = selectedRuleId
      ? rules.some((entry) => entry.id === selectedRuleId)
      : false

    if (!selectedStillExists) {
      setSelectedRuleId(rules[0]?.id ?? null)
    }
  }, [rules, selectedRuleId])

  React.useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const m = rule ? getRuleMetrics(metrics, rule.id) : null

  return (
    <div className="pageRoot">
      <div className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <div className="pageTitle">Flow Lab</div>
            <div className="pageKicker">All rules, workflows, test cases, and charts in one place.</div>
          </div>
        </div>
      </div>

      {rules.length ? (
        <div className="grid2" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
          <div className="card">
            <div className="cardTitle">Lab</div>

            <div className="labRow">
              <label className="labLabel">
                Rule
                <select
                  className="formSelect"
                  value={selectedRuleId ?? ''}
                  onChange={(e) => setSelectedRuleId(e.target.value || null)}
                >
                  {rules.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="labActions">
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={() => rule && onOpenRule(rule.id)}
                  disabled={!rule}
                >
                  Open Builder
                </button>
              </div>
            </div>

            {rule ? (
              rule.type === 'eligibility' ? (
                <EligibilityLabBody
                  rule={rule}
                  metrics={m}
                  onUpdateRule={onUpdateRule}
                  onRunRecorded={onRunRecorded}
                  setToast={setToast}
                  onRunComplete={(payload) => setLastRun(payload)}
                />
              ) : (
                <ShopLabBody
                  rule={rule}
                  metrics={m}
                  onUpdateRule={onUpdateRule}
                  onRunRecorded={onRunRecorded}
                  setToast={setToast}
                  onRunComplete={(payload) => setLastRun(payload)}
                />
              )
            ) : (
              <div className="emptyNote">Select a rule to start.</div>
            )}
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            <div className="card">
              <div className="cardTitle">Insights</div>
              {rule && m ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  <FlowInsightsPanel
                    rule={rule}
                    rules={rules}
                    metrics={metrics}
                    selectedMetrics={m}
                  />
                  <LastRunPanel value={lastRun} />
                  <JsonPanel rule={rule} />
                </div>
              ) : (
                <div className="emptyNote">Select a rule to view panels.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="emptyNote">No rules yet. Create one to start.</div>
      )}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function FlowInsightsPanel({
  rule,
  rules,
  metrics,
  selectedMetrics,
}: {
  rule: RuleRecord
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  selectedMetrics: ReturnType<typeof getRuleMetrics>
}) {
  const isElig = rule.type === 'eligibility'
  const total = isElig
    ? (selectedMetrics.screenedPass ?? 0) + (selectedMetrics.screenedFail ?? 0)
    : selectedMetrics.totalRuns
  const ok = isElig ? (selectedMetrics.screenedPass ?? 0) : selectedMetrics.successRuns
  const fail = isElig ? (selectedMetrics.screenedFail ?? 0) : selectedMetrics.failedRuns
  const successRate = total ? Math.round((ok / total) * 100) : 0

  const points = buildDailyTrend(
    (
      isElig
        ? (selectedMetrics.screenedHistory ?? []).map((entry) => ({
            ts: entry.ts,
            ok: entry.pass,
          }))
        : selectedMetrics.history.map((entry) => ({
            ts: entry.ts,
            ok: entry.ok,
          }))
    ) as TrendEvent[],
    6,
  )

  const averageDaily = points.length
    ? Math.round(points.reduce((sum, point) => sum + point.total, 0) / points.length)
    : 0

  const insightRows = isElig
    ? Object.entries(selectedMetrics.screenedByStream ?? {})
        .map(([name, value]) => ({
          name: name.replaceAll('_', ' '),
          total: value.pass + value.fail,
          ok: value.pass,
          fail: value.fail,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
    : rule.functions
        .slice(0, 6)
        .map((fn) => ({
          name: fn.name,
          total,
          ok,
          fail,
        }))

  return (
    <div className="insightsRoot">
      <div className="insightSummaryRow">
        <InsightMetricCard label="Success Rate" value={`${successRate}%`} accent="good" meta={isElig ? 'screening quality' : 'workflow quality'} />
        <InsightMetricCard label="Total Runs" value={`${total}`} meta={rule.name} />
        <InsightMetricCard label="Successful" value={`${ok}`} accent="good" meta={`Failed ${fail}`} />
        <InsightMetricCard label="Average Daily" value={`${averageDaily}`} meta="last 6 days" />
      </div>

      <div className="insightBodyGrid">
        <div className="insightPanel">
          <div className="insightPanelTitle">Rule Insights</div>
          {insightRows.length ? (
            <div className="insightMiniGrid">
              {insightRows.map((row) => (
                <div key={row.name} className="insightMiniCard">
                  <div className="insightMiniName">{row.name}</div>
                  <div className="insightMiniValue">{row.total}</div>
                  <div className="insightMiniMeta">
                    <span className="streamPass">{row.ok}</span>
                    <span className="streamSep">/</span>
                    <span className="streamFail">{row.fail}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="emptyNote">No metric data yet for this rule. Run the rule once to populate this chart.</div>
          )}
        </div>

        <div className="insightPanel">
          <div className="insightPanelTitle">Usage Trend</div>
          <MetricBarChart points={points} />
        </div>
      </div>

      <RuleMetricsTable rules={rules} metrics={metrics} />
    </div>
  )
}

function InsightMetricCard({
  label,
  value,
  meta,
  accent,
}: {
  label: string
  value: string
  meta?: string
  accent?: 'good'
}) {
  return (
    <div className="insightMetricCard">
      <div className="insightMetricLabel">{label}</div>
      <div className={`insightMetricValue ${accent === 'good' ? 'insightMetricValueGood' : ''}`}>{value}</div>
      <div className="insightMetricMeta">{meta ?? ''}</div>
    </div>
  )
}

function MetricBarChart({
  points,
}: {
  points: ReturnType<typeof buildDailyTrend>
}) {
  const safe = points.length ? points : []
  const maxTotal = Math.max(1, ...safe.map((point) => point.total), 1)

  if (!safe.some((point) => point.total > 0)) {
    return <div className="emptyNote">No metric data yet for this rule. Run the rule once to populate this chart.</div>
  }

  return (
    <div className="metricBarChart">
      {safe.map((point) => {
        const fail = Math.max(0, point.total - point.ok)
        const goodHeight = Math.max(8, Math.round((point.ok / maxTotal) * 180))
        const failHeight = fail > 0 ? Math.max(8, Math.round((fail / maxTotal) * 180)) : 0
        return (
          <div key={point.day} className="metricBarGroup">
            <div className="metricBarValues">
              <span className="metricBarValueGood">{point.ok}</span>
              <span className="metricBarValueBad">{fail}</span>
            </div>
            <div className="metricBarPair">
              <div className="metricBar metricBarGood" style={{ height: `${goodHeight}px` }} />
              <div className="metricBar metricBarBad" style={{ height: `${failHeight}px` }} />
            </div>
            <div className="metricBarLabel">{formatDayLabel(point.day)}</div>
          </div>
        )
      })}
    </div>
  )
}

function RuleMetricsTable({
  rules,
  metrics,
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
}) {
  const rows = rules.map((entry) => {
    const rowMetrics = getRuleMetrics(metrics, entry.id)
    const isElig = entry.type === 'eligibility'
    const total = isElig
      ? (rowMetrics.screenedPass ?? 0) + (rowMetrics.screenedFail ?? 0)
      : rowMetrics.totalRuns
    const fail = isElig ? (rowMetrics.screenedFail ?? 0) : rowMetrics.failedRuns
    const errorRate = total ? Math.round((fail / total) * 100) : 0
    const trendPoints = buildDailyTrend(
      (
        isElig
          ? (rowMetrics.screenedHistory ?? []).map((item) => ({ ts: item.ts, ok: item.pass }))
          : rowMetrics.history.map((item) => ({ ts: item.ts, ok: item.ok }))
      ) as TrendEvent[],
      5,
    )

    return {
      id: entry.id,
      title: entry.name,
      category: entry.type,
      total,
      errorRate,
      trendPoints,
    }
  })

  return (
    <div className="insightTableWrap">
      <div className="insightPanelTitle">Rule Metrics</div>
      <div className="insightTable">
        <div className="insightTableHead">
          <div>Title</div>
          <div>Category</div>
          <div>Executions</div>
          <div>Trend</div>
          <div>Error Rate</div>
        </div>
        {rows.map((row) => (
          <div key={row.id} className="insightTableRow">
            <div className="insightTableTitle">{row.title}</div>
            <div className="insightTableMuted">{row.category}</div>
            <div>{row.total}</div>
            <div><MiniTrendLine points={row.trendPoints} /></div>
            <div className={row.errorRate > 0 ? 'streamFail' : 'streamPass'}>{row.errorRate}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MiniTrendLine({
  points,
}: {
  points: ReturnType<typeof buildDailyTrend>
}) {
  if (!points.some((point) => point.total > 0)) {
    return <div className="insightTableMuted">No data</div>
  }

  const coords = points
    .map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100
      const y = 100 - Math.min(100, point.total * 20)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg viewBox="0 0 100 100" className="miniTrendSvg" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  )
}

function formatDayLabel(day: string) {
  if (!day) return '-'
  const [, month, date] = day.split('-')
  return `${month}/${date}`
}

function ShopLabBody({
  rule,
  metrics,
  onUpdateRule,
  onRunRecorded,
  setToast,
  onRunComplete,
}: {
  rule: RuleRecord
  metrics: ReturnType<typeof getRuleMetrics> | null
  onUpdateRule: (next: RuleRecord) => void
  onRunRecorded: (args: { ruleId: string; ok: boolean }) => void
  setToast: (msg: string) => void
  onRunComplete: (payload: {
    ts: string
    ok: boolean
    label: string
    log: RunLogEntry[]
  }) => void
}) {
  const [shop, setShop] = React.useState<ShopState>(() => createShopStateForRule(rule))
  const [lastRunAt, setLastRunAt] = React.useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(
    rule.shopTestCases?.[0]?.id ?? null,
  )
  const [caseDraft, setCaseDraft] = React.useState<ShopTestCase | null>(null)
  const [caseResults, setCaseResults] = React.useState<
    Record<string, { ranAt: string; ok: boolean; expected?: 'pass' | 'fail'; log: RunLogEntry[] }>
  >({})

  React.useEffect(() => {
    const cases = rule.shopTestCases ?? []
    setSelectedCaseId((current) =>
      current && cases.some((testCase) => testCase.id === current)
        ? current
        : (cases[0]?.id ?? null),
    )
  }, [rule.shopTestCases])

  React.useEffect(() => {
    const found = (rule.shopTestCases ?? []).find((testCase) => testCase.id === selectedCaseId) ?? null
    setCaseDraft(found ? deepCloneShopCase(found) : null)
  }, [rule.shopTestCases, selectedCaseId])

  const executeWithState = (state: ShopState, label: string) => {
    const result = runWorkflow({
      workflow: { nodes: rule.workflow.nodes as WorkflowNode[], edges: rule.workflow.edges as WorkflowEdge[] },
      functions: rule.functions,
      initialContext: cloneShopState(state),
      engine: {
        applyAction: (ctx, fn, params) => applyAction(ctx as ShopState, fn, params),
        evaluateCondition: (ctx, fn, params) => evaluateCondition(ctx as ShopState, fn, params),
      },
    })
    setShop(result.finalContext as ShopState)
    onRunRecorded({ ruleId: rule.id, ok: result.ok })
    setLastRunAt(new Date().toISOString())
    onRunComplete({
      ts: new Date().toISOString(),
      ok: result.ok,
      label,
      log: result.log,
    })
    return result
  }

  const run = () => {
    const result = executeWithState(shop, 'Workflow run')
    setToast(result.ok ? 'Run recorded' : 'Run stopped with errors')
  }

  const runCase = (testCase: ShopTestCase) => {
    const result = executeWithState(testCase.shop, `Test case: ${testCase.name}`)
    setCaseResults((prev) => ({
      ...prev,
      [testCase.id]: {
        ranAt: new Date().toISOString(),
        ok: result.ok,
        expected: testCase.expected,
        log: result.log,
      },
    }))
    setToast(result.ok ? 'Test case passed' : 'Test case failed')
  }

  const addCase = () => {
    const next: ShopTestCase = {
      id: crypto.randomUUID(),
      name: `${rule.name} scenario`,
      expected: undefined,
      shop: cloneShopState(shop),
    }
    onUpdateRule({
      ...rule,
      shopTestCases: [next, ...(rule.shopTestCases ?? [])],
      updatedAt: new Date().toISOString(),
    })
    setSelectedCaseId(next.id)
    setToast('Added test case')
  }

  const saveCase = () => {
    if (!caseDraft) return
    onUpdateRule({
      ...rule,
      shopTestCases: (rule.shopTestCases ?? []).map((testCase) =>
        testCase.id === caseDraft.id ? caseDraft : testCase,
      ),
      updatedAt: new Date().toISOString(),
    })
    setToast('Saved test case')
  }

  const deleteCase = () => {
    if (!selectedCaseId) return
    const nextCases = (rule.shopTestCases ?? []).filter((testCase) => testCase.id !== selectedCaseId)
    onUpdateRule({ ...rule, shopTestCases: nextCases, updatedAt: new Date().toISOString() })
    setSelectedCaseId(nextCases[0]?.id ?? null)
    setToast('Deleted test case')
  }

  return (
    <>
      <div className="pageKicker" style={{ marginBottom: 12 }}>
        Runs recorded: <strong>{metrics?.totalRuns ?? 0}</strong>
        {lastRunAt ? ` | Last run: ${new Date(lastRunAt).toLocaleString()}` : ''}
      </div>

      <div className="labActions" style={{ marginBottom: 12 }}>
        <button className="btn btnPrimary" type="button" onClick={run} disabled={!rule.workflow.nodes.length}>
          Run Workflow
        </button>
        <button className="btn" type="button" onClick={() => setShop(createShopStateForRule(rule))}>
          {rule.type === 'order' ? 'Reset Order State' : rule.type === 'support' ? 'Reset Support State' : 'Reset Shop'}
        </button>
        <button className="btn" type="button" onClick={addCase}>
          Add Case
        </button>
      </div>

      <div className="labGrid">
        <div className="labList">
          <div className="configTitle">Functions</div>
          <div className="caseList">
            {rule.functions.map((fn) => (
              <div key={fn.id} className="caseItem">
                <div className="caseMain">
                  <div className="caseName">{fn.name}</div>
                  <div className="caseMeta">{fn.kind} · {fn.operationName ?? fn.operation}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="sideDivider" />
          <div className="testLabTop">
            <div>
              <div className="configTitle">Test Cases</div>
              <div className="sideHint">Editable functional scenarios for this rule.</div>
            </div>
          </div>
          <div className="caseList">
            {(rule.shopTestCases ?? []).map((testCase) => (
              <button
                key={testCase.id}
                className={`labItem ${testCase.id === selectedCaseId ? 'labItemActive' : ''}`}
                type="button"
                onClick={() => setSelectedCaseId(testCase.id)}
              >
                <div className="labItemTitle">{testCase.name}</div>
                <div className="labItemMeta">
                  Expected: {testCase.expected ?? '-'} | Result: {caseResults[testCase.id]?.ok ? 'pass' : caseResults[testCase.id] ? 'fail' : 'not run'}
                </div>
              </button>
            ))}
            {!rule.shopTestCases?.length ? <div className="emptyNote">No test cases yet.</div> : null}
          </div>
        </div>

        <div className="labEditor">
          <div className="labEditorTop">
            <div style={{ fontWeight: 950, letterSpacing: '-0.3px' }}>State & Triggers</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {caseDraft ? (
                <>
                  <button className="btn btnPrimary" type="button" onClick={() => runCase(caseDraft)}>
                    Run Case
                  </button>
                  <button className="btn" type="button" onClick={saveCase}>
                    Save
                  </button>
                  <button className="btn btnDanger" type="button" onClick={deleteCase}>
                    Delete
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {caseDraft ? (
            <>
              <label className="formLabel">
                Case name
                <input
                  className="formInput"
                  value={caseDraft.name}
                  onChange={(e) => setCaseDraft({ ...caseDraft, name: e.target.value })}
                  spellCheck={false}
                />
              </label>
              <label className="formLabel">
                Expected
                <select
                  className="formSelect"
                  value={caseDraft.expected ?? ''}
                  onChange={(e) => setCaseDraft({ ...caseDraft, expected: (e.target.value as 'pass' | 'fail') || undefined })}
                >
                  <option value="">Not set</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </label>
              <ShopStateEditor ruleType={rule.type} value={caseDraft.shop} onChange={(next) => setCaseDraft({ ...caseDraft, shop: next })} />
            </>
          ) : (
            <>
              <ShopStateEditor ruleType={rule.type} value={shop} onChange={setShop} />
              <div className="sideDivider" />
              <div className="configTitle">{rule.type === 'order' ? 'Order Triggers' : rule.type === 'support' ? 'Support Signals' : 'Stocks'}</div>
              <div className="streamBreakdown">
                {rule.type === 'order' ? (
                  <>
                    <div className="streamRow"><div className="streamName">Created</div><div className="streamCounts">{shop.order.created ? 'Yes' : 'No'}</div></div>
                    <div className="streamRow"><div className="streamName">Payment</div><div className="streamCounts">{shop.order.paymentConfirmed ? 'Confirmed' : 'Pending'}</div></div>
                    <div className="streamRow"><div className="streamName">Shift</div><div className="streamCounts">{shop.order.assignedShift}</div></div>
                    <div className="streamRow"><div className="streamName">Status</div><div className="streamCounts">{shop.order.status}</div></div>
                  </>
                ) : rule.type === 'support' ? (
                  <>
                    <div className="streamRow"><div className="streamName">Raised</div><div className="streamCounts">{shop.support.raised ? 'Yes' : 'No'}</div></div>
                    <div className="streamRow"><div className="streamName">State</div><div className="streamCounts">{shop.support.state}</div></div>
                    <div className="streamRow"><div className="streamName">Undergoing</div><div className="streamCounts">{shop.support.undergoingTickets}</div></div>
                    <div className="streamRow"><div className="streamName">Solved / Revoked / Stable</div><div className="streamCounts">{shop.support.solvedTickets} / {shop.support.revokedTickets} / {shop.support.stableTickets}</div></div>
                  </>
                ) : (
                  Object.entries(shop.items).map(([name, item]) => (
                    <div key={name} className="streamRow">
                      <div className="streamName">{name}</div>
                      <div className="streamCounts">{item.quantity}</div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

function EligibilityLabBody({
  rule,
  metrics,
  onUpdateRule,
  onRunRecorded,
  setToast,
  onRunComplete,
}: {
  rule: RuleRecord
  metrics: ReturnType<typeof getRuleMetrics> | null
  onUpdateRule: (next: RuleRecord) => void
  onRunRecorded: (args: { ruleId: string; ok: boolean; outcome?: 'pass' | 'fail'; stream?: string }) => void
  setToast: (msg: string) => void
  onRunComplete: (payload: {
    ts: string
    ok: boolean
    outcome?: 'pass' | 'fail'
    stream?: string
    label: string
    log: RunLogEntry[]
  }) => void
}) {
  const [stream, setStream] = React.useState<CandidateProfile['stream']>('frontend_react')
  const [selectedCaseId, setSelectedCaseId] = React.useState<string | null>(null)
  const [caseDraft, setCaseDraft] = React.useState<EligibilityTestCase | null>(null)
  const [caseResults, setCaseResults] = React.useState<
    Record<
      string,
      {
        ranAt: string
        ok: boolean
        outcome?: 'pass' | 'fail'
        expected?: 'pass' | 'fail'
      }
    >
  >({})

  React.useEffect(() => {
    const cases = rule.eligibilityTestCases ?? []
    const firstInStream = cases.find((c) => c.candidate.stream === stream) ?? cases[0] ?? null
    setSelectedCaseId(firstInStream?.id ?? null)
  }, [rule, stream])

  React.useEffect(() => {
    const found = (rule.eligibilityTestCases ?? []).find((c) => c.id === selectedCaseId) ?? null
    setCaseDraft(found ? deepCloneCase(found) : null)
  }, [rule, selectedCaseId])

  const filteredCases = (rule.eligibilityTestCases ?? []).filter((c) => c.candidate.stream === stream)
  const streamTotals = metrics?.screenedByStream?.[stream]

  const runCase = (testCase: EligibilityTestCase) => {
    const result = runWorkflow({
      workflow: { nodes: rule.workflow.nodes as WorkflowNode[], edges: rule.workflow.edges as WorkflowEdge[] },
      functions: rule.functions,
      initialContext: testCase.candidate,
      engine: {
        applyAction: (ctx) => ({ ok: false, message: 'No actions for eligibility', next: ctx }),
        evaluateCondition: (ctx, fn, params) =>
          evaluateEligibilityCondition(ctx as CandidateProfile, fn, params),
      },
    })
    onRunRecorded({
      ruleId: rule.id,
      ok: result.ok,
      outcome: result.outcome,
      stream: testCase.candidate.stream,
    })
    const ts = new Date().toISOString()
    setCaseResults((prev) => ({
      ...prev,
      [testCase.id]: {
        ranAt: ts,
        ok: result.ok,
        outcome: result.outcome,
        expected: testCase.expected,
      },
    }))
    onRunComplete({
      ts,
      ok: result.ok,
      outcome: result.outcome,
      stream: testCase.candidate.stream,
      label: `Test case: ${testCase.name}`,
      log: result.log,
    })
    setToast(result.outcome ? `Screened: ${result.outcome}` : result.ok ? 'Recorded' : 'Failed')
  }

  const runMany = (list: EligibilityTestCase[]) => {
    if (!list.length) return
    list.forEach((c) => runCase(c))
    setToast(`Executed ${list.length} test case(s)`)
  }

  const addCase = () => {
    const next: EligibilityTestCase = {
      id: crypto.randomUUID(),
      name: `${STREAMS.find((s) => s.id === stream)?.label ?? stream} Candidate`,
      expected: 'pass',
      candidate: { ...createDefaultCandidate(), stream },
    }
    const nextCases = [next, ...(rule.eligibilityTestCases ?? [])]
    onUpdateRule({ ...rule, eligibilityTestCases: nextCases, updatedAt: new Date().toISOString() })
    setSelectedCaseId(next.id)
    setToast('Added test case')
  }

  const saveDraft = () => {
    if (!caseDraft) return
    const nextCases = (rule.eligibilityTestCases ?? []).map((c) => (c.id === caseDraft.id ? caseDraft : c))
    onUpdateRule({ ...rule, eligibilityTestCases: nextCases, updatedAt: new Date().toISOString() })
    setToast('Saved test case')
  }

  const deleteCase = () => {
    if (!selectedCaseId) return
    const nextCases = (rule.eligibilityTestCases ?? []).filter((c) => c.id !== selectedCaseId)
    onUpdateRule({ ...rule, eligibilityTestCases: nextCases, updatedAt: new Date().toISOString() })
    setSelectedCaseId(nextCases[0]?.id ?? null)
    setToast('Deleted test case')
  }

  return (
    <>
      <div className="labRow">
        <label className="labLabel">
          Stream
          <select className="formSelect" value={stream} onChange={(e) => setStream(e.target.value as CandidateProfile['stream'])}>
            {STREAMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="labActions">
          <button className="btn" type="button" onClick={() => runMany(filteredCases)} disabled={!filteredCases.length}>
            Run Stream
          </button>
          <button className="btn" type="button" onClick={() => runMany(rule.eligibilityTestCases ?? [])} disabled={!rule.eligibilityTestCases?.length}>
            Run All
          </button>
          <button className="btn" type="button" onClick={addCase}>
            Add Case
          </button>
        </div>
      </div>

      <div className="labGrid">
        <div className="labList">
          {filteredCases.length ? (
            filteredCases.map((c) => (
              <button key={c.id} className={`labItem ${c.id === selectedCaseId ? 'labItemActive' : ''}`} type="button" onClick={() => setSelectedCaseId(c.id)}>
                <div className="labItemTitle">{c.name}</div>
                <div className="labItemMeta">Expected: {c.expected ?? '-'} | Track: {c.candidate.isExperienced ? 'experienced' : 'fresher'}</div>
                <div className="labItemMeta">
                  Result:{' '}
                  {caseResults[c.id]?.outcome
                    ? caseResults[c.id]?.outcome
                    : caseResults[c.id]?.ok
                      ? 'ok'
                      : caseResults[c.id]
                        ? 'fail'
                        : 'not run'}
                </div>
              </button>
            ))
          ) : (
            <div className="emptyNote">No test cases for this stream yet.</div>
          )}
        </div>

        <div className="labEditor">
          {caseDraft ? (
            <>
              <div className="labEditorTop">
                <div style={{ fontWeight: 950, letterSpacing: '-0.3px' }}>Editor</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btnPrimary" type="button" onClick={() => runCase(caseDraft)}>
                    Run Case
                  </button>
                  <button className="btn" type="button" onClick={saveDraft}>
                    Save
                  </button>
                  <button className="btn btnDanger" type="button" onClick={deleteCase}>
                    Delete
                  </button>
                </div>
              </div>

              <label className="formLabel">
                Case name
                <input className="formInput" value={caseDraft.name} onChange={(e) => setCaseDraft({ ...caseDraft, name: e.target.value })} spellCheck={false} />
              </label>

              <label className="formLabel">
                Expected
                <select className="formSelect" value={caseDraft.expected ?? ''} onChange={(e) => setCaseDraft({ ...caseDraft, expected: (e.target.value as 'pass' | 'fail') || undefined })}>
                  <option value="">Not set</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </label>

              <div className="sideDivider" />
              <CandidateEditor value={caseDraft.candidate} onChange={(next) => setCaseDraft({ ...caseDraft, candidate: next })} />

              <div className="sideDivider" />
              <ResumeEditor value={caseDraft.candidate.resume} onChange={(next) => setCaseDraft({ ...caseDraft, candidate: { ...caseDraft.candidate, resume: next } })} />
            </>
          ) : (
            <div className="emptyNote">Select a test case to edit.</div>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="configTitle">Stream Summary</div>
        <div className="pageKicker" style={{ marginTop: 8, marginBottom: 8 }}>
          Pass: <strong>{streamTotals?.pass ?? 0}</strong> | Fail: <strong>{streamTotals?.fail ?? 0}</strong>
        </div>
        <div className="insightPanel" style={{ padding: 14 }}>
          <div className="insightPanelTitle">Stream Trend</div>
          <MetricBarChart
            points={buildDailyTrend(
              (
                (metrics?.screenedHistoryByStream?.[stream] ?? []).map((entry) => ({
                  ts: entry.ts,
                  ok: entry.pass,
                })) as TrendEvent[]
              ),
              6,
            )}
          />
        </div>
      </div>
    </>
  )
}

function deepCloneCase(c: EligibilityTestCase): EligibilityTestCase {
  const cloned = JSON.parse(JSON.stringify(c)) as EligibilityTestCase
  return { ...cloned, candidate: normalizeCandidateProfile(cloned.candidate) }
}

function deepCloneShopCase(c: ShopTestCase): ShopTestCase {
  return {
    ...JSON.parse(JSON.stringify(c)) as ShopTestCase,
    shop: cloneShopState(c.shop),
  }
}

function createShopStateForRule(rule: RuleRecord): ShopState {
  if (rule.type === 'blank') {
    return {
      items: {},
      order: {
        orderId: 'ORD-NEW',
        created: false,
        paymentConfirmed: false,
        packed: false,
        dispatched: false,
        status: 'draft',
        assignedShift: 'unassigned',
        itemName: '',
        quantity: 1,
        customerName: '',
        priority: 'standard',
      },
      support: {
        ticketId: 'TCK-NEW',
        customerName: '',
        issueType: '',
        priority: 'normal',
        state: 'new',
        raised: false,
        solved: false,
        revoked: false,
        stable: false,
        ticketsRaised: 0,
        solvedTickets: 0,
        revokedTickets: 0,
        stableTickets: 0,
        undergoingTickets: 0,
      },
    }
  }
  return createDefaultShopState()
}

function cloneShopState(state: ShopState): ShopState {
  return {
    items: Object.fromEntries(
      Object.entries(state.items).map(([name, item]) => [name, { ...item }]),
    ),
    order: { ...state.order },
    support: { ...state.support },
  }
}

function ShopStateEditor({
  ruleType,
  value,
  onChange,
}: {
  ruleType: RuleRecord['type']
  value: ShopState
  onChange: (next: ShopState) => void
}) {
  const items = Object.values(value.items).sort((a, b) => a.name.localeCompare(b.name))

  if (ruleType === 'support') {
    return (
      <>
        <div className="configTitle">Support Ticket</div>
        <label className="formLabel">
          Ticket ID
          <input className="formInput" value={value.support.ticketId} onChange={(e) => onChange({ ...value, support: { ...value.support, ticketId: e.target.value } })} spellCheck={false} />
        </label>
        <label className="formLabel">
          Customer
          <input className="formInput" value={value.support.customerName} onChange={(e) => onChange({ ...value, support: { ...value.support, customerName: e.target.value } })} spellCheck={false} />
        </label>
        <label className="formLabel">
          Issue Type
          <input className="formInput" value={value.support.issueType} onChange={(e) => onChange({ ...value, support: { ...value.support, issueType: e.target.value } })} spellCheck={false} />
        </label>
        <label className="formLabel">
          Priority
          <select className="formSelect" value={value.support.priority} onChange={(e) => onChange({ ...value, support: { ...value.support, priority: e.target.value as ShopState['support']['priority'] } })}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </label>
        <label className="formLabel">
          Support State
          <select className="formSelect" value={value.support.state} onChange={(e) => onChange({ ...value, support: { ...value.support, state: e.target.value as ShopState['support']['state'] } })}>
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="undergoing">Undergoing</option>
            <option value="pending_customer">Pending customer</option>
            <option value="resolved">Resolved</option>
            <option value="revoked">Revoked</option>
            <option value="stable">Stable</option>
          </select>
        </label>
        <div className="skillGrid">
          <label className="skillPill"><input type="checkbox" checked={value.support.raised} onChange={(e) => onChange({ ...value, support: { ...value.support, raised: e.target.checked } })} />Raised</label>
          <label className="skillPill"><input type="checkbox" checked={value.support.solved} onChange={(e) => onChange({ ...value, support: { ...value.support, solved: e.target.checked } })} />Solved</label>
          <label className="skillPill"><input type="checkbox" checked={value.support.revoked} onChange={(e) => onChange({ ...value, support: { ...value.support, revoked: e.target.checked } })} />Revoked</label>
          <label className="skillPill"><input type="checkbox" checked={value.support.stable} onChange={(e) => onChange({ ...value, support: { ...value.support, stable: e.target.checked } })} />Stable</label>
        </div>
        <div className="sideDivider" />
        <div className="configTitle">Ticket Metrics</div>
        <label className="formLabel">
          Tickets Raised
          <input className="formInput" type="number" value={value.support.ticketsRaised} onChange={(e) => onChange({ ...value, support: { ...value.support, ticketsRaised: Number(e.target.value) } })} />
        </label>
        <label className="formLabel">
          Undergoing Tickets
          <input className="formInput" type="number" value={value.support.undergoingTickets} onChange={(e) => onChange({ ...value, support: { ...value.support, undergoingTickets: Number(e.target.value) } })} />
        </label>
        <label className="formLabel">
          Solved Tickets
          <input className="formInput" type="number" value={value.support.solvedTickets} onChange={(e) => onChange({ ...value, support: { ...value.support, solvedTickets: Number(e.target.value) } })} />
        </label>
        <label className="formLabel">
          Revoked Tickets
          <input className="formInput" type="number" value={value.support.revokedTickets} onChange={(e) => onChange({ ...value, support: { ...value.support, revokedTickets: Number(e.target.value) } })} />
        </label>
        <label className="formLabel">
          Stable Tickets
          <input className="formInput" type="number" value={value.support.stableTickets} onChange={(e) => onChange({ ...value, support: { ...value.support, stableTickets: Number(e.target.value) } })} />
        </label>
      </>
    )
  }

  return (
    <>
      <div className="configTitle">State</div>
      {items.length ? (
        <div className="streamBreakdown">
          {items.map((item) => (
            <div key={item.name} className="streamRow">
              <input
                className="formInput"
                value={item.name}
                onChange={(e) => {
                  const nextName = e.target.value
                  if (!nextName.trim()) return
                  const copy = { ...value.items }
                  delete copy[item.name]
                  copy[nextName] = { ...item, name: nextName }
                  onChange({ ...value, items: copy })
                }}
                spellCheck={false}
              />
              <input
                className="formInput"
                style={{ width: 92 }}
                type="number"
                value={item.quantity}
                onChange={(e) =>
                  onChange({
                    ...value,
                    items: {
                      ...value.items,
                      [item.name]: { ...item, quantity: Number(e.target.value) },
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="emptyNote">No stock items yet.</div>
      )}

      <div className="labActions" style={{ marginTop: 10, marginBottom: 10 }}>
        <button
          className="btn"
          type="button"
          onClick={() => {
            const base = 'Item'
            let name = base
            let count = 2
            while (value.items[name]) {
              name = `${base} ${count}`
              count += 1
            }
            onChange({
              ...value,
              items: {
                ...value.items,
                [name]: { name, quantity: 0 },
              },
            })
          }}
        >
          Add Item
        </button>
      </div>

      <div className="sideDivider" />
      <div className="configTitle">Order / Trigger State</div>
      <label className="formLabel">
        Order ID
        <input className="formInput" value={value.order.orderId} onChange={(e) => onChange({ ...value, order: { ...value.order, orderId: e.target.value } })} spellCheck={false} />
      </label>
      <label className="formLabel">
        Customer
        <input className="formInput" value={value.order.customerName} onChange={(e) => onChange({ ...value, order: { ...value.order, customerName: e.target.value } })} spellCheck={false} />
      </label>
      <label className="formLabel">
        Item Name
        <input className="formInput" value={value.order.itemName} onChange={(e) => onChange({ ...value, order: { ...value.order, itemName: e.target.value } })} spellCheck={false} />
      </label>
      <label className="formLabel">
        Quantity
        <input className="formInput" type="number" value={value.order.quantity} onChange={(e) => onChange({ ...value, order: { ...value.order, quantity: Number(e.target.value) } })} />
      </label>
      <label className="formLabel">
        Priority
        <select className="formSelect" value={value.order.priority} onChange={(e) => onChange({ ...value, order: { ...value.order, priority: e.target.value as ShopState['order']['priority'] } })}>
          <option value="standard">Standard</option>
          <option value="express">Express</option>
        </select>
      </label>
      <label className="formLabel">
        Shift
        <select className="formSelect" value={value.order.assignedShift} onChange={(e) => onChange({ ...value, order: { ...value.order, assignedShift: e.target.value as ShopState['order']['assignedShift'] } })}>
          <option value="unassigned">Unassigned</option>
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
          <option value="night">Night</option>
        </select>
      </label>
      <div className="skillGrid">
        <label className="skillPill"><input type="checkbox" checked={value.order.created} onChange={(e) => onChange({ ...value, order: { ...value.order, created: e.target.checked } })} />Triggered</label>
        <label className="skillPill"><input type="checkbox" checked={value.order.paymentConfirmed} onChange={(e) => onChange({ ...value, order: { ...value.order, paymentConfirmed: e.target.checked } })} />Payment</label>
        <label className="skillPill"><input type="checkbox" checked={value.order.packed} onChange={(e) => onChange({ ...value, order: { ...value.order, packed: e.target.checked } })} />Packed</label>
        <label className="skillPill"><input type="checkbox" checked={value.order.dispatched} onChange={(e) => onChange({ ...value, order: { ...value.order, dispatched: e.target.checked } })} />Dispatched</label>
      </div>
    </>
  )
}

function CandidateEditor({
  value,
  onChange,
}: {
  value: CandidateProfile
  onChange: (next: CandidateProfile) => void
}) {
  return (
    <>
      <div className="configTitle">Candidate</div>
      <label className="formLabel">
        Stream
        <select className="formSelect" value={value.stream} onChange={(e) => onChange({ ...value, stream: e.target.value as CandidateProfile['stream'] })}>
          {STREAMS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label className="formLabel">
        Track
        <select className="formSelect" value={value.isExperienced ? 'experienced' : 'fresher'} onChange={(e) => onChange({ ...value, isExperienced: e.target.value === 'experienced' })}>
          <option value="experienced">Experienced</option>
          <option value="fresher">Fresher</option>
        </select>
      </label>

      <label className="formLabel">
        Degree
        <select className="formSelect" value={value.degree} onChange={(e) => onChange({ ...value, degree: e.target.value as CandidateProfile['degree'] })}>
          <option value="btech">BTech</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="formLabel">
        CGPA
        <input className="formInput" type="number" step="0.1" value={value.cgpa} onChange={(e) => onChange({ ...value, cgpa: Number(e.target.value) })} />
      </label>

      <label className="formLabel">
        Years experience
        <input className="formInput" type="number" value={value.yearsExperience} onChange={(e) => onChange({ ...value, yearsExperience: Number(e.target.value) })} />
      </label>

      <label className="formLabel">
        React projects
        <input className="formInput" type="number" value={value.reactProjects} onChange={(e) => onChange({ ...value, reactProjects: Number(e.target.value) })} />
      </label>

      <div className="sideRow">
        <div className="sideKey">Skills</div>
        <div className="sideValue">Toggle</div>
      </div>

      <div className="skillGrid">
        {Object.entries(value.skills).map(([key, val]) => (
          <label key={key} className="skillPill">
            <input type="checkbox" checked={!!val} onChange={(e) => onChange({ ...value, skills: { ...value.skills, [key]: e.target.checked } as CandidateProfile['skills'] })} />
            {key.replaceAll('_', ' ')}
          </label>
        ))}
      </div>
    </>
  )
}

function ResumeEditor({
  value,
  onChange,
}: {
  value: CandidateProfile['resume']
  onChange: (next: CandidateProfile['resume']) => void
}) {
  return (
    <>
      <div className="configTitle">Resume</div>
      <label className="formLabel">
        Summary
        <textarea className="formTextarea" value={value.summary} onChange={(e) => onChange({ ...value, summary: e.target.value })} rows={3} spellCheck={false} />
      </label>
      <label className="formLabel">
        Highlights (comma separated)
        <input
          className="formInput"
          value={value.highlights.join(', ')}
          onChange={(e) =>
            onChange({
              ...value,
              highlights: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          spellCheck={false}
        />
      </label>
    </>
  )
}

function LastRunPanel({ value }: { value: LastRun | null }) {
  if (!value) return <div className="emptyNote">No runs yet. Run a workflow or test case.</div>
  return (
    <div>
      <div className="configTitle">Last Run</div>
      <div className="pageKicker" style={{ marginTop: 6, marginBottom: 10 }}>
        {new Date(value.ts).toLocaleString()} | {value.label} | {value.outcome ?? (value.ok ? 'ok' : 'fail')}
        {value.stream ? ` | stream: ${value.stream}` : ''}
      </div>
      <div className="streamBreakdown">
        {value.log.slice(0, 8).map((e, idx) => (
          <div key={`${e.nodeId}:${idx}`} className="streamRow">
            <div className="streamName">{e.nodeTitle}</div>
            <div className="streamCounts">
              <span className={e.ok ? 'streamPass' : 'streamFail'}>{e.ok ? 'ok' : 'fail'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function JsonPanel({ rule }: { rule: RuleRecord }) {
  const json = React.useMemo(
    () =>
      JSON.stringify(
        {
          id: rule.id,
          name: rule.name,
          type: rule.type,
          workflow: rule.workflow,
          functions: rule.functions,
          eligibilityTestCases: rule.eligibilityTestCases,
        },
        null,
        2,
      ),
    [rule],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
    } catch {
      // ignore
    }
  }

  return (
    <div>
      <div className="configTitle" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <span>JSON</span>
        <button className="btn" type="button" onClick={copy}>
          Copy
        </button>
      </div>
      <textarea className="formTextarea" value={json} readOnly rows={10} />
    </div>
  )
}
