import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Controls,
  MiniMap,
  Panel,
  getNodesBounds,
  getViewportForBounds,
  type OnSelectionChangeParams,
  useEdgesState,
  useNodesState,
  type Connection,
  type Node,
  type ReactFlowInstance,
} from 'reactflow'
import './WorkflowBuilder.css'

import { WorkflowNode as WorkflowNodeComponent } from '../workflow/nodes/WorkflowNode'
import { NODE_TEMPLATES, createWorkflowNode } from '../workflow/nodeFactory'
import type {
  NewNodeTemplate,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeData,
  WorkflowState,
} from '../workflow/types'
import type { FunctionDef, FunctionParamDef } from '../functions/types'
import { createDefaultShopState } from '../shop/defaultState'
import type { ShopState } from '../shop/types'
import { applyAction, evaluateCondition } from '../shop/engine'
import type { CandidateProfile } from '../eligibility/types'
import { createDefaultCandidate, normalizeCandidateProfile } from '../eligibility/types'
import { evaluateEligibilityCondition } from '../eligibility/engine'
import type { EligibilityTestCase, ShopTestCase } from '../rules/types'
import { createDefaultEligibilityTestCases } from '../eligibility/testCases'
import { runWorkflow, type RunLogEntry } from '../workflow/runEngine'
import { createBlankWorkflow } from '../workflow/blank'

type NodeLinkedTestCaseSummary = {
  id: string
  name: string
  expected?: 'pass' | 'fail'
}

type WorkflowBuilderProps = {
  ruleId: string | null
  ruleType: import('../rules/types').RuleType
  initial: WorkflowState
  initialFunctions: FunctionDef[]
  initialEligibilityTestCases?: EligibilityTestCase[]
  initialShopTestCases?: ShopTestCase[]
  onChange: (next: WorkflowState) => void
  onRuleIdChange: (id: string | null) => void
  onSaveRule: (args: {
    id: string
    name: string
    workflow: WorkflowState
    functions: FunctionDef[]
    eligibilityTestCases?: EligibilityTestCase[]
    shopTestCases?: ShopTestCase[]
  }) => void
  onRunRule: (args: {
    id: string
    ok: boolean
    outcome?: 'pass' | 'fail'
    stream?: string
  }) => void
  onBack: () => void
}

const nodeTypes = { workflow: WorkflowNodeComponent }

function downloadJson(filename: string, json: string) {
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function WorkflowBuilder({
  ruleId,
  initial,
  initialFunctions,
  ruleType,
  initialEligibilityTestCases,
  initialShopTestCases,
  onChange,
  onRuleIdChange,
  onSaveRule,
  onRunRule,
  onBack,
}: WorkflowBuilderProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNodeData>(
    initial.nodes,
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges)

  const [ruleName, setRuleName] = useState(() =>
    initial.edges.length ? 'Buy Sweet Rule' : 'New Rule',
  )
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [inspectorTab, setInspectorTab] = useState<'edit' | 'dashboard'>(
    'dashboard',
  )
  const [functions, setFunctions] = useState<FunctionDef[]>(() => initialFunctions ?? [])

  const [shop, setShop] = useState<ShopState>(() => createInitialShopState(ruleType))
  const [candidate, setCandidate] = useState<CandidateProfile>(() => createDefaultCandidate())
  const [eligibilityCases, setEligibilityCases] = useState<EligibilityTestCase[]>(() =>
    initialEligibilityTestCases?.length
      ? initialEligibilityTestCases
      : ruleType === 'eligibility'
        ? createDefaultEligibilityTestCases()
        : [],
  )
  const [shopCases, setShopCases] = useState<ShopTestCase[]>(
    () => initialShopTestCases ?? [],
  )
  const [activeCaseId, setActiveCaseId] = useState<string | null>(
    ruleType === 'eligibility'
      ? eligibilityCases[0]?.id ?? null
      : initialShopTestCases?.[0]?.id ?? null,
  )
  const [testModeIsolated, setTestModeIsolated] = useState(true)
  const [caseResults, setCaseResults] = useState<
    Record<
      string,
      { ok: boolean; outcome?: 'pass' | 'fail'; log: RunLogEntry[]; ranAt: string }
    >
  >({})
  const [runLog, setRunLog] = useState<RunLogEntry[]>([])
  const [activeFnId, setActiveFnId] = useState<string | null>(null)
  const [activeFnParams, setActiveFnParams] = useState<Record<string, unknown>>({})
  const [activeFnOutput, setActiveFnOutput] = useState<string | null>(null)

  const isBlankWorkflow = useMemo(
    () => nodes.length === 0 && edges.length === 0,
    [nodes.length, edges.length],
  )
  const [openNodes, setOpenNodes] = useState(() => initial.nodes.length > 0)
  const [openFunctions, setOpenFunctions] = useState(!isBlankWorkflow)
  const [openInspector, setOpenInspector] = useState(!isBlankWorkflow)
  const [openStocks, setOpenStocks] = useState(!isBlankWorkflow)
  const [openRunLog, setOpenRunLog] = useState(!isBlankWorkflow)

  const prevBlankRef = useRef(false)
  useEffect(() => {
    const wasBlank = prevBlankRef.current
    prevBlankRef.current = isBlankWorkflow
    if (!isBlankWorkflow || wasBlank) return

    setOpenNodes(false)
    setOpenFunctions(false)
    setOpenInspector(false)
    setOpenStocks(false)
    setOpenRunLog(false)
  }, [isBlankWorkflow])

  useEffect(() => {
    if (!selectedNodeId) return
    setOpenInspector(true)
    setInspectorTab('dashboard')
  }, [selectedNodeId])

  useEffect(() => {
    onChange({ nodes: nodes as WorkflowNode[], edges: edges as WorkflowEdge[] })
  }, [nodes, edges, onChange])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 1800)
    return () => window.clearTimeout(t)
  }, [toast])

  const edgeBaseStyle = useMemo(
    () => ({
      stroke: 'rgba(17, 24, 39, 0.32)',
      strokeWidth: 2,
    }),
    [],
  )

  const displayEdges = useMemo(() => {
    return edges.map((edge) => {
      const hovered = edge.id === hoveredEdgeId
      return {
        ...edge,
        animated: hovered ? true : edge.animated,
        style: {
          ...edgeBaseStyle,
          ...(edge.style ?? {}),
          stroke: hovered ? 'rgba(124, 58, 237, 0.95)' : edgeBaseStyle.stroke,
          strokeWidth: hovered ? 3 : edgeBaseStyle.strokeWidth,
        },
      }
    })
  }, [edges, edgeBaseStyle, hoveredEdgeId])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null
    const found = nodes.find((n) => n.id === selectedNodeId)
    return (found as WorkflowNode | undefined) ?? null
  }, [nodes, selectedNodeId])

  const onConnect = (connection: Connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...connection,
          type: 'smoothstep',
        },
        eds,
      ),
    )
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }

  const updateSelectedNode = (updater: (prev: WorkflowNodeData) => WorkflowNodeData) => {
    if (!selectedNodeId) return
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) return n
        const prev = n.data as WorkflowNodeData
        return { ...n, data: updater(prev) }
      }),
    )
  }

  const deleteNodeById = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
    setEligibilityCases((prev) => prev.filter((testCase) => testCase.targetNodeId !== id))
    setShopCases((prev) => prev.filter((testCase) => testCase.targetNodeId !== id))
    setCaseResults((prev) => {
      const linkedIds = new Set([
        ...eligibilityCases.filter((testCase) => testCase.targetNodeId === id).map((testCase) => testCase.id),
        ...shopCases.filter((testCase) => testCase.targetNodeId === id).map((testCase) => testCase.id),
      ])
      if (!linkedIds.size) return prev
      const copy = { ...prev }
      linkedIds.forEach((caseId) => {
        delete copy[caseId]
      })
      return copy
    })
    if (selectedNodeId === id) setSelectedNodeId(null)
    setToast('Deleted node')
  }

  const maybeOfferNodeTestCase = (
    node: WorkflowNode,
    sourceFn?: FunctionDef | null,
  ) => {
    const nodeKind = (node.data as WorkflowNodeData).kind
    if (nodeKind !== 'action' && nodeKind !== 'condition') return

    const shouldCreate = window.confirm(
      `Do you want to create a test case for "${node.data.title}" now?`,
    )
    if (!shouldCreate) return

    if (ruleType === 'eligibility') {
      const next: EligibilityTestCase = {
        id: crypto.randomUUID(),
        name: `${node.data.title} test`,
        expected: nodeKind === 'condition' ? 'pass' : undefined,
        targetNodeId: node.id,
        candidate: createDefaultCandidate(),
      }
      setEligibilityCases((prev) => [next, ...prev])
      setActiveCaseId(next.id)
      setCandidate(normalizeCandidateProfile(next.candidate))
      setOpenStocks(true)
      setToast(`Created test case for ${node.data.title}`)
      return
    }

    const nextShop = cloneShopState(createInitialShopState(ruleType))
    const preferredSweet =
      typeof sourceFn?.params.find((param) => param.key === 'sweetName')?.placeholder === 'string'
        ? (sourceFn?.params.find((param) => param.key === 'sweetName')?.placeholder as string)
        : ''

    if (ruleType === 'sweetshop' && preferredSweet && !nextShop.items[preferredSweet]) {
      nextShop.items[preferredSweet] = { name: preferredSweet, quantity: 10 }
    }

    const next: ShopTestCase = {
      id: crypto.randomUUID(),
      name: `${node.data.title} test`,
      expected: nodeKind === 'condition' ? 'pass' : undefined,
      targetNodeId: node.id,
      shop: nextShop,
    }
    setShopCases((prev) => [next, ...prev])
    setActiveCaseId(next.id)
    setShop(cloneShopState(next.shop))
    setOpenStocks(true)
    setToast(`Created test case for ${node.data.title}`)
  }

  const addNodeAtCenter = (template: NewNodeTemplate) => {
    const fallbackPos = { x: 120 + nodes.length * 18, y: 120 + nodes.length * 12 }

    if (!rfInstance || !wrapperRef.current) {
      const node = createWorkflowNode({ template, position: fallbackPos })
      setNodes((nds) => nds.concat(node))
      setSelectedNodeId(node.id)
      setInspectorTab('edit')
      setOpenInspector(true)
      maybeOfferNodeTestCase(node)
      return
    }

    const rect = wrapperRef.current.getBoundingClientRect()
    const position = rfInstance.screenToFlowPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    })

    const node = createWorkflowNode({ template, position })
    setNodes((nds) => nds.concat(node))
    setSelectedNodeId(node.id)
    setInspectorTab('edit')
    setOpenInspector(true)
    maybeOfferNodeTestCase(node)
  }

  const applyWorkflow = (
    next: WorkflowState,
    opts?: { resetUi?: boolean; functions?: FunctionDef[] },
  ) => {
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedNodeId(null)
    setHoveredEdgeId(null)
    setRunLog([])
    setActiveFnId(null)
    setActiveFnParams({})
    setActiveFnOutput(null)
    setShop(createInitialShopState(ruleType))
    setCandidate(createDefaultCandidate())
    setCaseResults({})
    if (opts?.functions) setFunctions(opts.functions)
    if (opts?.resetUi) {
      setRuleName(next.edges.length ? 'Buy Sweet Rule' : 'New Rule')
      setOpenFunctions(false)
      setOpenInspector(false)
      setOpenStocks(false)
      setOpenRunLog(false)
      setOpenNodes(false)
    }
    setToast('Loaded workflow')
    if (rfInstance) {
      window.setTimeout(() => {
        if (next.nodes.length) rfInstance.fitView({ padding: 0.15 })
        else rfInstance.setViewport({ x: 0, y: 0, zoom: 1 })
      }, 0)
    }
  }

  const saveRule = () => {
    const name = ruleName.trim() || 'Untitled Rule'
    const id = ruleId && ruleId !== 'example' ? ruleId : crypto.randomUUID()
    const wf: WorkflowState = {
      nodes: nodes as WorkflowNode[],
      edges: edges as WorkflowEdge[],
    }
    onSaveRule({
      id,
      name,
      workflow: wf,
      functions,
      eligibilityTestCases: ruleType === 'eligibility' ? eligibilityCases : undefined,
      shopTestCases: ruleType !== 'eligibility' ? shopCases : undefined,
    })
    onRuleIdChange(id)
    setToast('Saved rule')
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    if (!rfInstance) return

    const payload = event.dataTransfer.getData('application/reactflow')
    const template = (NODE_TEMPLATES as Record<string, NewNodeTemplate>)[payload]
    const fnId = event.dataTransfer.getData('application/sweetshop-function')

    const position = rfInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    if (template) {
      const node = createWorkflowNode({ template, position })
      setNodes((nds) => nds.concat(node))
      setSelectedNodeId(node.id)
      setInspectorTab('edit')
      setOpenInspector(true)
      maybeOfferNodeTestCase(node)
      return
    }

    if (fnId) {
      const fn = functions.find((f) => f.id === fnId)
      if (!fn) return

      const defaultParams: Record<string, unknown> = {}
      fn.params.forEach((p) => {
        if (p.type === 'string') defaultParams[p.key] = p.placeholder ?? ''
        if (p.type === 'number')
          defaultParams[p.key] = p.placeholder ? Number(p.placeholder) : 0
        if (p.type === 'boolean') defaultParams[p.key] = false
      })

      const newNode: WorkflowNode = {
        id: crypto.randomUUID(),
        type: 'workflow',
        position,
        data: {
          kind: fn.kind === 'condition' ? 'condition' : 'action',
          title: fn.name,
          icon: fn.icon,
          config: { functionId: fn.id, params: defaultParams },
        },
      }

      setNodes((nds) => nds.concat(newNode))
      setSelectedNodeId(newNode.id)
      setInspectorTab('edit')
      setOpenInspector(true)
      maybeOfferNodeTestCase(newNode, fn)
    }
  }

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return
    deleteNodeById(selectedNodeId)
  }

  const exportPng = async () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null
    if (!viewport) {
      setToast('Could not find canvas viewport')
      return
    }

    const { toPng } = await import('html-to-image')
    const bounds = getNodesBounds(nodes)
    const width = 1600
    const height = 900
    const viewportTransform = getViewportForBounds(bounds, width, height, 0.12, 2)

    const dataUrl = await toPng(viewport, {
      backgroundColor: '#f6f7fb',
      width,
      height,
      style: {
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(${viewportTransform.x}px, ${viewportTransform.y}px) scale(${viewportTransform.zoom})`,
      },
    })

    const a = document.createElement('a')
    a.setAttribute('download', `${ruleName.trim().replaceAll(' ', '_').toLowerCase() || 'workflow'}.png`)
    a.setAttribute('href', dataUrl)
    a.click()
    setToast('Exported PNG')
  }

  const runFunctionNow = (fn: FunctionDef) => {
    if (ruleType === 'eligibility') {
      const res = evaluateEligibilityCondition(candidate, fn, activeFnParams)
      setActiveFnOutput(res.message)
      setToast(res.value ? 'Condition: PASS' : 'Condition: FAIL')
      return
    }

    if (fn.kind === 'action') {
      const res = applyAction(shop, fn, activeFnParams)
      setShop(res.next)
      setActiveFnOutput(res.message)
      setToast(res.ok ? 'Function executed' : 'Function error')
      return
    }

    const res = evaluateCondition(shop, fn, activeFnParams)
    setActiveFnOutput(res.message)
    setToast('Condition evaluated')
  }

  const resetShop = () => {
    setShop(createInitialShopState(ruleType))
    setRunLog([])
    setToast(ruleType === 'sweetshop' ? 'Reset shop state' : 'Reset scenario state')
  }

  const resetCandidate = () => {
    setCandidate(createDefaultCandidate())
    setRunLog([])
    setToast('Reset candidate')
  }

  const runShopTestCase = (testCase: ShopTestCase) => {
    const result = runWorkflow({
      workflow: { nodes: nodes as WorkflowNode[], edges: edges as WorkflowEdge[] },
      functions,
      initialContext: cloneShopState(testCase.shop),
      engine: {
        applyAction: (ctx, fn, params) => applyAction(ctx as ShopState, fn, params),
        evaluateCondition: (ctx, fn, params) =>
          evaluateCondition(ctx as ShopState, fn, params),
      },
    })

    setCaseResults((prev) => ({
      ...prev,
      [testCase.id]: {
        ok: result.ok,
        outcome: result.outcome,
        log: result.log,
        ranAt: new Date().toISOString(),
      },
    }))
    setRunLog(result.log)
    setShop(result.finalContext as ShopState)

    if (!testModeIsolated && ruleId && ruleId !== 'example') {
      onRunRule({ id: ruleId, ok: result.ok })
    }

    setToast(result.ok ? 'Test run complete' : 'Test failed')
  }

  const runNow = () => {
    const ensureRuleId = () => {
      if (ruleId && ruleId !== 'example') return ruleId
      const name = ruleName.trim() || 'Untitled Rule'
      const id = crypto.randomUUID()
      const wf: WorkflowState = {
        nodes: nodes as WorkflowNode[],
        edges: edges as WorkflowEdge[],
      }
      onSaveRule({
        id,
        name,
        workflow: wf,
        functions,
        eligibilityTestCases: ruleType === 'eligibility' ? eligibilityCases : undefined,
        shopTestCases: ruleType !== 'eligibility' ? shopCases : undefined,
      })
      onRuleIdChange(id)
      setToast('Saved rule')
      return id
    }

    if (ruleType === 'eligibility') {
      const candidateToRun = candidate
      const result = runWorkflow({
        workflow: { nodes: nodes as WorkflowNode[], edges: edges as WorkflowEdge[] },
        functions,
        initialContext: candidateToRun,
        engine: {
          applyAction: (ctx) => ({ ok: false, message: 'No actions for eligibility', next: ctx }),
          evaluateCondition: (ctx, fn, params) =>
            evaluateEligibilityCondition(ctx as CandidateProfile, fn, params),
        },
      })
      setRunLog(result.log)
      setCandidate(result.finalContext as CandidateProfile)
      setToast(result.ok ? 'Run complete' : 'Run stopped with errors')
      onRunRule({
        id: ensureRuleId(),
        ok: result.ok,
        outcome: result.outcome,
        stream: (candidateToRun as CandidateProfile).stream,
      })
      return
    }

    const result = runWorkflow({
      workflow: { nodes: nodes as WorkflowNode[], edges: edges as WorkflowEdge[] },
      functions,
      initialContext: shop,
      engine: {
        applyAction: (ctx, fn, params) => applyAction(ctx as ShopState, fn, params),
        evaluateCondition: (ctx, fn, params) =>
          evaluateCondition(ctx as ShopState, fn, params),
      },
    })
    setRunLog(result.log)
    setShop(result.finalContext as ShopState)
    setToast(result.ok ? 'Run complete' : 'Run stopped with errors')

    onRunRule({ id: ensureRuleId(), ok: result.ok })
  }

  const createUserFunction = (fn: Omit<FunctionDef, 'id'>) => {
    const next: FunctionDef = { ...fn, id: `user:${crypto.randomUUID()}` }
    setFunctions((prev) => prev.concat(next))
    setToast('Created user function')
  }

  const exportWorkflow = async () => {
    const json = JSON.stringify(
      {
        name: ruleName,
        nodes,
        edges,
        functions,
        eligibilityTestCases: ruleType === 'eligibility' ? eligibilityCases : undefined,
        shopTestCases: ruleType !== 'eligibility' ? shopCases : undefined,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    )

    let copied = false
    try {
      await navigator.clipboard.writeText(json)
      copied = true
    } catch {
      copied = false
    }

    const safeName =
      ruleName.trim().length > 0
        ? ruleName.trim().replaceAll(' ', '_').toLowerCase()
        : 'workflow'
    downloadJson(`${safeName}.json`, json)
    setToast(copied ? 'Copied + downloaded JSON' : 'Downloaded JSON')
  }

  const onSelectionChange = (selection: OnSelectionChangeParams) => {
    const first = selection.nodes[0] as Node | undefined
    setSelectedNodeId(first?.id ?? null)
  }

  return (
    <div className="builderRoot">
      <header className="builderTopbar">
        <div className="builderTopbarLeft">
          <button className="btn" onClick={onBack} title="Back to dashboard">
            ← Dashboard
          </button>

          <div className="builderTitleBlock">
            <div className="builderTitle">Workflow Builder</div>
            <div className="builderSubtitle">Sweet Shop Management · Rules</div>
          </div>
        </div>

        <div className="builderTopbarRight">
          <div className="builderInputWrap">
            <label className="builderLabel" htmlFor="ruleName">
              Rule name
            </label>
            <input
              id="ruleName"
              className="builderInput"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              spellCheck={false}
            />
          </div>

          <button
            className="btn"
            onClick={() => addNodeAtCenter(NODE_TEMPLATES.action)}
          >
            Add Step
          </button>
          <button
            className="btn"
            onClick={() => {
              onRuleIdChange(null)
              applyWorkflow(createBlankWorkflow(), { resetUi: true, functions: [] })
            }}
          >
            New Rule
          </button>
          <button className="btn btnPrimary" onClick={saveRule}>
            Save Rule
          </button>
          <button className="btn" onClick={runNow}>
            Run
          </button>
          {ruleType === 'eligibility' ? (
            <button className="btn" onClick={resetCandidate}>
              Reset Candidate
            </button>
          ) : ruleType === 'sweetshop' ? (
            <button className="btn" onClick={resetShop}>
              Reset Shop
            </button>
          ) : ruleType === 'order' ? (
            <button className="btn" onClick={resetShop}>
              Reset Order State
            </button>
          ) : null}
          <button className="btn btnPrimary" onClick={exportWorkflow}>
            Export JSON
          </button>
          <button className="btn" onClick={exportPng}>
            Export PNG
          </button>
        </div>
      </header>

      <div className="builderBody">
        <aside className="builderSidebar">
          <Section
            title="Nodes"
            hint="Drag onto the canvas"
            open={openNodes}
            onToggle={() => setOpenNodes((v) => !v)}
          >
            <CanvasNodesList
              nodes={nodes as WorkflowNode[]}
              selectedNodeId={selectedNodeId}
              onSelect={(id) => {
                setSelectedNodeId(id)
                setOpenInspector(true)
                setInspectorTab('dashboard')
                const n = nodes.find((x) => x.id === id)
                if (n && rfInstance) {
                  rfInstance.setCenter(n.position.x, n.position.y, {
                    zoom: Math.max(0.9, rfInstance.getViewport().zoom),
                    duration: 250,
                  })
                }
              }}
              onDelete={deleteNodeById}
            />
            <div className="sideDivider" />
            <div className="palette">
              <PaletteItem id="start" label="Start" icon="S" />
              <PaletteItem id="action" label="Action" icon="A" />
              <PaletteItem id="condition" label="Condition" icon="C" />
              <PaletteItem id="end" label="End" icon="E" />
            </div>
          </Section>

          <Section
            title="Functions"
            hint={
              ruleType === 'eligibility'
                ? 'Click to evaluate on current candidate'
                : 'Click to execute on current shop state'
            }
            open={openFunctions}
            onToggle={() => setOpenFunctions((v) => !v)}
          >
            {functions.length === 0 ? (
              <div className="sideEmpty">
                No functions yet. Create one, then drag it onto the canvas.
              </div>
            ) : null}

            {functions.length ? (
              <div className="fnList">
                {functions.map((fn) => (
                  <button
                    key={fn.id}
                    className="fnItem"
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData(
                        'application/sweetshop-function',
                        fn.id,
                      )
                      event.dataTransfer.effectAllowed = 'move'
                    }}
                    onClick={() => {
                      setActiveFnId(fn.id)
                      setActiveFnOutput(null)
                      const initial: Record<string, unknown> = {}
                      fn.params.forEach((p) => {
                        if (p.type === 'string') initial[p.key] = p.placeholder ?? ''
                        if (p.type === 'number')
                          initial[p.key] = p.placeholder ? Number(p.placeholder) : 0
                        if (p.type === 'boolean') initial[p.key] = false
                      })
                      setActiveFnParams(initial)
                    }}
                  title={fn.description ?? fn.operation}
                >
                  <span className="fnIcon" aria-hidden="true">
                    {fn.icon ?? 'Fn'}
                  </span>
                  <span className="fnName">{fn.name}</span>
                  <span className="fnKind">{fn.kind}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {functions.length && activeFnId ? (
              <div className="fnRunner">
                {(() => {
                  const fn = functions.find((f) => f.id === activeFnId) ?? null
                  if (!fn) return null
                  return (
                    <>
                      <div className="configTitle">Runner</div>
                      <div className="sideRow">
                        <div className="sideKey">Function</div>
                        <div className="sideValue">{fn.name}</div>
                      </div>
                      <ParamsEditor
                        params={fn.params}
                        value={activeFnParams}
                        onChange={setActiveFnParams}
                      />
                      <button className="btn btnPrimary" onClick={() => runFunctionNow(fn)}>
                        Run Function
                      </button>
                      {activeFnOutput ? (
                        <div className="fnOutput">{activeFnOutput}</div>
                      ) : null}
                    </>
                  )
                })()}
              </div>
            ) : null}

            <CreateFunctionForm ruleType={ruleType} onCreate={createUserFunction} />
          </Section>

          <Section
            title="Inspector"
            open={openInspector}
            onToggle={() => setOpenInspector((v) => !v)}
          >
            {selectedNodeId ? (
              <Inspector
                node={selectedNode}
                onChange={updateSelectedNode}
                onDelete={deleteSelectedNode}
                functions={functions}
                shop={shop}
                candidate={candidate}
                ruleType={ruleType}
                tab={inspectorTab}
                onTabChange={setInspectorTab}
                nodeTestCases={
                  (
                    ruleType === 'eligibility' ? eligibilityCases : shopCases
                  )
                    .filter((testCase) => testCase.targetNodeId === selectedNodeId)
                    .map((testCase) => ({
                      id: testCase.id,
                      name: testCase.name,
                      expected: testCase.expected,
                    }))
                }
                nodeTestResults={caseResults}
                onCreateNodeTestCase={() => {
                  if (!selectedNode) return
                  maybeOfferNodeTestCase(selectedNode, selectedNode.data.config?.functionId
                    ? functions.find((fn) => fn.id === selectedNode.data.config?.functionId) ?? null
                    : null)
                }}
                onRunNodeTestCase={(testCaseId) => {
                  const selected = selectedNode
                  if (!selected) return
                  const selectedData = selected.data as WorkflowNodeData
                  const selectedFn = selectedData.config?.functionId
                    ? functions.find((fn) => fn.id === selectedData.config?.functionId) ?? null
                    : null
                  if (!selectedFn || !selectedData.config) {
                    setToast('Configure the node function first')
                    return
                  }

                  const ts = new Date().toISOString()

                  if (ruleType === 'eligibility') {
                    const found = eligibilityCases.find((testCase) => testCase.id === testCaseId)
                    if (!found) return
                    const evaluation = evaluateEligibilityCondition(
                      found.candidate,
                      selectedFn,
                      (selectedData.config.params ?? {}) as Record<string, unknown>,
                    )
                    const resultLog: RunLogEntry[] = [
                      {
                        nodeId: selected.id,
                        nodeTitle: selectedData.title,
                        kind: selectedData.kind,
                        ok: evaluation.ok,
                        conditionValue: evaluation.value,
                        message: `${selectedFn.name}: ${evaluation.message}`,
                      },
                    ]
                    setCaseResults((prev) => ({
                      ...prev,
                      [testCaseId]: {
                        ok: evaluation.ok,
                        outcome: evaluation.value ? 'pass' : 'fail',
                        log: resultLog,
                        ranAt: ts,
                      },
                    }))
                    setRunLog(resultLog)
                    setToast(evaluation.value ? 'Node test: PASS' : 'Node test: FAIL')
                    return
                  }

                  const found = shopCases.find((testCase) => testCase.id === testCaseId)
                  if (!found) return

                  if (selectedData.kind === 'action') {
                    const execution = applyAction(
                      cloneShopState(found.shop),
                      selectedFn,
                      (selectedData.config.params ?? {}) as Record<string, unknown>,
                    )
                    const resultLog: RunLogEntry[] = [
                      {
                        nodeId: selected.id,
                        nodeTitle: selectedData.title,
                        kind: selectedData.kind,
                        ok: execution.ok,
                        message: `${selectedFn.name}: ${execution.message}`,
                      },
                    ]
                    setCaseResults((prev) => ({
                      ...prev,
                      [testCaseId]: {
                        ok: execution.ok,
                        outcome: execution.ok ? 'pass' : 'fail',
                        log: resultLog,
                        ranAt: ts,
                      },
                    }))
                    setRunLog(resultLog)
                    setShop(execution.next)
                    setToast(execution.ok ? 'Node test: PASS' : 'Node test: FAIL')
                    return
                  }

                  const evaluation = evaluateCondition(
                    cloneShopState(found.shop),
                    selectedFn,
                    (selectedData.config.params ?? {}) as Record<string, unknown>,
                  )
                  const resultLog: RunLogEntry[] = [
                    {
                      nodeId: selected.id,
                      nodeTitle: selectedData.title,
                      kind: selectedData.kind,
                      ok: evaluation.ok,
                      conditionValue: evaluation.value,
                      message: `${selectedFn.name}: ${evaluation.message}`,
                    },
                  ]
                  setCaseResults((prev) => ({
                    ...prev,
                    [testCaseId]: {
                      ok: evaluation.ok,
                      outcome: evaluation.value ? 'pass' : 'fail',
                      log: resultLog,
                      ranAt: ts,
                    },
                  }))
                  setRunLog(resultLog)
                  setToast(evaluation.value ? 'Node test: PASS' : 'Node test: FAIL')
                }}
              />
            ) : (
              <div className="sideEmpty">
                {isBlankWorkflow
                  ? 'New rule: add a node, then select it to configure.'
                  : 'Select a node to see actions and details.'}
              </div>
            )}

            <div className="sideDivider" />
            <div className="sideHint">
              Tip: drag a connection handle to link nodes.
            </div>
          </Section>

          <Section
            title={ruleType === 'eligibility' ? 'Candidate' : ruleType === 'sweetshop' ? 'Stocks' : 'Scenario State'}
            hint={ruleType === 'eligibility' ? 'Test inputs' : ruleType === 'sweetshop' ? 'Live shop state' : 'Rule test scenarios'}
            open={openStocks}
            onToggle={() => setOpenStocks((v) => !v)}
          >
            {ruleType === 'eligibility' ? (
              <>
                <CandidatePanel value={candidate} onChange={setCandidate} />
                <div className="sideDivider" />
                <EligibilityTestLab
                  cases={eligibilityCases}
                  activeCaseId={activeCaseId}
                  results={caseResults}
                  isolated={testModeIsolated}
                  onToggleIsolated={() => setTestModeIsolated((v) => !v)}
                  onSelect={(id) => {
                    setActiveCaseId(id)
                    const found = eligibilityCases.find((c) => c.id === id)
                    if (found) setCandidate(normalizeCandidateProfile(found.candidate))
                  }}
                  onAdd={() => {
                    const next: EligibilityTestCase = {
                      id: crypto.randomUUID(),
                      name: 'New test',
                      expected: undefined,
                      candidate: createDefaultCandidate(),
                    }
                    setEligibilityCases((prev) => [next, ...prev])
                    setActiveCaseId(next.id)
                    setCandidate(normalizeCandidateProfile(next.candidate))
                  }}
                  onDelete={(id) => {
                    setEligibilityCases((prev) => prev.filter((c) => c.id !== id))
                    setCaseResults((prev) => {
                      const copy = { ...prev }
                      delete copy[id]
                      return copy
                    })
                    if (activeCaseId === id) setActiveCaseId(null)
                  }}
                  onRunSelected={() => {
                    const id = activeCaseId
                    if (!id) return
                    const found = eligibilityCases.find((c) => c.id === id)
                    if (!found) return
                    const result = runWorkflow({
                      workflow: { nodes: nodes as WorkflowNode[], edges: edges as WorkflowEdge[] },
                      functions,
                      initialContext: found.candidate,
                      engine: {
                        applyAction: (ctx) => ({ ok: false, message: 'No actions for eligibility', next: ctx }),
                        evaluateCondition: (ctx, fn, params) =>
                          evaluateEligibilityCondition(ctx as CandidateProfile, fn, params),
                      },
                    })
                    setCaseResults((prev) => ({
                      ...prev,
                      [id]: {
                        ok: result.ok,
                        outcome: result.outcome,
                        log: result.log,
                        ranAt: new Date().toISOString(),
                      },
                    }))
                    if (!testModeIsolated && ruleId && ruleId !== 'example') {
                      onRunRule({ id: ruleId, ok: result.ok, outcome: result.outcome })
                    }
                    setToast(result.outcome === 'pass' ? 'Screened: PASS' : result.outcome === 'fail' ? 'Screened: FAIL' : 'Test run complete')
                  }}
                  onRunAll={() => {
                    const nextResults: typeof caseResults = {}
                    eligibilityCases.forEach((c) => {
                      const result = runWorkflow({
                        workflow: { nodes: nodes as WorkflowNode[], edges: edges as WorkflowEdge[] },
                        functions,
                        initialContext: c.candidate,
                        engine: {
                          applyAction: (ctx) => ({ ok: false, message: 'No actions for eligibility', next: ctx }),
                          evaluateCondition: (ctx, fn, params) =>
                            evaluateEligibilityCondition(ctx as CandidateProfile, fn, params),
                        },
                      })
                      nextResults[c.id] = {
                        ok: result.ok,
                        outcome: result.outcome,
                        log: result.log,
                        ranAt: new Date().toISOString(),
                      }
                      if (!testModeIsolated && ruleId && ruleId !== 'example') {
                        onRunRule({ id: ruleId, ok: result.ok, outcome: result.outcome })
                      }
                    })
                    setCaseResults(nextResults)
                    setToast('Ran all test cases')
                  }}
                />
              </>
            ) : (
              <>
                <ShopStateEditor ruleType={ruleType} value={shop} onChange={setShop} />
                <div className="sideDivider" />
                <ShopTestLab
                  cases={shopCases}
                  activeCaseId={activeCaseId}
                  results={caseResults}
                  isolated={testModeIsolated}
                  onToggleIsolated={() => setTestModeIsolated((v) => !v)}
                  onSelect={(id) => {
                    setActiveCaseId(id)
                    const found = shopCases.find((c) => c.id === id)
                    if (found) setShop(cloneShopState(found.shop))
                  }}
                  onAdd={() => {
                    const next: ShopTestCase = {
                      id: crypto.randomUUID(),
                      name: 'New scenario',
                      expected: undefined,
                      shop: cloneShopState(shop),
                    }
                    setShopCases((prev) => [next, ...prev])
                    setActiveCaseId(next.id)
                    setShop(cloneShopState(next.shop))
                  }}
                  onSaveSelected={(id) => {
                    setShopCases((prev) =>
                      prev.map((testCase) =>
                        testCase.id === id
                          ? { ...testCase, shop: cloneShopState(shop) }
                          : testCase,
                      ),
                    )
                    setToast('Saved scenario')
                  }}
                  onRename={(id, name) => {
                    setShopCases((prev) =>
                      prev.map((testCase) =>
                        testCase.id === id ? { ...testCase, name } : testCase,
                      ),
                    )
                  }}
                  onDelete={(id) => {
                    setShopCases((prev) => prev.filter((c) => c.id !== id))
                    setCaseResults((prev) => {
                      const copy = { ...prev }
                      delete copy[id]
                      return copy
                    })
                    if (activeCaseId === id) setActiveCaseId(null)
                  }}
                  onRunSelected={() => {
                    const id = activeCaseId
                    if (!id) return
                    const found = shopCases.find((c) => c.id === id)
                    if (!found) return
                    runShopTestCase(found)
                  }}
                  onRunAll={() => {
                    shopCases.forEach((testCase) => runShopTestCase(testCase))
                    if (shopCases.length) setToast('Ran all scenarios')
                  }}
                />
              </>
            )}
          </Section>

          <Section
            title="Run Log"
            hint="Last execution"
            open={openRunLog}
            onToggle={() => setOpenRunLog((v) => !v)}
          >
            <div className="runLog">
              {runLog.length ? (
                runLog.map((e, idx) => (
                  <div
                    key={`${e.nodeId}-${idx}`}
                    className={`logRow ${e.ok ? 'logOk' : 'logBad'}`}
                  >
                    <div className="logTitle">{e.nodeTitle}</div>
                    <div className="logMsg">{e.message}</div>
                  </div>
                ))
              ) : (
                <div className="sideEmpty">
                  {isBlankWorkflow
                    ? 'New rule: build a flow, then click “Run”.'
                    : 'Click “Run” to execute the flow.'}
                </div>
              )}
            </div>
          </Section>
        </aside>

        <div className="canvasWrap" ref={wrapperRef}>
          <ReactFlow
            nodes={nodes}
            edges={displayEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={(instance) => {
              setRfInstance(instance)
              window.setTimeout(() => {
                if (nodes.length) instance.fitView({ padding: 0.15 })
                else instance.setViewport({ x: 0, y: 0, zoom: 1 })
              }, 0)
            }}
            onSelectionChange={onSelectionChange}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdgeId(null)}
            connectionLineType={ConnectionLineType.SmoothStep}
            snapToGrid
            snapGrid={[12, 12]}
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1.25}
              color="rgba(17, 24, 39, 0.18)"
            />
            <MiniMap
              pannable
              zoomable
              nodeColor={(n) => {
                const data = n.data as { kind?: string } | undefined
                const kind = data?.kind
                if (kind === 'start') return 'rgba(37, 99, 235, 0.9)'
                if (kind === 'condition') return 'rgba(245, 158, 11, 0.9)'
                if (kind === 'end') return 'rgba(239, 68, 68, 0.9)'
                return 'rgba(124, 58, 237, 0.9)'
              }}
              className="miniMap"
            />
            <Controls className="flowControls" />
            <Panel position="bottom-right" className="boardHint">
              Pan: drag canvas · Zoom: trackpad/mousewheel · Connect: drag a handle
            </Panel>
          </ReactFlow>

          {toast ? <div className="toast">{toast}</div> : null}
        </div>
      </div>
    </div>
  )
}

function ShopStateEditor({
  ruleType,
  value,
  onChange,
}: {
  ruleType: import('../rules/types').RuleType
  value: ShopState
  onChange: (next: ShopState) => void
}) {
  const items = Object.values(value.items).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="configCard">
      <div className="configTitle">Scenario State</div>
      {items.length ? (
        <div className="stocks">
          {items.map((item) => (
            <div key={item.name} className="stockRow">
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
        <div className="sideEmpty">No stock items yet.</div>
      )}

      {ruleType === 'order' ? (
        <>
          <div className="sideDivider" />
          <div className="configTitle">Order State</div>
          <label className="formLabel">
            Order ID
            <input
              className="formInput"
              value={value.order.orderId}
              onChange={(e) => onChange({ ...value, order: { ...value.order, orderId: e.target.value } })}
              spellCheck={false}
            />
          </label>
          <label className="formLabel">
            Customer name
            <input
              className="formInput"
              value={value.order.customerName}
              onChange={(e) => onChange({ ...value, order: { ...value.order, customerName: e.target.value } })}
              spellCheck={false}
            />
          </label>
          <label className="formLabel">
            Item name
            <input
              className="formInput"
              value={value.order.itemName}
              onChange={(e) => onChange({ ...value, order: { ...value.order, itemName: e.target.value } })}
              spellCheck={false}
            />
          </label>
          <label className="formLabel">
            Quantity
            <input
              className="formInput"
              type="number"
              value={value.order.quantity}
              onChange={(e) => onChange({ ...value, order: { ...value.order, quantity: Number(e.target.value) } })}
            />
          </label>
          <label className="formLabel">
            Priority
            <select
              className="formSelect"
              value={value.order.priority}
              onChange={(e) =>
                onChange({ ...value, order: { ...value.order, priority: e.target.value as ShopState['order']['priority'] } })
              }
            >
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
          </label>
          <label className="formLabel">
            Shift
            <select
              className="formSelect"
              value={value.order.assignedShift}
              onChange={(e) =>
                onChange({ ...value, order: { ...value.order, assignedShift: e.target.value as ShopState['order']['assignedShift'] } })
              }
            >
              <option value="unassigned">Unassigned</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </label>
          <div className="skillGrid">
            <label className="skillPill">
              <input
                type="checkbox"
                checked={value.order.created}
                onChange={(e) => onChange({ ...value, order: { ...value.order, created: e.target.checked } })}
              />
              Triggered
            </label>
            <label className="skillPill">
              <input
                type="checkbox"
                checked={value.order.paymentConfirmed}
                onChange={(e) => onChange({ ...value, order: { ...value.order, paymentConfirmed: e.target.checked } })}
              />
              Payment confirmed
            </label>
            <label className="skillPill">
              <input
                type="checkbox"
                checked={value.order.packed}
                onChange={(e) => onChange({ ...value, order: { ...value.order, packed: e.target.checked } })}
              />
              Packed
            </label>
            <label className="skillPill">
              <input
                type="checkbox"
                checked={value.order.dispatched}
                onChange={(e) => onChange({ ...value, order: { ...value.order, dispatched: e.target.checked } })}
              />
              Dispatched
            </label>
          </div>
        </>
      ) : null}

      <div className="createFnActions">
        <button
          className="btn"
          type="button"
          onClick={() => {
            const base = ruleType === 'order' ? 'Order Item' : 'New Sweet'
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
          {ruleType === 'order' ? 'Add order item' : 'Add stock item'}
        </button>
      </div>
    </div>
  )
}

function ShopTestLab({
  cases,
  activeCaseId,
  results,
  isolated,
  onToggleIsolated,
  onSelect,
  onAdd,
  onSaveSelected,
  onRename,
  onDelete,
  onRunSelected,
  onRunAll,
}: {
  cases: ShopTestCase[]
  activeCaseId: string | null
  results: Record<string, { ok: boolean; outcome?: 'pass' | 'fail'; log: RunLogEntry[]; ranAt: string }>
  isolated: boolean
  onToggleIsolated: () => void
  onSelect: (id: string) => void
  onAdd: () => void
  onSaveSelected: (id: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onRunSelected: () => void
  onRunAll: () => void
}) {
  const active = activeCaseId ? cases.find((c) => c.id === activeCaseId) ?? null : null
  const activeRes = activeCaseId ? results[activeCaseId] : undefined
  const passCount = Object.values(results).filter((entry) => entry.ok).length
  const failCount = Object.values(results).filter((entry) => !entry.ok).length

  return (
    <div className="testLab">
      <div className="testLabTop">
        <div>
          <div className="configTitle">Scenario Lab</div>
          <div className="sideHint">
            Create rule-specific test cases, run them, and review logic gates.
          </div>
        </div>
        <button className="btn" type="button" onClick={onAdd}>
          Add scenario
        </button>
      </div>

      <div className="sideRow">
        <div className="sideKey">Mode</div>
        <button className="chip" type="button" onClick={onToggleIsolated}>
          {isolated ? 'Isolated runs' : 'Record to metrics'}
        </button>
      </div>

      <div className="sideRow">
        <div className="sideKey">Passed</div>
        <div className="sideValue">{passCount}</div>
      </div>
      <div className="sideRow">
        <div className="sideKey">Failed</div>
        <div className="sideValue">{failCount}</div>
      </div>

      <div className="testActions">
        <button className="btn btnPrimary" type="button" onClick={onRunSelected} disabled={!activeCaseId}>
          Run selected
        </button>
        <button className="btn" type="button" onClick={onRunAll} disabled={!cases.length}>
          Run all
        </button>
        <button className="btn" type="button" onClick={() => activeCaseId && onSaveSelected(activeCaseId)} disabled={!activeCaseId}>
          Save state
        </button>
      </div>

      <div className="caseList">
        {cases.map((testCase) => {
          const result = results[testCase.id]
          const selected = testCase.id === activeCaseId
          const gateFails = (result?.log ?? []).filter((entry) => entry.kind === 'condition' && entry.conditionValue === false).length
          return (
            <div key={testCase.id} className={`caseItem ${selected ? 'caseItemSelected' : ''}`}>
              <div className="caseMain">
                <input
                  className="formInput"
                  value={testCase.name}
                  onChange={(e) => onRename(testCase.id, e.target.value)}
                  onFocus={() => onSelect(testCase.id)}
                  spellCheck={false}
                />
                <div className="caseMeta">
                  {result ? (result.ok ? 'PASS' : 'FAIL') : 'Not run'}
                  {result ? ` · gates failed: ${gateFails}` : ''}
                </div>
              </div>
              <button className="caseDelete" type="button" onClick={() => onDelete(testCase.id)} title="Delete scenario">
                ×
              </button>
            </div>
          )
        })}
        {!cases.length ? <div className="sideEmpty">No scenarios yet.</div> : null}
      </div>

      {active && activeRes ? (
        <div className="gateCard">
          <div className="configTitle">Logic Gates</div>
          <div className="sideHint">
            Condition results for: <strong>{active.name}</strong>
          </div>
          <div className="gateList">
            {activeRes.log
              .filter((entry) => entry.kind === 'condition')
              .map((entry, idx) => (
                <div key={`${entry.nodeId}-${idx}`} className="gateRow">
                  <div className="gateName">{entry.nodeTitle}</div>
                  <div className={`gateVal ${entry.conditionValue ? 'gatePass' : 'gateFail'}`}>
                    {entry.conditionValue ? 'PASS' : 'FAIL'}
                  </div>
                </div>
              ))}
            {!activeRes.log.some((entry) => entry.kind === 'condition') ? (
              <div className="sideEmpty">No condition gates in this flow yet.</div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function EligibilityTestLab({
  cases,
  activeCaseId,
  results,
  isolated,
  onToggleIsolated,
  onSelect,
  onAdd,
  onDelete,
  onRunSelected,
  onRunAll,
}: {
  cases: EligibilityTestCase[]
  activeCaseId: string | null
  results: Record<string, { ok: boolean; outcome?: 'pass' | 'fail'; log: RunLogEntry[]; ranAt: string }>
  isolated: boolean
  onToggleIsolated: () => void
  onSelect: (id: string) => void
  onAdd: () => void
  onDelete: (id: string) => void
  onRunSelected: () => void
  onRunAll: () => void
}) {
  const totals = cases.reduce(
    (acc, c) => {
      const r = results[c.id]
      if (!r) return acc
      if (r.outcome === 'pass') acc.pass += 1
      if (r.outcome === 'fail') acc.fail += 1
      return acc
    },
    { pass: 0, fail: 0 },
  )

  const active = activeCaseId ? cases.find((c) => c.id === activeCaseId) ?? null : null
  const activeRes = activeCaseId ? results[activeCaseId] : undefined

  return (
    <div className="testLab">
      <div className="testLabTop">
        <div>
          <div className="configTitle">Test Lab (Isolated)</div>
          <div className="sideHint">
            Run candidate test cases and see PASS/FAIL + condition gates.
          </div>
        </div>
        <button className="btn" type="button" onClick={onAdd}>
          Add test
        </button>
      </div>

      <div className="sideRow">
        <div className="sideKey">Mode</div>
        <button className="btn" type="button" onClick={onToggleIsolated}>
          {isolated ? 'Isolated (no metrics)' : 'Record to charts'}
        </button>
      </div>

      <div className="sideRow">
        <div className="sideKey">Summary</div>
        <div className="sideValue">
          Pass {totals.pass} · Fail {totals.fail}
        </div>
      </div>

      <div className="testActions">
        <button className="btn btnPrimary" type="button" onClick={onRunSelected} disabled={!activeCaseId}>
          Run selected
        </button>
        <button className="btn" type="button" onClick={onRunAll} disabled={!cases.length}>
          Run all
        </button>
      </div>

      <div className="caseList">
        {cases.map((c) => {
          const r = results[c.id]
          const selected = c.id === activeCaseId
          const outcome = r?.outcome
          const gateFails = (r?.log ?? []).filter((e) => e.kind === 'condition' && e.conditionValue === false).length
          return (
            <div key={c.id} className={`caseItem ${selected ? 'caseItemSelected' : ''}`}>
              <button className="caseMain" type="button" onClick={() => onSelect(c.id)}>
                <div className="caseName">{c.name}</div>
                <div className="caseMeta">
                  {outcome ? (outcome === 'pass' ? 'PASS' : 'FAIL') : 'Not run'}
                  {r ? ` · gates failed: ${gateFails}` : ''}
                  {c.expected ? ` · expected: ${c.expected.toUpperCase()}` : ''}
                </div>
              </button>
              <button className="caseDelete" type="button" onClick={() => onDelete(c.id)} title="Delete test">
                ✕
              </button>
            </div>
          )
        })}
        {!cases.length ? <div className="sideEmpty">No test cases.</div> : null}
      </div>

      {active && activeRes ? (
        <div className="gateCard">
          <div className="configTitle">Logic Gates</div>
          <div className="sideHint">
            Conditions evaluated for: <strong>{active.name}</strong>
          </div>
          <div className="gateList">
            {activeRes.log
              .filter((e) => e.kind === 'condition')
              .map((e, idx) => (
                <div key={`${e.nodeId}-${idx}`} className="gateRow">
                  <div className="gateName">{e.nodeTitle}</div>
                  <div className={`gateVal ${e.conditionValue ? 'gatePass' : 'gateFail'}`}>
                    {e.conditionValue ? 'PASS' : 'FAIL'}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PaletteItem({ id, label, icon }: { id: string; label: string; icon: string }) {
  return (
    <div
      className="paletteItem"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('application/reactflow', id)
        event.dataTransfer.effectAllowed = 'move'
      }}
      role="button"
      tabIndex={0}
      title="Drag to canvas"
    >
      <div className="paletteIcon" aria-hidden="true">
        {icon}
      </div>
      <div className="paletteLabel">{label}</div>
    </div>
  )
}

function Section({
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  title: string
  hint?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="sideSection">
      <button className="sectionHeader" onClick={onToggle} type="button">
        <div>
          <div className="sideTitle">{title}</div>
          {hint ? <div className="sideHint">{hint}</div> : null}
        </div>
        <div className={`sectionChevron ${open ? 'sectionChevronOpen' : ''}`} aria-hidden="true">
          ▾
        </div>
      </button>
      {open ? <div className="sectionBody">{children}</div> : null}
    </div>
  )
}

function CanvasNodesList({
  nodes,
  selectedNodeId,
  onSelect,
  onDelete,
}: {
  nodes: WorkflowNode[]
  selectedNodeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}) {
  if (!nodes.length) {
    return <div className="sideEmpty">No nodes yet. Drag one onto the canvas.</div>
  }

  const sorted = nodes.slice().sort((a, b) => a.position.y - b.position.y)

  return (
    <div className="canvasNodeList">
      <div className="listTitle">On Canvas</div>
      {sorted.map((n) => {
        const data = n.data as WorkflowNodeData
        const selected = n.id === selectedNodeId
        return (
          <div key={n.id} className={`canvasNodeItem ${selected ? 'canvasNodeItemSelected' : ''}`}>
            <button
              className="canvasNodeMain"
              type="button"
              onClick={() => onSelect(n.id)}
              title="Select node"
            >
              <span className="canvasNodeIcon" aria-hidden="true">
                {data.icon ?? '•'}
              </span>
              <span className="canvasNodeText">
                <span className="canvasNodeName">{data.title}</span>
                <span className="canvasNodeKind">{data.kind}</span>
              </span>
            </button>
            <button
              className="canvasNodeDelete"
              type="button"
              onClick={() => onDelete(n.id)}
              title="Delete node"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}

function Inspector({
  node,
  onChange,
  onDelete,
  functions,
  shop,
  candidate,
  ruleType,
  tab,
  onTabChange,
  nodeTestCases,
  nodeTestResults,
  onCreateNodeTestCase,
  onRunNodeTestCase,
}: {
  node: WorkflowNode | null
  onChange: (updater: (prev: WorkflowNodeData) => WorkflowNodeData) => void
  onDelete: () => void
  functions: FunctionDef[]
  shop: ShopState
  candidate: CandidateProfile
  ruleType: import('../rules/types').RuleType
  tab: 'edit' | 'dashboard'
  onTabChange: (t: 'edit' | 'dashboard') => void
  nodeTestCases: NodeLinkedTestCaseSummary[]
  nodeTestResults: Record<string, { ok: boolean; outcome?: 'pass' | 'fail'; log: RunLogEntry[]; ranAt: string }>
  onCreateNodeTestCase: () => void
  onRunNodeTestCase: (testCaseId: string) => void
}) {
  if (!node) return null
  const data = node.data as WorkflowNodeData
  const selectedFn = data.config?.functionId
    ? functions.find((f) => f.id === data.config?.functionId) ?? null
    : null

  return (
    <div className="inspector">
      <div className="sideRow">
        <div className="sideKey">Selected</div>
        <div className="sideValue">{node.id.slice(0, 8)}</div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === 'edit' ? 'tabActive' : ''}`}
          onClick={() => onTabChange('edit')}
        >
          Edit
        </button>
        <button
          type="button"
          className={`tab ${tab === 'dashboard' ? 'tabActive' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          Dashboard
        </button>
      </div>

      {tab === 'edit' ? (
        <>
          <div className="form">
            <label className="formLabel">
              Title
              <input
                className="formInput"
                value={data.title}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, title: e.target.value }))
                }
                spellCheck={false}
              />
            </label>

            <label className="formLabel">
              Icon (emoji)
              <input
                className="formInput"
                value={data.icon ?? ''}
                placeholder="e.g. A"
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    icon: e.target.value.length ? e.target.value : undefined,
                  }))
                }
                spellCheck={false}
              />
            </label>

            {data.kind === 'action' || data.kind === 'condition' ? (
              <label className="formLabel">
                Kind
                <select
                  className="formSelect"
                  value={data.kind}
                  onChange={(e) => {
                    const nextKind = e.target.value as 'action' | 'condition'
                    const nextFn =
                      functions.find((f) => f.kind === (nextKind === 'action' ? 'action' : 'condition')) ??
                      null
                    onChange((prev) => ({
                      ...prev,
                      kind: nextKind,
                      config: nextFn
                        ? { functionId: nextFn.id, params: prev.config?.params ?? {} }
                        : prev.config ?? null,
                    }))
                  }}
                >
                  <option value="action">Action</option>
                  <option value="condition">Condition</option>
                </select>
              </label>
            ) : (
              <div className="formLabel">
                Kind
                <div className="typePill">{data.kind}</div>
              </div>
            )}

            {data.kind === 'action' || data.kind === 'condition' ? (
              <FunctionPicker
                kind={data.kind === 'action' ? 'action' : 'condition'}
                functions={functions}
                value={data.config?.functionId ?? ''}
                onChange={(functionId) =>
                  onChange((prev) => ({
                    ...prev,
                    config: { functionId, params: prev.config?.params ?? {} },
                  }))
                }
              />
            ) : null}

            {selectedFn ? (
              <ParamsEditor
                params={selectedFn.params}
                value={(data.config?.params ?? {}) as Record<string, unknown>}
                onChange={(next) =>
                  onChange((prev) => ({
                    ...prev,
                    config: prev.config
                      ? { ...prev.config, params: next }
                      : prev.config,
                  }))
                }
              />
            ) : null}
          </div>

          <button className="btn btnDanger" onClick={onDelete}>
            Delete node
          </button>
        </>
      ) : (
        <>
          {ruleType === 'eligibility' ? (
            <EligibilityNodeDashboard node={node} fn={selectedFn} candidate={candidate} />
          ) : (
            <NodeDashboard node={node} fn={selectedFn} shop={shop} ruleType={ruleType} />
          )}
          {(data.kind === 'action' || data.kind === 'condition') ? (
            <NodeTestAccess
              cases={nodeTestCases}
              results={nodeTestResults}
              onCreate={onCreateNodeTestCase}
              onRun={onRunNodeTestCase}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

function NodeTestAccess({
  cases,
  results,
  onCreate,
  onRun,
}: {
  cases: NodeLinkedTestCaseSummary[]
  results: Record<string, { ok: boolean; outcome?: 'pass' | 'fail'; log: RunLogEntry[]; ranAt: string }>
  onCreate: () => void
  onRun: (testCaseId: string) => void
}) {
  return (
    <div className="configCard" style={{ marginTop: 14 }}>
      <div className="testLabTop">
        <div>
          <div className="configTitle">Node Test Access</div>
          <div className="sideHint">
            Create and run functional test cases for this node directly from the inspector.
          </div>
        </div>
        <button className="btn" type="button" onClick={onCreate}>
          Add test case
        </button>
      </div>

      {cases.length ? (
        <div className="caseList">
          {cases.map((testCase) => {
            const result = results[testCase.id]
            const gateFails = (result?.log ?? []).filter((entry) => entry.kind === 'condition' && entry.conditionValue === false).length
            return (
              <div key={testCase.id} className="caseItem">
                <div className="caseMain">
                  <div className="caseName">{testCase.name}</div>
                  <div className="caseMeta">
                    {result
                      ? result.outcome
                        ? result.outcome.toUpperCase()
                        : result.ok
                          ? 'PASS'
                          : 'FAIL'
                      : 'Not run'}
                    {testCase.expected ? ` · expected: ${testCase.expected.toUpperCase()}` : ''}
                    {result ? ` · gates failed: ${gateFails}` : ''}
                  </div>
                </div>
                <button className="btn btnPrimary" type="button" onClick={() => onRun(testCase.id)}>
                  Run
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="sideEmpty">No node-level test cases yet.</div>
      )}
    </div>
  )
}

function EligibilityNodeDashboard({
  node,
  fn,
  candidate,
}: {
  node: WorkflowNode
  fn: FunctionDef | null
  candidate: CandidateProfile
}) {
  const data = node.data as WorkflowNodeData
  if (data.kind !== 'condition') return null
  if (!fn || !data.config) {
    return (
      <div className="nodeDash">
        <div className="configTitle">Node Dashboard</div>
        <div className="sideEmpty">Pick a function to see evaluation details.</div>
      </div>
    )
  }

  const params = (data.config.params ?? {}) as Record<string, unknown>
  const res = evaluateEligibilityCondition(candidate, fn, params)

  const score = res.value ? 100 : 20

  return (
    <div className="nodeDash">
      <div className="configTitle">Node Dashboard</div>
      <div className="dashCards">
        <div className="dashCard">
          <div className="dashCardKey">Function</div>
          <div className="dashCardVal">{fn.name}</div>
          <div className="dashCardSub">{fn.description ?? fn.operationName ?? fn.operation}</div>
        </div>
        <div className="dashCard">
          <div className="dashCardKey">Result</div>
          <div className="dashCardVal">{res.value ? 'PASS' : 'FAIL'}</div>
          <div className="dashCardSub">{res.message}</div>
        </div>
      </div>

      <CompareBars label="Screening Score" before={score} after={score} />
    </div>
  )
}

function NodeDashboard({
  node,
  fn,
  shop,
  ruleType,
}: {
  node: WorkflowNode
  fn: FunctionDef | null
  shop: ShopState
  ruleType: import('../rules/types').RuleType
}) {
  const data = node.data as WorkflowNodeData
  if (data.kind !== 'action' && data.kind !== 'condition') return null
  if (!fn || !data.config) {
    return (
      <div className="nodeDash">
        <div className="configTitle">Node Dashboard</div>
        <div className="sideEmpty">Pick a function to see charts and details.</div>
      </div>
    )
  }

  const params = (data.config.params ?? {}) as Record<string, unknown>
  const sweetName = typeof params.sweetName === 'string' ? params.sweetName : ''
  const currentQty = sweetName && shop.items[sweetName] ? shop.items[sweetName].quantity : 0

  const preview =
    fn.kind === 'action'
      ? applyAction(shop, fn, params)
      : null

  const afterQty =
    fn.kind === 'action' && sweetName
      ? preview?.next.items[sweetName]?.quantity ?? 0
      : currentQty

  const threshold =
    typeof params.threshold === 'number'
      ? params.threshold
      : typeof params.threshold === 'string'
        ? Number(params.threshold)
        : 0

  const cond =
    fn.kind === 'condition' ? evaluateCondition(shop, fn, params) : null

  if (ruleType === 'order') {
    const orderPreview =
      fn.kind === 'action'
        ? applyAction(shop, fn, params)
        : null
    const orderCheck =
      fn.kind === 'condition'
        ? evaluateCondition(shop, fn, params)
        : null

    return (
      <div className="nodeDash">
        <div className="configTitle">Node Dashboard</div>
        <div className="dashCards">
          <div className="dashCard">
            <div className="dashCardKey">Function</div>
            <div className="dashCardVal">{fn.name}</div>
            <div className="dashCardSub">{fn.description ?? fn.operationName ?? fn.operation}</div>
          </div>
          <div className="dashCard">
            <div className="dashCardKey">Order</div>
            <div className="dashCardVal">{shop.order.orderId}</div>
            <div className="dashCardSub">
              {shop.order.itemName} × {shop.order.quantity} · {shop.order.priority}
            </div>
          </div>
          <div className="dashCard">
            <div className="dashCardKey">{fn.kind === 'condition' ? 'Condition' : 'Preview'}</div>
            <div className="dashCardVal">
              {fn.kind === 'condition'
                ? orderCheck?.value ? 'TRUE' : 'FALSE'
                : shop.order.status}
            </div>
            <div className="dashCardSub">
              {fn.kind === 'condition' ? orderCheck?.message : orderPreview?.message}
            </div>
          </div>
        </div>

        <div className="chart">
          <div className="chartTitle">Order State</div>
          <div className="gateList">
            <div className="gateRow"><div className="gateName">Triggered</div><div className={`gateVal ${shop.order.created ? 'gatePass' : 'gateFail'}`}>{shop.order.created ? 'YES' : 'NO'}</div></div>
            <div className="gateRow"><div className="gateName">Payment</div><div className={`gateVal ${shop.order.paymentConfirmed ? 'gatePass' : 'gateFail'}`}>{shop.order.paymentConfirmed ? 'CONFIRMED' : 'PENDING'}</div></div>
            <div className="gateRow"><div className="gateName">Shift</div><div className="gateVal gatePass">{shop.order.assignedShift.toUpperCase()}</div></div>
            <div className="gateRow"><div className="gateName">Status</div><div className="gateVal gatePass">{shop.order.status}</div></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="nodeDash">
      <div className="configTitle">Node Dashboard</div>

      <div className="dashCards">
        <div className="dashCard">
          <div className="dashCardKey">Function</div>
          <div className="dashCardVal">
            <span aria-hidden="true">{fn.icon ?? 'Fn'}</span> {fn.name}
          </div>
          <div className="dashCardSub">
            {fn.description ?? fn.operationName ?? fn.operation}
          </div>
        </div>
        <div className="dashCard">
          <div className="dashCardKey">Target</div>
          <div className="dashCardVal">{sweetName || '-'}</div>
          <div className="dashCardSub">
            Current stock: <strong>{currentQty}</strong>
          </div>
        </div>
        {fn.kind === 'condition' ? (
          <div className="dashCard">
            <div className="dashCardKey">Condition</div>
            <div className="dashCardVal">
              Threshold <strong>{threshold}</strong>
            </div>
            <div className="dashCardSub">
              Result: <strong>{cond?.value ? 'TRUE' : 'FALSE'}</strong>
            </div>
          </div>
        ) : (
          <div className="dashCard">
            <div className="dashCardKey">Preview</div>
            <div className="dashCardVal">
              After: <strong>{afterQty}</strong>
            </div>
            <div className="dashCardSub">{preview?.message ?? '—'}</div>
          </div>
        )}
      </div>

      {sweetName ? (
        fn.kind === 'condition' ? (
          <ThresholdChart
            label="Stock vs Threshold"
            value={currentQty}
            threshold={Number.isFinite(threshold) ? threshold : 0}
          />
        ) : (
          <CompareBars
            label="Stock Impact"
            before={currentQty}
            after={afterQty}
          />
        )
      ) : (
        <div className="sideEmpty">
          Add a <strong>sweetName</strong> parameter to see stock charts.
        </div>
      )}
    </div>
  )
}

function CompareBars({
  label,
  before,
  after,
}: {
  label: string
  before: number
  after: number
}) {
  const max = Math.max(1, before, after)
  const beforePct = Math.round((before / max) * 100)
  const afterPct = Math.round((after / max) * 100)

  return (
    <div className="chart">
      <div className="chartTitle">{label}</div>
      <div className="chartRow">
        <div className="chartLabel">Before</div>
        <div className="chartTrack">
          <div className="chartFill chartFillBefore" style={{ width: `${beforePct}%` }} />
        </div>
        <div className="chartValue">{before}</div>
      </div>
      <div className="chartRow">
        <div className="chartLabel">After</div>
        <div className="chartTrack">
          <div className="chartFill chartFillAfter" style={{ width: `${afterPct}%` }} />
        </div>
        <div className="chartValue">{after}</div>
      </div>
    </div>
  )
}

function ThresholdChart({
  label,
  value,
  threshold,
}: {
  label: string
  value: number
  threshold: number
}) {
  const max = Math.max(1, value, threshold)
  const valuePct = Math.round((value / max) * 100)
  const thresholdPct = Math.round((threshold / max) * 100)
  const ok = value >= threshold

  return (
    <div className="chart">
      <div className="chartTitle">{label}</div>
      <div className="chartRow">
        <div className="chartLabel">Stock</div>
        <div className="chartTrack">
          <div className={`chartFill ${ok ? 'chartFillOk' : 'chartFillBad'}`} style={{ width: `${valuePct}%` }} />
          <div className="chartMarker" style={{ left: `${thresholdPct}%` }} title={`Threshold: ${threshold}`} />
        </div>
        <div className="chartValue">{value}</div>
      </div>
      <div className="chartHint">
        Threshold: <strong>{threshold}</strong>
      </div>
    </div>
  )
}

function cloneShopState(state: ShopState): ShopState {
  return {
    items: Object.fromEntries(
      Object.entries(state.items).map(([name, item]) => [
        name,
        { ...item },
      ]),
    ),
    order: { ...state.order },
  }
}

function createInitialShopState(
  ruleType: import('../rules/types').RuleType,
): ShopState {
  return ruleType === 'sweetshop' || ruleType === 'order'
    ? createDefaultShopState()
    : {
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
      }
}

function CandidatePanel({
  value,
  onChange,
}: {
  value: CandidateProfile
  onChange: (next: CandidateProfile) => void
}) {
  return (
    <div className="configCard">
      <div className="configTitle">Candidate</div>

      <label className="formLabel">
        Stream
        <select
          className="formSelect"
          value={value.stream}
          onChange={(e) =>
            onChange({ ...value, stream: e.target.value as CandidateProfile['stream'] })
          }
        >
          <option value="frontend_react">Frontend (React)</option>
          <option value="fullstack">Full stack</option>
          <option value="backend">Backend</option>
          <option value="data_science">Data Science</option>
          <option value="ai">AI</option>
        </select>
      </label>

      <label className="formLabel">
        Experience
        <select
          className="formSelect"
          value={value.isExperienced ? 'experienced' : 'fresher'}
          onChange={(e) =>
            onChange({ ...value, isExperienced: e.target.value === 'experienced' })
          }
        >
          <option value="experienced">Experienced</option>
          <option value="fresher">Fresher</option>
        </select>
      </label>

      <label className="formLabel">
        Degree
        <select
          className="formSelect"
          value={value.degree}
          onChange={(e) => onChange({ ...value, degree: e.target.value as CandidateProfile['degree'] })}
        >
          <option value="btech">BTech</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="formLabel">
        CGPA
        <input
          className="formInput"
          type="number"
          step="0.1"
          value={value.cgpa}
          onChange={(e) => onChange({ ...value, cgpa: Number(e.target.value) })}
        />
      </label>

      <label className="formLabel">
        Years experience
        <input
          className="formInput"
          type="number"
          value={value.yearsExperience}
          onChange={(e) => onChange({ ...value, yearsExperience: Number(e.target.value) })}
        />
      </label>

      <label className="formLabel">
        React projects
        <input
          className="formInput"
          type="number"
          value={value.reactProjects}
          onChange={(e) => onChange({ ...value, reactProjects: Number(e.target.value) })}
        />
      </label>

      <div className="sideRow">
        <div className="sideKey">Skills</div>
        <div className="sideValue">Toggle</div>
      </div>

      <div className="skillGrid">
        <label className="skillPill">
          <input
            type="checkbox"
            checked={value.skills.development}
            onChange={(e) =>
              onChange({
                ...value,
                skills: { ...value.skills, development: e.target.checked },
              })
            }
          />
          Development
        </label>
        <label className="skillPill">
          <input
            type="checkbox"
            checked={value.skills.fullstack}
            onChange={(e) =>
              onChange({
                ...value,
                skills: { ...value.skills, fullstack: e.target.checked },
              })
            }
          />
          Full stack
        </label>
        <label className="skillPill">
          <input
            type="checkbox"
            checked={value.skills.backend}
            onChange={(e) =>
              onChange({
                ...value,
                skills: { ...value.skills, backend: e.target.checked },
              })
            }
          />
          Backend
        </label>
        <label className="skillPill">
          <input
            type="checkbox"
            checked={value.skills.data_science}
            onChange={(e) =>
              onChange({
                ...value,
                skills: { ...value.skills, data_science: e.target.checked },
              })
            }
          />
          Data Science
        </label>
        <label className="skillPill">
          <input
            type="checkbox"
            checked={value.skills.ai}
            onChange={(e) =>
              onChange({
                ...value,
                skills: { ...value.skills, ai: e.target.checked },
              })
            }
          />
          AI
        </label>
      </div>

      <div className="sideDivider" />
      <label className="formLabel">
        Resume summary
        <textarea
          className="formTextarea"
          value={value.resume.summary}
          onChange={(e) => onChange({ ...value, resume: { ...value.resume, summary: e.target.value } })}
          rows={3}
          spellCheck={false}
        />
      </label>
    </div>
  )
}

function FunctionPicker({
  kind,
  functions,
  value,
  onChange,
}: {
  kind: 'action' | 'condition'
  functions: FunctionDef[]
  value: string
  onChange: (id: string) => void
}) {
  const list = functions.filter((f) => f.kind === kind)
  return (
    <div className="configCard">
      <div className="configTitle">Function</div>
      <label className="formLabel">
        Select
        <select className="formSelect" value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select…</option>
          {list.map((f) => (
            <option key={f.id} value={f.id}>
              {f.icon ? `${f.icon} ` : ''}{f.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

function ParamsEditor({
  params,
  value,
  onChange,
}: {
  params: FunctionParamDef[]
  value: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
}) {
  if (!params.length) return null
  return (
    <div className="configCard">
      <div className="configTitle">Parameters</div>
      {params.map((p) => {
        const v = value[p.key]
        const common = {
          className: p.type === 'boolean' ? 'formSelect' : 'formInput',
        }
        return (
          <label key={p.key} className="formLabel">
            {p.label}
            {p.type === 'string' ? (
              <input
                {...common}
                value={typeof v === 'string' ? v : ''}
                placeholder={p.placeholder}
                onChange={(e) => onChange({ ...value, [p.key]: e.target.value })}
                spellCheck={false}
              />
            ) : null}
            {p.type === 'number' ? (
              <input
                {...common}
                type="number"
                value={typeof v === 'number' ? v : v ? Number(v) : 0}
                onChange={(e) => onChange({ ...value, [p.key]: Number(e.target.value) })}
              />
            ) : null}
            {p.type === 'boolean' ? (
              <select
                className="formSelect"
                value={typeof v === 'boolean' ? String(v) : 'false'}
                onChange={(e) => onChange({ ...value, [p.key]: e.target.value === 'true' })}
              >
                <option value="false">False</option>
                <option value="true">True</option>
              </select>
            ) : null}
          </label>
        )
      })}
    </div>
  )
}

function CreateFunctionForm({
  ruleType,
  onCreate,
}: {
  ruleType: import('../rules/types').RuleType
  onCreate: (fn: Omit<FunctionDef, 'id'>) => void
}) {
  const [open, setOpen] = useState(false)
  const isBlankRule = ruleType === 'blank'
  const isOrderRule = ruleType === 'order'
  const [name, setName] = useState(isBlankRule ? 'My Step' : isOrderRule ? 'Order Function' : 'My Function')
  const [operation, setOperation] = useState<FunctionDef['operation']>(
    isBlankRule ? 'view_stocks' : isOrderRule ? 'confirm_payment' : 'add_stock',
  )
  const [icon, setIcon] = useState('')
  const [kind, setKind] = useState<'action' | 'condition'>('action')
  const [operationName, setOperationName] = useState(
    isBlankRule ? 'custom_step_logic' : isOrderRule ? 'order_logic' : 'my_operation',
  )

  const params = useMemo<FunctionParamDef[]>(() => {
    if (operation === 'view_stocks') return []
    if (operation === 'confirm_payment' || operation === 'pack_order' || operation === 'dispatch_order' || operation === 'order_is_created' || operation === 'payment_is_confirmed' || operation === 'order_is_packed')
      return []
    if (operation === 'delete_sweet') return [{ key: 'sweetName', label: 'Sweet name', type: 'string', required: true }]
    if (operation === 'buy_sweet' || operation === 'add_stock')
      return [
        { key: 'sweetName', label: 'Sweet name', type: 'string', required: true },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true },
      ]
    if (operation === 'create_order')
      return [
        { key: 'itemName', label: 'Item name', type: 'string', required: true, placeholder: 'Gulab Jamun' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '4' },
        { key: 'customerName', label: 'Customer', type: 'string', required: true, placeholder: 'Priya' },
        { key: 'priority', label: 'Priority', type: 'string', required: true, placeholder: 'express' },
      ]
    if (operation === 'assign_shift' || operation === 'shift_is')
      return [{ key: 'shift', label: 'Shift', type: 'string', required: true, placeholder: 'morning' }]
    if (operation === 'reserve_stock' || operation === 'order_stock_available')
      return [
        { key: 'itemName', label: 'Item name', type: 'string', required: true, placeholder: 'Gulab Jamun' },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '4' },
      ]
    if (operation === 'update_order_status')
      return [{ key: 'status', label: 'Status', type: 'string', required: true, placeholder: 'on_hold' }]
    if (operation === 'order_priority_is')
      return [{ key: 'priority', label: 'Priority', type: 'string', required: true, placeholder: 'express' }]
    if (operation === 'stock_below' || operation === 'stock_above_or_equal')
      return [
        { key: 'sweetName', label: 'Sweet name', type: 'string', required: true },
        { key: 'threshold', label: 'Threshold', type: 'number', required: true },
      ]
    return []
  }, [operation])

  const allowedOps = useMemo(() => {
    const actions: FunctionDef['operation'][] = [
      'buy_sweet',
      'add_stock',
      'delete_sweet',
      'view_stocks',
    ]
    const orderActions: FunctionDef['operation'][] = [
      'create_order',
      'confirm_payment',
      'assign_shift',
      'reserve_stock',
      'pack_order',
      'dispatch_order',
      'update_order_status',
    ]
    const conditions: FunctionDef['operation'][] = [
      'stock_below',
      'stock_above_or_equal',
    ]
    const orderConditions: FunctionDef['operation'][] = [
      'order_is_created',
      'payment_is_confirmed',
      'order_stock_available',
      'shift_is',
      'order_is_packed',
      'order_priority_is',
    ]
    if (isOrderRule) return kind === 'action' ? orderActions : orderConditions
    return kind === 'action' ? actions : conditions
  }, [isOrderRule, kind])

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        {isBlankRule ? '+ Create node logic' : '+ Create user function'}
      </button>
    )
  }

  return (
    <div className="createFn">
      <div className="configTitle">
        {isBlankRule ? 'Create Node Logic' : 'Create User Function'}
      </div>
      <label className="formLabel">
        Name
        <input className="formInput" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="formLabel">
        Icon (optional)
        <input className="formInput" value={icon} onChange={(e) => setIcon(e.target.value)} />
      </label>
      <label className="formLabel">
        Kind
        <select
          className="formSelect"
          value={kind}
          onChange={(e) => {
            const nextKind = e.target.value as 'action' | 'condition'
            setKind(nextKind)
              const nextOps =
                isOrderRule
                  ? nextKind === 'action'
                    ? (['create_order', 'confirm_payment', 'assign_shift', 'reserve_stock', 'pack_order', 'dispatch_order', 'update_order_status'] as const)
                    : (['order_is_created', 'payment_is_confirmed', 'order_stock_available', 'shift_is', 'order_is_packed', 'order_priority_is'] as const)
                  : nextKind === 'action'
                ? (['buy_sweet', 'add_stock', 'delete_sweet', 'view_stocks'] as const)
                : (['stock_below', 'stock_above_or_equal'] as const)
            setOperation(nextOps[0])
            setOperationName((prev) => (prev.trim().length ? prev : nextOps[0]))
          }}
        >
          <option value="action">Action</option>
          <option value="condition">Condition</option>
        </select>
      </label>
      <label className="formLabel">
        {isBlankRule ? 'Behavior Template' : 'Behavior (Operation)'}
        <select
          className="formSelect"
          value={operation}
          onChange={(e) => {
            const nextOp = e.target.value as FunctionDef['operation']
            setOperation(nextOp)
            setOperationName((prev) => (prev.trim().length ? prev : nextOp))
          }}
        >
          {allowedOps.includes('buy_sweet') ? (
            <option value="buy_sweet">
              {isBlankRule ? 'Decrease item quantity' : 'Buy Sweet'}
            </option>
          ) : null}
          {allowedOps.includes('add_stock') ? (
            <option value="add_stock">
              {isBlankRule ? 'Increase item quantity' : 'Add Stock'}
            </option>
          ) : null}
          {allowedOps.includes('delete_sweet') ? (
            <option value="delete_sweet">
              {isBlankRule ? 'Remove item from state' : 'Delete Sweet'}
            </option>
          ) : null}
          {allowedOps.includes('view_stocks') ? (
            <option value="view_stocks">
              {isBlankRule ? 'Read current state' : 'View Stocks'}
            </option>
          ) : null}
          {allowedOps.includes('create_order') ? <option value="create_order">Create Order</option> : null}
          {allowedOps.includes('confirm_payment') ? <option value="confirm_payment">Confirm Payment</option> : null}
          {allowedOps.includes('assign_shift') ? <option value="assign_shift">Assign Shift</option> : null}
          {allowedOps.includes('reserve_stock') ? <option value="reserve_stock">Reserve Stock</option> : null}
          {allowedOps.includes('pack_order') ? <option value="pack_order">Pack Order</option> : null}
          {allowedOps.includes('dispatch_order') ? <option value="dispatch_order">Dispatch Order</option> : null}
          {allowedOps.includes('update_order_status') ? <option value="update_order_status">Update Order Status</option> : null}
          {allowedOps.includes('stock_below') ? (
            <option value="stock_below">
              {isBlankRule ? 'Gate: value below threshold' : 'Stock Below'}
            </option>
          ) : null}
          {allowedOps.includes('stock_above_or_equal') ? (
            <option value="stock_above_or_equal">
              {isBlankRule ? 'Gate: value above/equal threshold' : 'Stock Above/Equal'}
            </option>
          ) : null}
          {allowedOps.includes('order_is_created') ? <option value="order_is_created">Trigger: Order Created</option> : null}
          {allowedOps.includes('payment_is_confirmed') ? <option value="payment_is_confirmed">Payment Confirmed?</option> : null}
          {allowedOps.includes('order_stock_available') ? <option value="order_stock_available">Order Stock Available?</option> : null}
          {allowedOps.includes('shift_is') ? <option value="shift_is">Shift Assigned?</option> : null}
          {allowedOps.includes('order_is_packed') ? <option value="order_is_packed">Order Packed?</option> : null}
          {allowedOps.includes('order_priority_is') ? <option value="order_priority_is">Order Priority Is</option> : null}
        </select>
      </label>
      <label className="formLabel">
        {isBlankRule ? 'Logic key' : 'Operation name (your label)'}
        <input
          className="formInput"
          value={operationName}
          onChange={(e) => setOperationName(e.target.value)}
          placeholder={isBlankRule ? 'e.g. finance_gate_check' : 'e.g. weekend_bulk_buy'}
          spellCheck={false}
        />
      </label>
      {isBlankRule ? (
        <div className="sideHint">
          Blank rules use neutral templates so you can define your own node logic without the Sweet Shop naming.
        </div>
      ) : null}
      <div className="sideRow">
        <div className="sideKey">Kind</div>
        <div className="sideValue">{kind}</div>
      </div>
      <div className="createFnActions">
        <button
          className="btn btnPrimary"
          onClick={() => {
            onCreate({
              kind,
              name: name.trim() || 'User Function',
              icon: icon.trim() || undefined,
              operation,
              operationName: operationName.trim() || operation,
              params,
            })
            setOpen(false)
          }}
        >
          Save
        </button>
        <button className="btn" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  )
}
