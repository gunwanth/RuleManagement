import './Pages.css'
import { useState } from 'react'
import type { MetricsByRuleId } from '../analytics/types'
import { getRuleMetrics } from '../analytics/metrics'
import type { RuleRecord } from '../rules/types'
import type { SidebarPage } from './Sidebar'

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
  onOpenTemplate,
  onNavigate,
  isTemplatesView = false,
  templates = [],
}: {
  rules: RuleRecord[]
  metrics: MetricsByRuleId
  onOpenRule: (id: string) => void
  onDeleteRule: (id: string) => void
  onCreateEligibilityRule: () => void
  onCreateSupportRule: () => void
  onOpenTemplate?: (type: string) => void
  onNavigate?: (page: SidebarPage) => void
  isTemplatesView?: boolean
  templates?: RuleRecord[]
}) {
  const categories = [
    { id: 'fraud', name: 'Fraud Detection', icon: '🛡️' },
    { id: 'finance', name: 'Finance Management', icon: '💰' },
    { id: 'alerts', name: 'Alerts & Notifications', icon: '🔔' },
    { id: 'transactions', name: 'Transactions', icon: '💳' },
    { id: 'sweetshop', name: 'Sweet Shop', icon: '🍬' },
    { id: 'eligibility', name: 'Eligibility', icon: '✅' },
    { id: 'order', name: 'Order Processing', icon: '📦' },
    { id: 'support', name: 'CRM Support', icon: '🎧' },
  ]

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  const ruleGroups = [
    { id: 'support-transactions-alerts', name: 'CRM Support Operations, Transactions & Alerts', types: ['support', 'transactions', 'alerts'] },
    { id: 'shop-order', name: 'Shop Management & Order Processing', types: ['sweetshop', 'order'] },
    { id: 'eligibility-fraud', name: 'Eligibility & Fraud Detection', types: ['eligibility', 'fraud'] },
  ]

  return (
    <div className="pageRoot">
      <div className="pageHeader">
        <div className="pageHeaderRow">
          <div>
            <div className="pageTitle">{isTemplatesView ? 'Rule Templates' : 'Rule Management'}</div>
            <div className="pageKicker">
              {isTemplatesView 
                ? 'Quickly start with pre-built rule structures for common use cases.' 
                : 'All rules are isolated unless you connect nodes inside a rule.'}
            </div>
          </div>
          {!isTemplatesView && (
            <div className="labActions">
              <button className="btn" type="button" onClick={onCreateEligibilityRule}>
                Add Eligibility Criteria Rule
              </button>
              <button className="btn" type="button" onClick={onCreateSupportRule}>
                Add CRM Support Rule
              </button>
            </div>
          )}
        </div>
      </div>

      {isTemplatesView && (
        <>
          <div className="pageHeader" style={{ marginTop: '32px' }}>
            <div className="pageTitle" style={{ fontSize: '18px' }}>Current Active Rules</div>
            <div className="pageKicker">Your actual production rules.</div>
          </div>
          <div className="ruleGrid" style={{ marginBottom: '40px' }}>
            {ruleGroups.map((group) => {
              const groupRules = rules.filter(r => group.types.includes(r.type))
              const isExpanded = expandedGroup === group.id
              return (
                <div key={group.id} className="ruleCard" onClick={() => setExpandedGroup(isExpanded ? null : group.id)} style={{ cursor: 'pointer' }}>
                  <div className="ruleCardTop">
                    <div className="ruleCardName">{group.name}</div>
                    <div className="pill">{groupRules.length} rules</div>
                  </div>
                  <div className="ruleCardMeta">Click to view rules and actions</div>
                  {isExpanded && (
                    <div style={{ marginTop: '12px' }}>
                      {groupRules.map((r) => {
                        const m = getRuleMetrics(metrics, r.id)
                        const isEligibility = r.type === 'eligibility'
                        const baseTotal = isEligibility ? (m.screenedPass ?? 0) + (m.screenedFail ?? 0) : m.totalRuns
                        const pct = baseTotal ? Math.round(((isEligibility ? (m.screenedPass ?? 0) : m.successRuns) / baseTotal) * 100) : 0
                        return (
                          <div key={r.id} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '8px', marginTop: '8px' }}>
                            <div style={{ fontWeight: 'bold' }}>{r.name}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.workflow.nodes.length} nodes - {pct}% success</div>
                            <div className="ruleCardActions" style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button className="btn btnPrimary" onClick={(e) => { e.stopPropagation(); onOpenRule(r.id) }} type="button">Open Builder</button>
                              <button className="btn" onClick={(e) => { e.stopPropagation(); onOpenRule(r.id) }} type="button">Manual Test Cases</button>
                              <button className="btn" onClick={(e) => { e.stopPropagation(); onNavigate?.('flowlab') }} type="button">Simulation Lab</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="pageHeader">
            <div className="pageTitle" style={{ fontSize: '18px' }}>Available Templates</div>
            <div className="pageKicker">Pre-configured templates to build new rules.</div>
          </div>
          <div className="templateCategories" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            {templates.map(template => {
              const category = categories.find(c => c.id === template.type) || { icon: '📄', name: template.name };
              return (
                <div key={template.id} className="ruleCard" style={{ cursor: 'pointer' }} onClick={() => onOpenTemplate?.(template.type)}>
                  <div className="ruleCardTop">
                    <div className="ruleCardName" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{category.icon}</span>
                      {template.name}
                    </div>
                  </div>
                  <div className="ruleCardMeta">
                    Click to open {template.name} rule builder with pre-configured flows and functions.
                  </div>
                  <div className="ruleCardActions" style={{ marginTop: '12px' }}>
                    <button className="btn btnPrimary" type="button">Use Template</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!isTemplatesView && (
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
          {rules.length === 0 && (
            <div className="emptyNote">No rules yet. Click “Create New Rule” to start.</div>
          )}
        </div>
      )}
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
