import type { FunctionDef } from '../functions/types'
import type { WorkflowEdge, WorkflowNode, WorkflowNodeData, WorkflowState } from './types'

export type RunLogEntry = {
  nodeId: string
  nodeTitle: string
  kind: WorkflowNodeData['kind']
  message: string
  ok: boolean
  conditionValue?: boolean
}

export type RunResult = {
  ok: boolean
  log: RunLogEntry[]
  finalContext: unknown
  outcome?: 'pass' | 'fail'
}

function outgoingEdges(edges: WorkflowEdge[], nodeId: string) {
  return edges.filter((e) => e.source === nodeId)
}

function byId(nodes: WorkflowNode[]) {
  const map = new Map<string, WorkflowNode>()
  nodes.forEach((n) => map.set(n.id, n))
  return map
}

export function runWorkflow(args: {
  workflow: WorkflowState
  functions: FunctionDef[]
  initialContext: unknown
  engine: {
    applyAction: (
      ctx: unknown,
      fn: FunctionDef,
      params: Record<string, unknown> | undefined,
    ) => { ok: boolean; message: string; next: unknown }
    evaluateCondition: (
      ctx: unknown,
      fn: FunctionDef,
      params: Record<string, unknown> | undefined,
    ) => { ok: boolean; message: string; value: boolean }
  }
  maxSteps?: number
}): RunResult {
  const { workflow, functions, initialContext, engine } = args
  const maxSteps = args.maxSteps ?? 50
  const fnMap = new Map(functions.map((f) => [f.id, f]))
  const nodeMap = byId(workflow.nodes)

  const start = workflow.nodes.find((n) => (n.data as WorkflowNodeData).kind === 'start')
  const log: RunLogEntry[] = []
  let ctx: unknown = initialContext

  if (!start) {
    return {
      ok: false,
      log: [
        {
          nodeId: 'none',
          nodeTitle: 'Start',
          kind: 'start',
          ok: false,
          message: 'No Start node',
        },
      ],
      finalContext: ctx,
    }
  }

  let current: WorkflowNode | undefined = start
  let steps = 0

  while (current && steps < maxSteps) {
    steps++
    const data = current.data as WorkflowNodeData

    if (data.kind === 'end') {
      const t = data.title.toLowerCase()
      const outcome: 'pass' | 'fail' | undefined =
        t.includes('pass') || t.includes('complete') || t.includes('success')
          ? 'pass'
          : t.includes('fail') || t.includes('hold') || t.includes('cancel') || t.includes('reject')
            ? 'fail'
            : undefined
      const endOk = outcome !== 'fail'
      log.push({
        nodeId: current.id,
        nodeTitle: data.title,
        kind: data.kind,
        ok: endOk,
        message: 'Reached End',
      })
      return { ok: endOk, log, finalContext: ctx, outcome }
    }

    if (data.kind === 'start') {
      log.push({ nodeId: current.id, nodeTitle: data.title, kind: data.kind, ok: true, message: 'Start' })
      const nextEdge: WorkflowEdge | undefined = outgoingEdges(workflow.edges, current.id)[0]
      current = nextEdge ? nodeMap.get(nextEdge.target) : undefined
      continue
    }

    const cfg = data.config
    const fn = cfg?.functionId ? fnMap.get(cfg.functionId) : undefined
    if (!cfg || !fn) {
      log.push({
        nodeId: current.id,
        nodeTitle: data.title,
        kind: data.kind,
        ok: false,
        message: 'Missing function configuration',
      })
      return { ok: false, log, finalContext: ctx }
    }

    if (data.kind === 'action') {
      const res = engine.applyAction(ctx, fn, cfg.params)
      ctx = res.next
      log.push({
        nodeId: current.id,
        nodeTitle: data.title,
        kind: data.kind,
        ok: res.ok,
        message: `${fn.name}: ${res.message}`,
      })
      const nextEdge: WorkflowEdge | undefined = outgoingEdges(workflow.edges, current.id)[0]
      current = nextEdge ? nodeMap.get(nextEdge.target) : undefined
      continue
    }

    if (data.kind === 'condition') {
      const res = engine.evaluateCondition(ctx, fn, cfg.params)
      log.push({
        nodeId: current.id,
        nodeTitle: data.title,
        kind: data.kind,
        ok: true,
        conditionValue: res.value,
        message: `${fn.name}: ${res.message}`,
      })

      const outs = outgoingEdges(workflow.edges, current.id)
      const edge =
        outs.find((e) => e.sourceHandle === (res.value ? 'true' : 'false')) ??
        outs[0]
      current = edge ? nodeMap.get(edge.target) : undefined
      continue
    }

    log.push({ nodeId: current.id, nodeTitle: data.title, kind: data.kind, ok: false, message: 'Unknown node kind' })
    return { ok: false, log, finalContext: ctx }
  }

  log.push({
    nodeId: current?.id ?? 'none',
    nodeTitle: current ? (current.data as WorkflowNodeData).title : 'none',
    kind: current ? (current.data as WorkflowNodeData).kind : 'action',
    ok: false,
    message: `Stopped (max steps ${maxSteps} reached or no next edge)`,
  })
  return { ok: false, log, finalContext: ctx }
}
