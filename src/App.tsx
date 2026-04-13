import './App.css'
import { useEffect, useState } from 'react'
import { WorkflowBuilder } from './ui/WorkflowBuilder'
import type { WorkflowState } from './workflow/types'
import { createBlankWorkflow } from './workflow/blank'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import type { RuleRecord } from './rules/types'
import { deleteRule, upsertRule } from './rules/ruleStore'
import type { MetricsByRuleId } from './analytics/types'
import { normalizeMetricsCollection, recordRuleRun } from './analytics/metrics'
import { Sidebar, type SidebarPage } from './ui/Sidebar'
import { DashboardOverview } from './ui/DashboardOverview'
import { RuleManagementPage } from './ui/RuleManagementPage'
import { FlowLabPage } from './ui/FlowLabPage'
import { AnalyticsPage } from './ui/AnalyticsPage'
import type { FunctionDef } from './functions/types'
import { createSweetShopSeedFunctions, createSweetShopSeedWorkflow } from './rules/seed'
import { createEligibilitySeedFunctions, createEligibilitySeedWorkflow } from './rules/eligibilitySeed'
import {
  createOrderProcessingSeedFunctions,
  createOrderProcessingSeedWorkflow,
  createOrderProcessingTestCases,
} from './rules/orderProcessingSeed'
import {
  createSupportSeedFunctions,
  createSupportSeedWorkflow,
  createSupportTestCases,
} from './rules/supportSeed'
import type { RuleType } from './rules/types'
import { createDefaultEligibilityTestCases } from './eligibility/testCases'
import { RULE_TEMPLATES, SYSTEM_RULE_TEMPLATES } from './rules/templatesSeed'

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      {title && <div className="cardTitle">{title}</div>}
      {children}
    </div>
  )
}

function App() {
  const [view, setView] = useLocalStorageState<'shell' | 'builder'>(
    'sweetshop.view.v1',
    'shell',
  )
  const [page, setPage] = useLocalStorageState<SidebarPage>(
    'sweetshop.page.v1',
    'dashboard',
  )
  const [workflow, setWorkflow] = useState<WorkflowState>(() =>
    createBlankWorkflow(),
  )
  const [builderFunctions, setBuilderFunctions] = useState<FunctionDef[]>([])
  const [builderRuleType, setBuilderRuleType] = useState<RuleType>('blank')
  const [builderKey, setBuilderKey] = useState(0)
  const [rules, setRules] = useLocalStorageState<RuleRecord[]>(
    'sweetshop.rules.v1',
    [],
  )
  const [activeRuleId, setActiveRuleId] = useLocalStorageState<string | null>(
    'sweetshop.activeRuleId.v1',
    null,
  )
  const [metrics, setMetrics] = useLocalStorageState<MetricsByRuleId>(
    'sweetshop.metrics.v1',
    {},
  )

  useEffect(() => {
    const needsMigration = rules.some((r) => {
      const maybe = r as { functions?: unknown; type?: unknown }
      return !Array.isArray(maybe.functions) || typeof maybe.type !== 'string'
    })
    if (!needsMigration) return
    setRules((prev) =>
      prev.map((r) => ({
        ...r,
        type: (r as { type?: unknown }).type === 'sweetshop' || (r as { type?: unknown }).type === 'eligibility' || (r as { type?: unknown }).type === 'order' || (r as { type?: unknown }).type === 'support' || (r as { type?: unknown }).type === 'blank'
          ? ((r as { type?: unknown }).type as RuleType)
          : 'blank',
        functions: Array.isArray((r as { functions?: unknown }).functions)
          ? ((r as { functions?: unknown }).functions as FunctionDef[])
          : [],
      })),
    )
  }, [rules, setRules])

  useEffect(() => {
    const needsNormalization = Object.values(metrics).some((entry) => {
      const maybe = entry as {
        history?: unknown
        screenedHistory?: unknown
        screenedByStream?: unknown
        screenedHistoryByStream?: unknown
        totalRuns?: unknown
        screenedPass?: unknown
        screenedFail?: unknown
      }

      const missingHistory =
        !Array.isArray(maybe.history) ||
        (typeof maybe.totalRuns === 'number' &&
          maybe.totalRuns > 0 &&
          Array.isArray(maybe.history) &&
          maybe.history.length === 0)

      const missingScreenedHistory =
        !Array.isArray(maybe.screenedHistory) ||
        (((maybe.screenedPass as number | undefined) ?? 0) +
          ((maybe.screenedFail as number | undefined) ?? 0) >
          0 &&
          Array.isArray(maybe.screenedHistory) &&
          maybe.screenedHistory.length === 0)

      return (
        missingHistory ||
        missingScreenedHistory ||
        typeof maybe.screenedByStream !== 'object' ||
        maybe.screenedByStream === null ||
        typeof maybe.screenedHistoryByStream !== 'object' ||
        maybe.screenedHistoryByStream === null
      )
    })

    if (!needsNormalization) return
    setMetrics((prev) => normalizeMetricsCollection(prev))
  }, [metrics, setMetrics])

  useEffect(() => {
    const now = new Date().toISOString()
    const hasSweet = rules.some((r) => r.id === 'sweetshop_management')
    const hasElig = rules.some((r) => r.id === 'eligibility_criteria')
    const hasOrder = rules.some((r) => r.id === 'order_processing')
    const hasSupport = rules.some((r) => r.id === 'crm_support')
    if (hasSweet && hasElig && hasOrder && hasSupport) return
    setRules((prev) => {
      const next = prev.slice()
      if (!hasSweet) {
        next.unshift({
          id: 'sweetshop_management',
          name: 'Sweet Shop Management',
          type: 'sweetshop',
          workflow: createSweetShopSeedWorkflow(),
          functions: createSweetShopSeedFunctions(),
          updatedAt: now,
        })
      }
      if (!hasElig) {
        next.unshift({
          id: 'eligibility_criteria',
          name: 'Eligibility Criteria',
          type: 'eligibility',
          workflow: createEligibilitySeedWorkflow(),
          functions: createEligibilitySeedFunctions(),
          eligibilityTestCases: createDefaultEligibilityTestCases(),
          updatedAt: now,
        })
      }
      if (!hasOrder) {
        next.unshift({
          id: 'order_processing',
          name: 'Order Processing',
          type: 'order',
          workflow: createOrderProcessingSeedWorkflow(),
          functions: createOrderProcessingSeedFunctions(),
          shopTestCases: createOrderProcessingTestCases(),
          updatedAt: now,
        })
      }
      if (!hasSupport) {
        next.unshift({
          id: 'crm_support',
          name: 'CRM Support Operations',
          type: 'support',
          workflow: createSupportSeedWorkflow(),
          functions: createSupportSeedFunctions(),
          shopTestCases: createSupportTestCases(),
          updatedAt: now,
        })
      }
      return next
    })
  }, [rules, setRules])

  useEffect(() => {
    const sweet = rules.find((r) => r.id === 'sweetshop_management')
    if (!sweet) return
    if (sweet.workflow.nodes.length || sweet.workflow.edges.length) return
    setRules((prev) =>
      upsertRule(prev, {
        id: sweet.id,
        name: sweet.name,
        type: sweet.type,
        workflow: createSweetShopSeedWorkflow(),
        functions: sweet.functions ?? createSweetShopSeedFunctions(),
      }),
    )
  }, [rules, setRules])

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace(/^#/, '')
      if (hash.startsWith('/rule/')) {
        const ruleSegment = hash.slice('/rule/'.length)
        if (ruleSegment === 'new') {
          setWorkflow(createBlankWorkflow())
          setBuilderFunctions([])
          setBuilderRuleType('blank')
          setActiveRuleId(null)
          setBuilderKey((k) => k + 1)
          setView('builder')
          return
        }

        const found = rules.find((rule) => rule.id === decodeURIComponent(ruleSegment))
        if (!found) return
        setWorkflow(found.workflow)
        setBuilderFunctions(found.functions ?? [])
        setBuilderRuleType(found.type ?? 'blank')
        setActiveRuleId(found.id)
        setBuilderKey((k) => k + 1)
        setView('builder')
        return
      }

      const validPages: SidebarPage[] = ['dashboard', 'builder', 'analytics', 'templates', 'history', 'settings']
      const pageMatch = validPages.find(p => hash === `/${p}`)
      
      if (pageMatch || hash === '/rules' || hash === '/flowlab') {
        const nextPage = pageMatch || (hash === '/flowlab' ? 'simulation' : 'dashboard')
        setPage(nextPage)
        setView('shell')
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [rules, setActiveRuleId, setPage, setView])

  useEffect(() => {
    if (view === 'builder') {
      const expectedHash = activeRuleId ? `/rule/${encodeURIComponent(activeRuleId)}` : '/rule/new'
      if (window.location.hash !== `#${expectedHash}`) {
        window.location.hash = expectedHash
      }
    } else {
      const expectedHash = `/${page}`
      if (window.location.hash !== `#${expectedHash}`) {
        window.location.hash = expectedHash
      }
    }
  }, [view, page, activeRuleId])

  if (view === 'builder') {
    return (
      <WorkflowBuilder
        key={builderKey}
        ruleId={activeRuleId}
        ruleType={builderRuleType}
        initial={workflow}
        initialRuleName={activeRuleId ? (rules.find((r) => r.id === activeRuleId)?.name ?? undefined) : undefined}
        initialFunctions={builderFunctions}
        initialEligibilityTestCases={
          builderRuleType === 'eligibility' && activeRuleId
            ? rules.find((r) => r.id === activeRuleId)?.eligibilityTestCases
            : undefined
        }
        initialShopTestCases={
          builderRuleType !== 'eligibility' && activeRuleId
            ? rules.find((r) => r.id === activeRuleId)?.shopTestCases
            : undefined
        }
        onChange={setWorkflow}
        onRuleIdChange={(id) => {
          setActiveRuleId(id)
          window.location.hash = id ? `/rule/${encodeURIComponent(id)}` : '/rule/new'
        }}
        onSaveRule={({ id, name, workflow, functions, eligibilityTestCases, shopTestCases }) => {
          setRules((prev) =>
            upsertRule(prev, {
              id,
              name,
              type: builderRuleType,
              workflow,
              functions,
              eligibilityTestCases,
              shopTestCases,
            }),
          )
        }}
        onRunRule={({ id, ok, outcome, stream }) =>
          setMetrics((prev) =>
            recordRuleRun(prev, { ruleId: id, ok, outcome, stream }),
          )
        }
        onBack={() => {
          setView('shell')
          window.location.hash = `/${page}`
        }}
      />
    )
  }

  const openRule = (id: string) => {
    window.location.hash = `/rule/${encodeURIComponent(id)}`
  }

  const createNewRule = () => {
    window.location.hash = '/rule/new'
  }

  return (
    <div style={{ height: '100%', display: 'flex' }}>
      <Sidebar
        page={page}
        onNavigate={(nextPage) => {
          if (nextPage === 'builder') {
            createNewRule()
            return
          }
          setPage(nextPage)
          setView('shell')
          window.location.hash = `/${nextPage}`
        }}
        onCreateNewRule={createNewRule}
      />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {page === 'dashboard' ? (
          <DashboardOverview 
            rules={rules} 
            metrics={metrics} 
            onOpenRule={openRule} 
            onCreateNewRule={createNewRule} 
            onViewDetailedReport={() => {
              setPage('analytics')
              window.location.hash = '/analytics'
            }}
          />
        ) : null}
        {page === 'builder' ? (
          <RuleManagementPage
            rules={rules}
            metrics={metrics}
            onOpenRule={openRule}
            onOpenTemplate={(type) => {
              const template = RULE_TEMPLATES.find(t => t.type === type)
              if (!template) return
              const newRule: RuleRecord = {
                ...template,
                id: crypto.randomUUID(),
                name: `My ${template.name}`,
                updatedAt: new Date().toISOString(),
              }
              setRules((prev) => [newRule, ...prev])
              window.location.hash = `/rule/${encodeURIComponent(newRule.id)}`
            }}
            onCreateEligibilityRule={() => {
              const id = crypto.randomUUID()
              const record: RuleRecord = {
                id,
                name: 'Eligibility Criteria',
                type: 'eligibility',
                workflow: createEligibilitySeedWorkflow(),
                functions: createEligibilitySeedFunctions(),
                eligibilityTestCases: createDefaultEligibilityTestCases(),
                updatedAt: new Date().toISOString(),
              }
              setRules((prev) => [record, ...prev])
              window.location.hash = `/rule/${encodeURIComponent(record.id)}`
            }}
            onCreateSupportRule={() => {
              const id = crypto.randomUUID()
              const record: RuleRecord = {
                id,
                name: 'CRM Support Operations',
                type: 'support',
                workflow: createSupportSeedWorkflow(),
                functions: createSupportSeedFunctions(),
                shopTestCases: createSupportTestCases(),
                updatedAt: new Date().toISOString(),
              }
              setRules((prev) => [record, ...prev])
              window.location.hash = `/rule/${encodeURIComponent(record.id)}`
            }}
            onDeleteRule={(id) => {
              setRules((prev) => deleteRule(prev, id))
              setMetrics((prev) => {
                const copy = { ...prev }
                delete copy[id]
                return copy
              })
            }}
          />
        ) : null}
        {page === 'simulation' ? (
          <FlowLabPage
            rules={rules.filter(r => !r.name.includes('Template') && !r.id.includes('template'))}
            metrics={metrics}
            onOpenRule={openRule}
            onUpdateRule={(next) =>
              setRules((prev) =>
                upsertRule(prev, {
                  id: next.id,
                  name: next.name,
                  type: next.type,
                  workflow: next.workflow,
                  functions: next.functions,
                  eligibilityTestCases: next.eligibilityTestCases,
                  shopTestCases: next.shopTestCases,
                }),
              )
            }
            onRunRecorded={({ ruleId, ok, outcome, stream }) =>
              setMetrics((prev) => recordRuleRun(prev, { ruleId, ok, outcome, stream }))
            }
          />
        ) : null}
        {page === 'analytics' && (
          <AnalyticsPage rules={rules} metrics={metrics} />
        )}
        {page === 'templates' && (
          <RuleManagementPage
            isTemplatesView
            rules={rules}
            templates={RULE_TEMPLATES}
            metrics={metrics}
            onOpenRule={openRule}
            onOpenTemplate={(type) => {
              const template = [...RULE_TEMPLATES, ...SYSTEM_RULE_TEMPLATES].find(t => t.type === type)
              if (!template) return
              const newRule: RuleRecord = {
                ...template,
                id: crypto.randomUUID(),
                name: `My ${template.name}`,
                updatedAt: new Date().toISOString(),
              }
              setRules((prev) => [newRule, ...prev])
              window.location.hash = `/rule/${encodeURIComponent(newRule.id)}`
            }}
            onCreateEligibilityRule={() => {}}
            onCreateSupportRule={() => {}}
            onDeleteRule={() => {}}
          />
        )}
        {page === 'history' && (
          <div className="pageRoot">
            <div className="pageHeader">
              <div className="pageTitle">Transaction History</div>
              <div className="pageKicker">Detailed log of recent rule executions and outcomes.</div>
            </div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {Object.entries(metrics).flatMap(([ruleId, m]) => {
                const ruleName = rules.find(r => r.id === ruleId)?.name || 'Unknown Rule';
                const events = m.history || [];
                return events.map((event, i) => (
                  <div key={`${ruleId}-${i}`} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'grid', gap: '4px' }}>
                      <div style={{ fontWeight: 900, fontSize: '14px' }}>{ruleName}</div>
                      <div style={{ fontSize: '12px', color: 'rgba(17, 24, 39, 0.5)' }}>
                        {new Date(event.ts).toLocaleString()}
                      </div>
                    </div>
                    <div className={`pill ${event.ok ? 'sparkGood' : 'sparkBad'}`} style={{ color: event.ok ? '#16a34a' : '#dc2626', background: event.ok ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', border: 'none' }}>
                      {event.ok ? 'SUCCESS' : 'FAILED'}
                    </div>
                  </div>
                ));
              }).length > 0 ? (
                Object.entries(metrics).flatMap(([ruleId, m]) => {
                  const ruleName = rules.find(r => r.id === ruleId)?.name || 'Unknown Rule';
                  const events = m.history || [];
                  return events.map((event, i) => (
                    <div key={`${ruleId}-${i}`} className="card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'grid', gap: '4px' }}>
                        <div style={{ fontWeight: 900, fontSize: '14px' }}>{ruleName}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(17, 24, 39, 0.5)' }}>
                          {new Date(event.ts).toLocaleString()}
                        </div>
                      </div>
                      <div className={`pill`} style={{ fontWeight: 900, fontSize: '11px', color: event.ok ? '#16a34a' : '#dc2626', background: event.ok ? 'rgba(22, 163, 74, 0.1)' : 'rgba(220, 38, 38, 0.1)', border: 'none' }}>
                        {event.ok ? 'SUCCESS' : 'FAILED'}
                      </div>
                    </div>
                  ));
                }).sort((a, b) => {
                  const tsA = new Date(a.props.children[0].props.children[1].props.children).getTime();
                  const tsB = new Date(b.props.children[0].props.children[1].props.children).getTime();
                  return tsB - tsA;
                })
              ) : (
                <Card>
                  <div className="emptyNote">Transaction logging is active. History will appear as rules are executed.</div>
                </Card>
              )}
            </div>
          </div>
        )}
        {page === 'settings' && (
          <div className="pageRoot">
            <div className="pageHeader">
              <div className="pageTitle">Settings</div>
              <div className="pageKicker">Configure platform preferences and environment settings.</div>
            </div>
            <div className="grid2">
              <Card title="Environment">
                <div className="formLabel">Default Rule Workspace</div>
                <input className="formInput" defaultValue="Enterprise Cloud" />
              </Card>
              <Card title="Notifications">
                <div className="skillGrid">
                  <label className="skillPill">
                    <input type="checkbox" defaultChecked /> Alert on Rule Failure
                  </label>
                  <label className="skillPill">
                    <input type="checkbox" /> Daily Analytics Digest
                  </label>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
